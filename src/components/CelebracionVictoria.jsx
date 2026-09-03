import { useEffect } from 'react'
import { lanzarConfeti } from '../lib/confeti.js'

/**
 * Modal accesible de celebración de victoria al completar una tarea.
 *
 * Muestra el reconocimiento de impacto social, lanza una ráfaga sutil de confeti
 * (si el usuario no tiene reducción de movimiento) y permite continuar rápidamente.
 */
export default function CelebracionVictoria({
  tarea,
  mensaje,
  esUltima = false,
  onCerrar,
  onAbrirBitacora,
}) {
  useEffect(() => {
    lanzarConfeti()

    // Si es la última tarea, dar más tiempo para leer o interactuar
    const duracion = esUltima ? 8000 : 4000
    const timer = setTimeout(() => {
      onCerrar()
    }, duracion)

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onCerrar()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onCerrar, esUltima])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-celebracion"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-emerald-200 dark:border-emerald-800/60 p-6 max-w-sm w-full shadow-2xl text-center">
        <div className="text-4xl sm:text-5xl mb-3 select-none" role="img" aria-label="Celebración">
          {esUltima ? '🌟' : '🎉'}
        </div>

        <h3
          id="titulo-celebracion"
          className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug"
        >
          {esUltima ? '¡Misión de la jornada cumplida!' : '¡Tarea completada con éxito!'}
        </h3>

        {tarea?.nombre && (
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 line-clamp-2">
            &ldquo;{tarea.nombre}&rdquo;
          </p>
        )}

        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
          {mensaje}
        </p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            autoFocus
            onClick={onCerrar}
            className="w-full min-h-[44px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
          >
            {esUltima ? '¡Excelente día!' : 'Continuar'}
          </button>

          {esUltima && onAbrirBitacora && (
            <button
              type="button"
              onClick={() => {
                onCerrar()
                onAbrirBitacora()
              }}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            >
              📝 Dejar novedad para el siguiente turno
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
