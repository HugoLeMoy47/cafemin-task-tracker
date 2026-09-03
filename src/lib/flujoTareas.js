/**
 * El flujo de estados de una tarea, en un solo lugar.
 * The task state flow, in one place.
 *
 * Existe porque ahora hay DOS formas de mover una tarea —arrastrarla en el
 * tablero de escritorio y pulsar un botón en el teléfono— y dos caminos que
 * deciden por su cuenta qué transición es válida acaban divergiendo. El que se
 * usa menos es el que se queda atrás, y aquí el que se usa menos es el de
 * escritorio: quien hace el trabajo está en el teléfono.
 *
 * Two ways to move a task now exist; two places deciding what a valid move is
 * would drift, and the less-used path is the one that rots.
 *
 * Estas reglas son un espejo de las que la base impone en
 * `supabase/migrations/reglas_cierre_asignado.sql` (PT002 y PT003). El espejo
 * es para no ofrecerle a alguien un botón que la base va a rechazar; la que
 * manda sigue siendo la base.
 * These mirror the database rules so the UI never offers a button the database
 * will refuse. The database remains the authority.
 */

export const ESTADOS = ['Pendiente', 'En curso', 'Hecho']

/** Etiqueta del botón que lleva la tarea al siguiente estado. */
const ETIQUETA_AVANCE = {
  Pendiente: 'Marcar en curso',
  'En curso': 'Marcar hecha',
}

/**
 * Siguiente estado en el flujo, o null si la tarea ya está al final.
 * Next state in the flow, or null when the task is already at the end.
 */
export function siguienteEstado(estado) {
  const i = ESTADOS.indexOf(estado)
  if (i === -1 || i === ESTADOS.length - 1) return null
  return ESTADOS[i + 1]
}

/**
 * ¿Qué avance se le ofrece a esta persona sobre esta tarea?
 *
 * Devuelve `null` cuando no hay ninguno, y si no, el destino, la etiqueta y si
 * ese avance va a pedir foto. Lo último se devuelve para que el botón pueda
 * anunciarlo —«Marcar hecha 📷»— en vez de sorprender con un diálogo.
 *
 * Returns null when there is no move to offer; otherwise the destination, the
 * label, and whether the move will ask for a photo — so the button can say so
 * instead of surprising the person with a dialog.
 */
export function avanceDisponible(tarea, { esPrivilegiado }) {
  if (!tarea) return null

  const destino = siguienteEstado(tarea.estado)
  if (!destino) return null

  // Administrador y Gestor se saltan la exigencia de foto. Es la decisión de
  // producto que ya estaba tomada en el tablero; aquí solo se refleja.
  const pideFoto =
    destino === 'Hecho' && !!tarea.foto_requerida && !tarea.evidencia_url && !esPrivilegiado

  return {
    destino,
    etiqueta: ETIQUETA_AVANCE[tarea.estado],
    pideFoto,
  }
}

/**
 * ¿Puede esta persona mover esta tarea a ese estado?
 *
 * La única regla que se aplica aquí es la de la reapertura: quien no es
 * privilegiado no saca una tarea de 'Hecho'. Es exactamente PT002.
 * Mirrors PT002: a non-privileged person cannot move a task out of 'Hecho'.
 */
export function puedeMover(tarea, destino, { esPrivilegiado }) {
  if (!tarea || !ESTADOS.includes(destino)) return false
  if (tarea.estado === destino) return false
  if (!esPrivilegiado && tarea.estado === 'Hecho') return false
  return true
}
