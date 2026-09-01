import { describe, it, expect } from 'vitest'
import {
  ESTADOS,
  SIN_ASIGNAR,
  inicioDeSemana,
  resumenPorAsignado,
  resumenPorEstado,
  serieSemanal,
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
