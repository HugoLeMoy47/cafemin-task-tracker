import { describe, it, expect } from 'vitest'
import {
  ESTADOS,
  SIN_ASIGNAR,
  inicioDeSemana,
  resumenPorAsignado,
  resumenPorEstado,
  serieSemanal,
  dias,
  estaVencida,
  metricasGlobales,
  metricasPorPersona,
  tareasRecurrentes,
  cargaPorDimension,
} from './reportes.js'

const tarea = (over = {}) => ({
  estado: 'Pendiente',
  asignado: null,
  fecha_creacion: '2026-09-01T10:00:00.000Z',
  fecha_hecho: null,
  ...over,
})

describe('resumenPorEstado', () => {
  it('cuenta cada estado / counts each state', () => {
    const r = resumenPorEstado([
      tarea({ estado: 'Pendiente' }),
      tarea({ estado: 'Hecho' }),
      tarea({ estado: 'Hecho' }),
    ])
    expect(r).toEqual([
      { estado: 'Pendiente', conteo: 1 },
      { estado: 'En curso', conteo: 0 },
      { estado: 'Hecho', conteo: 2 },
    ])
  })

  it('conserva los tres estados con lista vacía / keeps all three when empty', () => {
    expect(resumenPorEstado([]).map((r) => r.estado)).toEqual(ESTADOS)
    expect(resumenPorEstado([]).every((r) => r.conteo === 0)).toBe(true)
  })

  it('respeta el orden del flujo, no el alfabético / keeps flow order', () => {
    expect(resumenPorEstado([]).map((r) => r.estado)).toEqual(['Pendiente', 'En curso', 'Hecho'])
  })
})

describe('resumenPorAsignado', () => {
  const conNombre = (nombre, estado) =>
    tarea({ estado, asignado: nombre ? { nombre_completo: nombre } : null })

  it('desglosa por estado / breaks down by state', () => {
    const r = resumenPorAsignado([
      conNombre('Ana', 'Pendiente'),
      conNombre('Ana', 'Hecho'),
      conNombre('Ana', 'Hecho'),
    ])
    expect(r[0]).toMatchObject({ nombre: 'Ana', Pendiente: 1, 'En curso': 0, Hecho: 2, total: 3 })
  })

  it('agrupa las tareas sin asignado / groups unassigned tasks', () => {
    const r = resumenPorAsignado([conNombre(null, 'Pendiente'), conNombre(null, 'En curso')])
    expect(r[0].nombre).toBe(SIN_ASIGNAR)
    expect(r[0].total).toBe(2)
  })

  it('ordena por total descendente / sorts by total desc', () => {
    const r = resumenPorAsignado([
      conNombre('Ana', 'Hecho'),
      conNombre('Beto', 'Hecho'),
      conNombre('Beto', 'Hecho'),
    ])
    expect(r.map((x) => x.nombre)).toEqual(['Beto', 'Ana'])
  })

  it('a igualdad de total ordena alfabéticamente / ties break alphabetically', () => {
    const r = resumenPorAsignado([conNombre('Zoe', 'Hecho'), conNombre('Ana', 'Hecho')])
    expect(r.map((x) => x.nombre)).toEqual(['Ana', 'Zoe'])
  })

  it('ignora estados desconocidos en el desglose pero los cuenta en el total', () => {
    const r = resumenPorAsignado([conNombre('Ana', 'Cancelada')])
    expect(r[0].total).toBe(1)
    expect(r[0].Pendiente + r[0]['En curso'] + r[0].Hecho).toBe(0)
  })
})

describe('inicioDeSemana', () => {
  it('un miércoles retrocede al lunes / a Wednesday falls back to Monday', () => {
    // 2026-09-02 es miércoles
    const l = inicioDeSemana(new Date(2026, 8, 2, 15, 30))
    expect(l.getDay()).toBe(1)
    expect(l.getDate()).toBe(31) // lunes 31 de agosto
    expect(l.getHours()).toBe(0)
  })

  it('un lunes se queda en su lugar / a Monday stays put', () => {
    const l = inicioDeSemana(new Date(2026, 7, 31, 23, 59))
    expect(l.getDate()).toBe(31)
    expect(l.getHours()).toBe(0)
  })

  it('un domingo pertenece a la semana que empezó el lunes anterior', () => {
    // 2026-09-06 es domingo → lunes 31 de agosto
    const l = inicioDeSemana(new Date(2026, 8, 6, 12, 0))
    expect(l.getDay()).toBe(1)
    expect(l.getDate()).toBe(31)
  })

  it('devuelve null ante fechas inválidas / returns null on invalid input', () => {
    expect(inicioDeSemana('no-es-fecha')).toBeNull()
  })
})

