/**
 * Lógica pura para plantillas de perfiles y tareas rutinarias de voluntariado.
 *
 * Sin React ni llamadas a Supabase a nivel de módulo.
 * Cubierto por pruebas en `plantillas.test.js`.
 */

/**
 * Ordena los ítems de una plantilla de acuerdo al campo `orden` numérico.
 * Si el orden es idéntico o falta, desempata alfabéticamente por nombre.
 * @param {Array} items
 * @returns {Array}
 */
export function ordenarTareasPlantilla(items) {
  if (!Array.isArray(items)) return []
  return [...items].sort((a, b) => {
    const ordenA = typeof a?.orden === 'number' ? a.orden : 0
    const ordenB = typeof b?.orden === 'number' ? b.orden : 0
    if (ordenA !== ordenB) return ordenA - ordenB
    return String(a?.nombre || '').localeCompare(String(b?.nombre || ''))
  })
}

/**
 * Valida los datos requeridos para un perfil / plantilla.
 * @param {{ nombre?: string }} datos
 * @returns {string|null} Mensaje de error o null si es válido.
 */
export function validarPlantilla(datos) {
  if (!datos || typeof datos.nombre !== 'string' || !datos.nombre.trim()) {
    return 'El nombre del perfil o rutina es obligatorio.'
  }
  if (datos.nombre.trim().length > 100) {
    return 'El nombre del perfil no puede exceder 100 caracteres.'
  }
  return null
}

/**
 * Valida los datos requeridos para un ítem de tarea de plantilla.
 * @param {{ nombre?: string }} datos
 * @returns {string|null} Mensaje de error o null si es válido.
 */
export function validarTareaPlantilla(datos) {
  if (!datos || typeof datos.nombre !== 'string' || !datos.nombre.trim()) {
    return 'El nombre de la tarea es obligatorio.'
  }
  if (datos.nombre.trim().length > 120) {
    return 'El nombre de la tarea no puede exceder 120 caracteres.'
  }
  return null
}

/**
 * Convierte un conjunto de ítems de una plantilla en una lista de tareas
 * listas para ser insertadas en la tabla `tareas` de Supabase.
 *
 * Hereda el área de trabajo y la categoría de la plantilla padre si el ítem
 * específico no los tiene configurados.
 *
 * @param {Object} plantilla - El perfil/plantilla padre.
 * @param {Array} items - Tareas seleccionadas de la plantilla.
 * @param {Object} opciones - { asignadoId, creadoPorId, fechaLimite }
 * @returns {Array<Object>} Lista de payloads de tareas para inserción en lote.
 */
export function prepararTareasDesdePlantilla(plantilla, items, opciones = {}) {
  const lista = Array.isArray(items) ? items : []
  const { asignadoId = null, creadoPorId = null, fechaLimite = null } = opciones

  return lista
    .filter((item) => item && typeof item.nombre === 'string' && item.nombre.trim())
    .map((item) => {
      const area = item.area_trabajo_id || plantilla?.area_trabajo_id || null
      const categoria = item.categoria_id || plantilla?.categoria_id || null

      return {
        nombre: item.nombre.trim(),
        detalles: item.detalles ? item.detalles.trim() : null,
        foto_requerida: Boolean(item.foto_requerida),
        area_trabajo_id: area,
        categoria_id: categoria,
        asignado_id: asignadoId,
        fecha_limite: fechaLimite || null,
        creado_por: creadoPorId,
        estado: 'Pendiente',
      }
    })
}
