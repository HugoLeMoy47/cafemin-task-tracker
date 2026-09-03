import { calcularProgresoVoluntario, obtenerMensajeProgreso } from '../lib/gamificacion.js'

/**
 * Barra de progreso y sentido de logro para el voluntario (rol Asignado).
 *
 * Muestra el avance del turno de forma visual, empática y motivadora,
 * evitando métricas frías o competitivas.
 */
export default function ProgresoVoluntario({ tareas = [], nombreUsuario = '' }) {
  const progreso = calcularProgresoVoluntario(tareas)
  const mensaje = obtenerMensajeProgreso(progreso)
  const primerNombre = nombreUsuario ? nombreUsuario.split(' ')[0] : 'Voluntario'

  if (progreso.total === 0) {
    return (
      <div className="mb-6 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-4 text-center">
        <span className="text-2xl mb-1 inline-block" role="img" aria-label="Descanso">
          ☕
        </span>
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
          ¡Hola, {primerNombre}! Todo al día
        </h3>
        <p className="text-xs text-blue-700 dark:text-blue-300/90 mt-1 max-w-md mx-auto">
          No tienes tareas asignadas por el momento. Si estás en turno en el albergue, acércate con el
          equipo de coordinación.
        </p>
      </div>
    )
  }

  if (progreso.todasCompletadas) {
    return (
      <div className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-2xl sm:text-3xl select-none" role="img" aria-label="Celebración">
            🎉
          </span>
          <div className="flex-1">
            <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
              ¡Misión cumplida, {primerNombre}!
            </h3>
            <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 mt-1">
              Has completado tus {progreso.total} {progreso.total === 1 ? 'tarea' : 'tareas'} de hoy. Tu
              tiempo y cariño hacen que CAFEMIN sea un hogar digno y cálido.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-200/80 dark:bg-emerald-800/80 text-emerald-900 dark:text-emerald-100">
                ✓ 100% de la jornada completada
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            ¡Hola, {primerNombre}! 👋
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{mensaje}</p>
        </div>
        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 self-start sm:self-auto">
          {progreso.hechas} de {progreso.total} hechas ({progreso.porcentaje}%)
        </div>
      </div>

      {/* Barra de progreso */}
      <div
        className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden"
        role="progressbar"
        aria-valuenow={progreso.porcentaje}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Progreso de tareas del día"
      >
        <div
          className="bg-emerald-500 dark:bg-emerald-400 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progreso.porcentaje}%` }}
        />
      </div>
    </div>
  )
}
