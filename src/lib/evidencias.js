/**
 * Acceso a las fotos de evidencia.
 * Access to evidence photos.
 *
 * El bucket es PRIVADO. La columna `tareas.evidencia_url` guarda la RUTA del
 * archivo ('{id_de_tarea}/{timestamp}.{ext}'), no una URL: las URLs firmadas
 * caducan y no tiene sentido persistirlas.
 *
 * The bucket is PRIVATE. `tareas.evidencia_url` stores the file PATH, not a
 * URL: signed URLs expire, so persisting them makes no sense.
 */

const BUCKET = 'evidencias'

/** Vigencia de la URL firmada. Corta a propósito: es para abrirla al momento. */
const VIGENCIA_SEGUNDOS = 60

/**
 * Construye la ruta de una evidencia. El primer segmento es el id de la tarea:
 * las políticas de Storage lo usan para comprobar la propiedad.
 * The first segment is the task id; Storage policies use it to check ownership.
 */
export function buildEvidencePath(taskId, fileName) {
  const partes = String(fileName || '').split('.')
  const ext = partes.length > 1 ? partes.pop().toLowerCase() : 'jpg'
  return `${taskId}/${Date.now()}.${ext}`
}

/**
 * Normaliza el valor almacenado a una ruta utilizable.
 * Tolera el formato heredado (URL pública completa) para que las filas que aún
 * no se hayan migrado sigan abriendo.
 *
 * Normalizes the stored value into a usable path, tolerating the legacy
 * full public URL so unmigrated rows keep working.
 */
export function toStoragePath(valor) {
  if (typeof valor !== 'string') return null
  const limpio = valor.trim()
  if (limpio === '') return null

  const marca = `/storage/v1/object/public/${BUCKET}/`
  const i = limpio.indexOf(marca)
  if (i !== -1) return limpio.slice(i + marca.length)

  // Una URL de cualquier otro origen no es una ruta de este bucket.
  if (/^https?:\/\//i.test(limpio)) return null

  return limpio.replace(/^\/+/, '')
}

/**
 * Devuelve una URL firmada de vigencia corta, o un mensaje de error legible.
 * Nunca lanza: el llamador decide cómo mostrar el fallo.
 *
 * Returns a short-lived signed URL, or a readable error. Never throws.
 */
export async function getSignedEvidenceUrl(valor) {
  const path = toStoragePath(valor)
  if (!path) {
    return {
      url: null,
      error: 'La evidencia no tiene una ruta válida. / Evidence has no usable path.',
    }
  }

  // Importación diferida a propósito: así las funciones de arriba son puras y
  // se pueden probar sin credenciales de Supabase. El cliente solo se carga
  // cuando alguien pide abrir una evidencia de verdad.
  // Deliberately deferred import: it keeps the helpers above pure and testable
  // without Supabase credentials.
  const { supabase } = await import('../supabaseClient')

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, VIGENCIA_SEGUNDOS)

  if (error) {
    // El mensaje de Storage puede nombrar el bucket o la política que denegó.
    // Storage's own message can name the bucket or the policy that denied it.
    const { mensajeDeError } = await import('./errores')
    return {
      url: null,
      error: mensajeDeError(error, 'No se pudo abrir la evidencia. Intenta de nuevo.'),
    }
  }
  return { url: data.signedUrl, error: null }
}