describe('serieSemanal', () => {
  const REF = new Date(2026, 8, 2, 12, 0) // miércoles 2 sep 2026

  it('emite exactamente el número de semanas pedido / emits the requested weeks', () => {
    expect(serieSemanal([], 10, REF)).toHaveLength(10)
    expect(serieSemanal([], 4, REF)).toHaveLength(4)
  })

  it('incluye las semanas vacías / includes quiet weeks', () => {
    const s = serieSemanal([], 3, REF)
    expect(s.every((c) => c.creadas === 0 && c.cerradas === 0)).toBe(true)
  })

  it('va de la más antigua a la más reciente / runs oldest to newest', () => {
    const s = serieSemanal([], 3, REF)
    expect(s[0].inicio.getTime()).toBeLessThan(s[2].inicio.getTime())
    expect(s[2].inicio.getDate()).toBe(31) // la semana de la referencia
  })

  it('cuenta creadas y cerradas en su semana / buckets creations and closures', () => {
    const s = serieSemanal(
      [
        tarea({ fecha_creacion: new Date(2026, 8, 1).toISOString() }),
        tarea({
          fecha_creacion: new Date(2026, 8, 1).toISOString(),
          fecha_hecho: new Date(2026, 8, 3).toISOString(),
        }),
      ],
      3,
      REF
    )
    const ultima = s[2]
    expect(ultima.creadas).toBe(2)
    expect(ultima.cerradas).toBe(1)
  })

  it('una tarea creada y cerrada en semanas distintas cae en ambas', () => {
    const s = serieSemanal(
      [
        tarea({
          fecha_creacion: new Date(2026, 7, 25).toISOString(), // semana previa
          fecha_hecho: new Date(2026, 8, 2).toISOString(), // semana actual
        }),
      ],
      3,
      REF
    )
    expect(s[1].creadas).toBe(1)
    expect(s[1].cerradas).toBe(0)
    expect(s[2].creadas).toBe(0)
    expect(s[2].cerradas).toBe(1)
  })

  it('ignora lo que cae fuera del rango en vez de apilarlo en el borde', () => {
    const s = serieSemanal(
      [tarea({ fecha_creacion: new Date(2025, 0, 1).toISOString() })],
      3,
      REF
    )
    expect(s.reduce((a, c) => a + c.creadas, 0)).toBe(0)
  })

  it('etiqueta cada semana con día y mes / labels each week', () => {
    const s = serieSemanal([], 2, REF)
    expect(s[1].etiqueta).toBe('31 ago')
  })
})

/* ---------------------------------------------------------------- */
/* Métricas de desempeño                                            */
/* ---------------------------------------------------------------- */

const iso = (d) => new Date(d).toISOString()
const AHORA = new Date(2026, 8, 10, 12, 0)

describe('dias', () => {
  it('mide la diferencia en días / measures the gap in days', () => {
    expect(dias(iso('2026-09-01T00:00:00Z'), iso('2026-09-03T00:00:00Z'))).toBe(2)
    expect(dias(iso('2026-09-01T00:00:00Z'), iso('2026-09-01T12:00:00Z'))).toBe(0.5)
  })

  it('devuelve null si falta un extremo / null when an end is missing', () => {
    expect(dias(null, iso('2026-09-01T00:00:00Z'))).toBeNull()
    expect(dias(iso('2026-09-01T00:00:00Z'), null)).toBeNull()
    expect(dias('no-es-fecha', iso('2026-09-01T00:00:00Z'))).toBeNull()
  })
})

