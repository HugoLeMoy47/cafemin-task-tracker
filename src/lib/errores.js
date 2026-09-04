/**
 * Traduce errores de Supabase y Postgres a algo que una persona pueda leer.
 * Turns Supabase and Postgres errors into something a person can read.
 *
 * ── El principio: lista blanca, no lista negra ──
 *
 * Solo sale a pantalla un texto que escribimos nosotros. Un mensaje que no
 * reconocemos NO se muestra: se sustituye por el respaldo que da quien llama.
 *
 * Una lista negra —"filtra los mensajes peligrosos"— falla el día que aparece
 * uno que nadie anticipó, y ese día es justo cuando importa. Un fallo de RLS o
 * de índice único trae el nombre de la tabla, de la columna o de la política;
 * con la aplicación en una URL pública y cuentas repartidas, cada uno de esos
 * mensajes es un mapa gratuito del esquema para quien esté probando dónde cede.
 *
 * Allowlist, not denylist: an unrecognized message is never shown. A denylist
 * fails on the first message nobody anticipated, which is exactly when it
 * matters.
 *
 * ── Lo que sí se muestra ──
 *
 * Los códigos PT001–PT005 son nuestros: los definimos en
 * `supabase/migrations/reglas_cierre_asignado.sql` con un texto pensado para
 * leerse. Ese sí pasa tal cual, y es la razón de que existan códigos en vez de
 * comparar cadenas.
 */

/**
 * Reglas del proyecto. El texto viene del trigger, pero se repite aquí para
 * que el mensaje no dependa de que la migración esté aplicada: si alguien abre
 * la app contra una base sin ella, verá el texto correcto de todos modos.
 * Repeated here so the message does not depend on the migration being applied.
 */
export const REGLAS_DEL_PROYECTO = {
  PT001: 'Solo puedes cambiar el estado de la tarea y su evidencia.',
  PT002: 'Una tarea marcada como Hecha solo la puede reabrir un Administrador o Gestor.',
  PT003: 'Esta tarea requiere foto de evidencia para marcarse como Hecha.',
  PT004: 'La evidencia debe pertenecer a esta tarea.',
  PT005: 'No se puede quitar la evidencia de una tarea ya cerrada.',
  PT006:
    'No se puede dejar el sistema sin ningún Administrador activo. Asigna ese rol a otra persona primero.',
  PT007: 'Solo un Administrador puede cambiar el acceso de otras personas.',
  PT008: 'No puedes desactivar tu propio acceso. Pídeselo a otro Administrador.',
  PT009: 'No se encontró a esa persona.',
  PT010: 'Debes tener una cuenta activa para tomar una tarea.',
  PT011: 'La tarea no existe.',
  PT012: 'Esta tarea ya fue tomada por otra persona.',
  PT013: 'Solo se pueden tomar tareas en estado Pendiente.',
  PT020: 'Debes tener una cuenta activa para iniciar una rutina.',
  PT021: 'El perfil o rutina no existe o no está activo.',
}

/**
 * Códigos estándar de Postgres que llegan por uso normal de la aplicación. El
 * texto es deliberadamente genérico: dice qué pasó, no dónde. «Ya existe un
 * registro con ese nombre» es accionable; el nombre del índice único no le
 * sirve a nadie salvo a quien esté mapeando el esquema.
 * Deliberately generic: says what happened, not where.
 */
const POSTGRES = {
  '23505': 'Ya existe un registro con ese nombre.',
  '23503': 'No se puede completar: hay otros registros que dependen de este.',
  '23514': 'Alguno de los valores no es válido.',
  '23502': 'Falta un dato obligatorio.',
  '42501': 'No tienes permiso para hacer esto.',
  '22P02': 'Alguno de los valores tiene un formato inesperado.',
}

/**
 * Errores de autenticación (GoTrue).
 *
 * `invalid_credentials` y `email_not_confirmed` comparten mensaje A PROPÓSITO.
 * El login es el único punto de entrada anónimo, y distinguirlos convierte la
 * pantalla en un detector de correos registrados: quien prueba una lista de
 * direcciones sabe cuáles existen por la diferencia de respuesta. El límite de
 * intentos sí se distingue —no revela nada y saberlo le ahorra a la persona
 * seguir intentando.
 *
 * Those two share a message on purpose: telling them apart turns the login
 * screen into a registered-email detector.
 */
