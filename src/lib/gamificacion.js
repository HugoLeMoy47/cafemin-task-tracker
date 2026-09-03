/**
 * Lógica pura de gamificación, sentido de victoria y progreso de la jornada
 * para el voluntariado en CAFEMIN.
 *
 * Sin dependencias de React ni llamadas a Supabase. Todo es determinista y
 * cuenta con pruebas unitarias adyacentes en `gamificacion.test.js`.
 */

export const MENSAJES_VICTORIA = [
  '¡Excelente trabajo! Gracias por cuidar y dignificar los espacios del albergue.',
  '¡Tarea terminada! Tu tiempo y esfuerzo apoyan directamente a las familias en CAFEMIN.',
  '¡Una menos! Cada detalle cuenta para brindar una estancia cálida y segura.',
  '¡Misión cumplida! Tu vocación de servicio hace una diferencia tangible hoy.',
  '¡Gran labor! Gracias por sumar tu energía y corazón a este albergue.',
  '¡Meta alcanzada! Gracias por acompañar con tu ayuda a quienes más lo necesitan.',
]

/**
 * Obtiene un mensaje cálido de victoria y reconocimiento de impacto social.
 * @param {number} [indice] - Opcional. Permite seleccionar determinísticamente en pruebas.
 * @returns {string}
 */
export function obtenerMensajeVictoria(indice = null) {
  if (typeof indice === 'number' && !Number.isNaN(indice)) {
    const idx = Math.abs(Math.floor(indice)) % MENSAJES_VICTORIA.length
    return MENSAJES_VICTORIA[idx]
  }
  const aleatorio = Math.floor(Math.random() * MENSAJES_VICTORIA.length)
  return MENSAJES_VICTORIA[aleatorio]
}

/**
 * Calcula el avance y métricas de jornada del voluntario a partir de sus tareas.
 * @param {Array} tareas - Lista de tareas del usuario asignado.
 * @returns {{
 *   total: number,
 *   pendientes: number,
 *   enCurso: number,
 *   hechas: number,
 *   porcentaje: number,
 *   todasCompletadas: boolean,
 *   hayPendientes: boolean
 * }}
 */
export function calcularProgresoVoluntario(tareas) {
  const lista = Array.isArray(tareas) ? tareas : []
  const total = lista.length

  if (total === 0) {
    return {
      total: 0,
      pendientes: 0,
      enCurso: 0,
      hechas: 0,
      porcentaje: 0,
      todasCompletadas: false,
      hayPendientes: false,
    }
  }

  let pendientes = 0
  let enCurso = 0
  let hechas = 0

  for (const t of lista) {
    if (t?.estado === 'Hecho') {
      hechas++
    } else if (t?.estado === 'En curso') {
      enCurso++
    } else {
      pendientes++
    }
  }

  const porcentaje = Math.round((hechas / total) * 100)
  const todasCompletadas = hechas === total
  const hayPendientes = pendientes > 0 || enCurso > 0

  return {
    total,
    pendientes,
    enCurso,
    hechas,
    porcentaje,
    todasCompletadas,
    hayPendientes,
  }
}

/**
 * Genera el mensaje motivador contextual para la cabecera de avance.
 * @param {{ total: number, hechas: number, porcentaje: number, todasCompletadas: boolean }} progreso
 * @returns {string}
 */
export function obtenerMensajeProgreso(progreso) {
  if (!progreso || progreso.total === 0) {
    return 'No tienes tareas asignadas por ahora.'
  }

  if (progreso.todasCompletadas) {
    return '🎉 ¡Completaste todas tus tareas de hoy! Muchas gracias por tu dedicación en CAFEMIN.'
  }

  if (progreso.hechas === 0) {
    return `Tienes ${progreso.total} ${progreso.total === 1 ? 'tarea asignada' : 'tareas asignadas'} para tu turno.`
  }

  const faltantes = progreso.total - progreso.hechas
  if (faltantes === 1) {
    return `¡Casi listo! Solo te falta 1 tarea para completar tu jornada de hoy.`
  }

  if (progreso.porcentaje >= 50) {
    return `¡Gran avance! Llevas ${progreso.hechas} de ${progreso.total} tareas completadas (${progreso.porcentaje}%).`
  }

  return `¡Buen inicio! Llevas ${progreso.hechas} de ${progreso.total} tareas completadas.`
}