describe('estaVencida', () => {
  it('marca vencida una tarea abierta con límite pasado', () => {
    expect(estaVencida({ estado: 'Pendiente', fecha_limite: '2026-09-01' }, AHORA)).toBe(true)
  })

  it('una tarea Hecha nunca está vencida / a done task is never overdue', () => {
    expect(estaVencida({ estado: 'Hecho', fecha_limite: '2026-09-01' }, AHORA)).toBe(false)
  })

  it('el límite de hoy todavía no vence / today is not yet overdue', () => {
    expect(estaVencida({ estado: 'Pendiente', fecha_limite: '2026-09-10' }, AHORA)).toBe(false)
  })

  it('sin límite no vence / no due date, no overdue', () => {
    expect(estaVencida({ estado: 'Pendiente', fecha_limite: null }, AHORA)).toBe(false)
  })
})

describe('metricasGlobales', () => {
  const base = [
    // cerrada y medible: espera 1 d, trabajo 2 d, total 3 d
    {
      estado: 'Hecho',
      fecha_creacion: iso('2026-09-01T00:00:00Z'),
      fecha_inicio: iso('2026-09-02T00:00:00Z'),
      fecha_hecho: iso('2026-09-04T00:00:00Z'),
    },
    // cerrada SIN sello de inicio (histórico previo a la migración)
    {
      estado: 'Hecho',
      fecha_creacion: iso('2026-09-01T00:00:00Z'),
      fecha_inicio: null,
      fecha_hecho: iso('2026-09-09T00:00:00Z'),
    },
    { estado: 'En curso', fecha_creacion: iso('2026-09-05T00:00:00Z'), fecha_inicio: iso('2026-09-08T00:00:00Z'), fecha_hecho: null },
    { estado: 'Pendiente', fecha_creacion: iso('2026-09-06T00:00:00Z'), fecha_inicio: null, fecha_hecho: null, fecha_limite: '2026-09-01' },
  ]

  it('cuenta los estados y el porcentaje cerrado', () => {
    const m = metricasGlobales(base, AHORA)
    expect(m).toMatchObject({ total: 4, hechas: 2, enCurso: 1, pendientes: 1, porcentajeCerradas: 50 })
  })

  it('cuenta las vencidas / counts overdue', () => {
    expect(metricasGlobales(base, AHORA).vencidas).toBe(1)
  })

  it('EXCLUYE de los promedios las tareas sin sello de inicio', () => {
    const m = metricasGlobales(base, AHORA)
    // espera: (1 d de la cerrada + 3 d de la que está en curso) / 2 = 2
    expect(m.esperaMedia).toBe(2)
    // trabajo: solo la cerrada medible = 2 d. Si la cerrada sin sello contara
    // como cero, saldría 1 e inventaría un desempeño que nadie midió.
    expect(m.trabajoMedio).toBe(2)
  })

  it('nombra cuántas cerradas quedaron sin medición', () => {
    expect(metricasGlobales(base, AHORA).sinMedicion).toBe(1)
  })

  it('el tiempo total sí incluye las cerradas sin sello', () => {
    // (3 d + 8 d) / 2 = 5.5 — creación y cierre existen en ambas
    expect(metricasGlobales(base, AHORA).totalMedio).toBe(5.5)
  })

  it('sin tareas devuelve nulos en vez de ceros / nulls, not zeros, when empty', () => {
    const m = metricasGlobales([], AHORA)
    expect(m.total).toBe(0)
    expect(m.esperaMedia).toBeNull()
    expect(m.trabajoMedio).toBeNull()
    expect(m.porcentajeCerradas).toBe(0)
  })
})

