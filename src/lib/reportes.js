/**
 * Agregaciones para los reportes.
 * Report aggregations.
 *
 * Funciones PURAS a propósito: reciben las tareas y devuelven datos planos.
 * Las gráficas solo dibujan lo que sale de aquí, así que la lógica que puede
 * estar mal —los conteos y los cortes de semana— se prueba sin navegador.
 *
 * Deliberately PURE: the charts only draw what these return, so the logic that
 * can actually be wrong is testable without a browser.
 */

/** Orden del flujo. No alfabético: es la secuencia real de una tarea. */
export const ESTADOS = ['Pendiente', 'En curso', 'Hecho']

export const SIN_ASIGNAR = 'Sin asignar'

/**
 * Conteo por estado, siempre con los tres presentes aunque alguno sea cero.
 * Un estado ausente del gráfico se lee como "no existe", no como "está vacío".
 * Always includes all three states even at zero: a missing bar reads as
 * "does not exist" rather than "is empty".
 */
export function resumenPorEstado(tareas) {
  return ESTADOS.map((estado) => ({
    estado,
    conteo: tareas.filter((t) => t.estado === estado).length,
  }))
}

/**
 * Desglose por persona: cuántas tiene en cada estado.
 * Se ordena por total descendente para que la mayor carga quede arriba, y a
 * igualdad de total, alfabético, para que el orden sea estable entre recargas.
 * Sorted by total desc, then alphabetically so the order is stable.
 */
export function resumenPorAsignado(tareas) {
  const mapa = new Map()

  for (const t of tareas) {
    const nombre = t.asignado?.nombre_completo || SIN_ASIGNAR
    if (!mapa.has(nombre)) {
      mapa.set(nombre, { nombre, Pendiente: 0, 'En curso': 0, Hecho: 0, total: 0 })
    }
    const fila = mapa.get(nombre)
    if (ESTADOS.includes(t.estado)) fila[t.estado] += 1
    fila.total += 1
  }

  return [...mapa.values()].sort(
    (a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es')
  )
}

/**
 * Lunes 00:00 (hora local) de la semana a la que pertenece una fecha.
 * Se usa el lunes porque es el inicio de semana laboral en México; con domingo
 * el corte partiría los fines de semana a la mitad.
 * Monday because that is the start of the working week here.
 */
export function inicioDeSemana(fecha) {
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return null
  const diaDesdeLunes = (d.getDay() + 6) % 7 // domingo=0 → 6
  d.setDate(d.getDate() - diaDesdeLunes)
  d.setHours(0, 0, 0, 0)
  return d
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * Serie semanal de tareas creadas y cerradas.
 *
 * Se generan TODAS las semanas del rango, incluidas las vacías: saltarse una
 * semana sin actividad comprime el eje y hace que un hueco parezca continuidad.
 * Every week in the range is emitted, including empty ones: skipping a quiet
 * week compresses the axis and makes a gap look like continuity.
 *
 * @param {number} semanas cuántas semanas hacia atrás, contando la actual
 * @param {Date} referencia hoy; parametrizado para poder probarlo
 */
export function serieSemanal(tareas, semanas = 10, referencia = new Date()) {
  const semanaActual = inicioDeSemana(referencia)
  if (!semanaActual) return []

  const cubos = []
  const indice = new Map()

  for (let i = semanas - 1; i >= 0; i--) {
    const inicio = new Date(semanaActual)
    inicio.setDate(inicio.getDate() - i * 7)
    const cubo = {
      inicio,
      clave: inicio.toISOString().slice(0, 10),
      etiqueta: `${inicio.getDate()} ${MESES[inicio.getMonth()]}`,
      creadas: 0,
      cerradas: 0,
    }
    cubos.push(cubo)
    indice.set(cubo.clave, cubo)
  }

  const acumular = (iso, campo) => {
    if (!iso) return
    const semana = inicioDeSemana(iso)
    if (!semana) return
    const cubo = indice.get(semana.toISOString().slice(0, 10))
    if (cubo) cubo[campo] += 1 // fuera del rango: se ignora, no se apila en el borde
  }

  for (const t of tareas) {
    acumular(t.fecha_creacion, 'creadas')
    acumular(t.fecha_hecho, 'cerradas')
  }

  return cubos
}