const AUTENTICACION = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Correo o contraseña incorrectos.',
  invalid_grant: 'Correo o contraseña incorrectos.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento y vuelve a intentarlo.',
  over_email_send_rate_limit: 'Se enviaron demasiados correos. Espera unos minutos.',
  weak_password: 'La contraseña es demasiado débil. Usa una más larga o menos común.',
  same_password: 'La contraseña nueva debe ser distinta de la anterior.',
  user_already_exists: 'Ya existe una cuenta con ese correo.',
  email_exists: 'Ya existe una cuenta con ese correo.',
  session_expired: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  session_not_found: 'Tu sesión expiró. Vuelve a iniciar sesión.',
}

/**
 * Las versiones viejas del cliente de Supabase no traen `code`, solo `message`.
 * Se mapean los textos conocidos al mismo código para no depender de la versión.
 * Older clients only carry `message`, so known texts map to the same codes.
 */
const TEXTO_A_CODIGO = {
  'invalid login credentials': 'invalid_credentials',
  'email not confirmed': 'email_not_confirmed',
  'user already registered': 'user_already_exists',
  'new password should be different from the old password.': 'same_password',
}

const SIN_RED =
  'No se pudo conectar. Revisa tu conexión e intenta de nuevo.'

/** Respaldo cuando quien llama no dio uno. */
export const RESPALDO_GENERAL = 'No se pudo completar la operación. Intenta de nuevo.'

/**
 * ¿El error es de red y no del servidor? `fetch` lanza un TypeError cuando no
 * hay conexión, y ese caso merece su propio mensaje: decirle a alguien sin
 * internet que «no se pudo completar la operación» lo manda a buscar el
 * problema donde no está.
 */
function esFalloDeRed(error) {
  if (!error) return false
  const nombre = error.name || ''
  const texto = String(error.message || '').toLowerCase()
  return (
    nombre === 'TypeError' ||
    texto.includes('failed to fetch') ||
    texto.includes('networkerror') ||
    texto.includes('load failed')
  )
}

function codigoDeAutenticacion(error) {
  const directo = error?.code || error?.error_code
  if (directo && AUTENTICACION[directo]) return directo
  const texto = String(error?.message || '').trim().toLowerCase()
  return TEXTO_A_CODIGO[texto] || null
}

/**
 * Mensaje para mostrar al usuario.
 *
 * @param {unknown} error       Lo que devolvió Supabase, o una excepción.
 * @param {string}  respaldo    Qué decir cuando el error no se reconoce.
 *                              Escríbelo pensando en dónde ocurrió: «No se pudo
 *                              guardar la tarea» ubica mejor que un genérico.
 * @returns {string}
 */
export function mensajeDeError(error, respaldo = RESPALDO_GENERAL) {
  if (!error) return respaldo

  // Regla del proyecto: texto escrito para leerse, pasa tal cual.
  const codigo = error.code || error.errcode
  if (codigo && REGLAS_DEL_PROYECTO[codigo]) return REGLAS_DEL_PROYECTO[codigo]

  // El cliente de Supabase no siempre expone el SQLSTATE en `code`; cuando el
  // trigger usa RAISE, el texto viaja en `message`. Se busca el código ahí.
  const texto = String(error.message || '')
  for (const [pt, mensaje] of Object.entries(REGLAS_DEL_PROYECTO)) {
    if (texto.includes(pt) || texto.includes(mensaje)) return mensaje
  }

  const auth = codigoDeAutenticacion(error)
  if (auth) return AUTENTICACION[auth]

  if (codigo && POSTGRES[codigo]) return POSTGRES[codigo]

  if (esFalloDeRed(error)) return SIN_RED

  // Desconocido. Aquí es donde una lista negra habría dejado pasar el mensaje
  // crudo; la lista blanca lo descarta.
  // Unknown: this is exactly where a denylist would have leaked the raw text.
  return respaldo
}

/**
 * Mensaje para el formulario de inicio de sesión.
 *
 * Va aparte del general por una razón concreta: es el único punto donde
 * responde el servidor a alguien que todavía no se ha identificado, así que el
 * respaldo también tiene que ser mudo. Cualquier error que no sea de red ni de
 * límite de intentos se cuenta como credenciales incorrectas — incluido uno
 * inesperado, que es justo el que podría delatar el estado de una cuenta.
 *
 * Separate on purpose: it is the only place the server answers someone not yet
 * identified, so even the fallback has to stay silent about account state.
 */
export function mensajeDeLogin(error) {
  if (!error) return ''
  if (esFalloDeRed(error)) return SIN_RED

  const auth = codigoDeAutenticacion(error)
  if (auth === 'over_request_rate_limit') return AUTENTICACION.over_request_rate_limit

  return AUTENTICACION.invalid_credentials
}