describe('metricasPorPersona', () => {
  const p = (nombre, over) => ({ asignado: { nombre_completo: nombre }, ...over })

  it('separa espera de trabajo / splits waiting from working', () => {
    const r = metricasPorPersona([
      p('Ana', {
        estado: 'Hecho',
        fecha_creacion: iso('2026-09-01T00:00:00Z'),
        fecha_inicio: iso('2026-09-03T00:00:00Z'),
        fecha_hecho: iso('2026-09-04T00:00:00Z'),
      }),
    ])
    expect(r[0]).toMatchObject({ nombre: 'Ana', espera: 2, trabajo: 1, total: 3, cerradas: 1, abiertas: 0 })
  })

  it('cuenta abiertas aparte de cerradas', () => {
    const r = metricasPorPersona([
      p('Ana', { estado: 'Pendiente', fecha_creacion: iso('2026-09-01T00:00:00Z'), fecha_inicio: null }),
      p('Ana', { estado: 'En curso', fecha_creacion: iso('2026-09-01T00:00:00Z'), fecha_inicio: iso('2026-09-02T00:00:00Z') }),
    ])
    expect(r[0]).toMatchObject({ cerradas: 0, abiertas: 2 })
  })

  it('una tarea EN CURSO no entra en los promedios / in-progress tasks are excluded', () => {
    // Su espera es medible, pero su trabajo no ha terminado. Si contara solo
    // en la espera, la suma mezclaria dos poblaciones y dejaria de ser un
    // tiempo de ciclo.
    const r = metricasPorPersona([
      p('Ana', {
        estado: 'Hecho',
        fecha_creacion: iso('2026-09-01T00:00:00Z'),
        fecha_inicio: iso('2026-09-02T00:00:00Z'),
        fecha_hecho: iso('2026-09-03T00:00:00Z'),
      }),
      p('Ana', {
        estado: 'En curso',
        fecha_creacion: iso('2026-09-01T00:00:00Z'),
        fecha_inicio: iso('2026-09-09T00:00:00Z'), // 8 dias de espera
        fecha_hecho: null,
      }),
    ])
    // Si la de En curso contara, la espera media seria 4.5 en vez de 1.
    expect(r[0].espera).toBe(1)
    expect(r[0].trabajo).toBe(1)
    expect(r[0].total).toBe(2)
    expect(r[0].medibles).toBe(1)
  })

  it('devuelve null, no cero, cuando no hay nada medible', () => {
    const r = metricasPorPersona([
      p('Ana', { estado: 'Pendiente', fecha_creacion: iso('2026-09-01T00:00:00Z'), fecha_inicio: null }),
    ])
    expect(r[0].espera).toBeNull()
    expect(r[0].trabajo).toBeNull()
    expect(r[0].total).toBeNull()
  })
})

describe('tareasRecurrentes', () => {
  const t = (nombre, estado, creada, hecha) => ({
    nombre,
    estado,
    fecha_creacion: creada ? iso(creada) : null,
    fecha_hecho: hecha ? iso(hecha) : null,
  })

  it('solo lista las que se repiten / only repeated names', () => {
    const r = tareasRecurrentes([
      t('Aseo', 'Hecho', '2026-09-01T00:00:00Z', '2026-09-02T00:00:00Z'),
      t('Aseo', 'Hecho', '2026-09-03T00:00:00Z', '2026-09-05T00:00:00Z'),
      t('Poda', 'Pendiente'),
    ])
    expect(r.map((x) => x.nombre)).toEqual(['Aseo'])
    expect(r[0]).toMatchObject({ veces: 2, cerradas: 2, totalMedio: 1.5 })
  })

  it('agrupa ignorando espacios alrededor / trims before grouping', () => {
    const r = tareasRecurrentes([t('  Aseo  ', 'Pendiente'), t('Aseo', 'Pendiente')])
    expect(r[0].veces).toBe(2)
  })

  it('ordena por frecuencia descendente / sorts by frequency', () => {
    const r = tareasRecurrentes([
      t('Aseo', 'Pendiente'), t('Aseo', 'Pendiente'),
      t('Poda', 'Pendiente'), t('Poda', 'Pendiente'), t('Poda', 'Pendiente'),
    ])
    expect(r.map((x) => x.nombre)).toEqual(['Poda', 'Aseo'])
  })

  it('sin cierres el promedio es null, no cero', () => {
    const r = tareasRecurrentes([t('Aseo', 'Pendiente'), t('Aseo', 'En curso')])
    expect(r[0].totalMedio).toBeNull()
  })
})

describe('cargaPorDimension', () => {
  it('agrupa por categoría y desglosa por estado', () => {
    const r = cargaPorDimension(
      [
        { estado: 'Hecho', categoria: { nombre: 'Limpieza' } },
        { estado: 'Pendiente', categoria: { nombre: 'Limpieza' } },
        { estado: 'Hecho', categoria: { nombre: 'Legal' } },
      ],
      'categoria'
    )
    expect(r[0]).toMatchObject({ nombre: 'Limpieza', total: 2, Hecho: 1, Pendiente: 1 })
  })

  it('agrupa lo que no trae dimensión / groups missing dimension', () => {
    const r = cargaPorDimension([{ estado: 'Hecho', area: null }], 'area')
    expect(r[0].nombre).toBe('Sin asignar')
  })
})
