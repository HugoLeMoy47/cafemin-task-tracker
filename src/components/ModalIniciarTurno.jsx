import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { ordenarTareasPlantilla } from '../lib/plantillas.js'
import { mensajeDeError } from '../lib/errores.js'

export default function ModalIniciarTurno({ onDone, onSuccess }) {
  const [plantillas, setPlantillas] = useState([])
  const [selectedPlantillaId, setSelectedPlantillaId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPlantillas() {
      setLoading(true)
      setError('')

      const { data, error: err } = await supabase
        .from('plantillas_perfil')
        .select(`
          *,
          area:areas_trabajo(nombre),
          categoria:categorias(nombre),
          tareas:plantilla_tareas(*)
        `)
        .eq('activo', true)
        .order('nombre')

      if (err) {
        setError(mensajeDeError(err, 'No se pudieron cargar los perfiles disponibles.'))
      } else {
        setPlantillas(data || [])
        if (data && data.length > 0) {
          setSelectedPlantillaId(data[0].id)
        }
      }
      setLoading(false)
    }

    loadPlantillas()
  }, [])

  const plantillaSeleccionada = plantillas.find((p) => p.id === selectedPlantillaId)
  const tareasDePlantilla = ordenarTareasPlantilla(plantillaSeleccionada?.tareas || [])

  async function handleIniciarTurno(e) {
    e.preventDefault()
    if (!selectedPlantillaId) return

    setSubmitting(true)
    setError('')

    const { data, error: rpcErr } = await supabase.rpc('iniciar_rutina_voluntario', {
      p_plantilla_id: selectedPlantillaId,
    })

    if (rpcErr) {
      setError(mensajeDeError(rpcErr, 'No se pudo iniciar el turno. Intenta de nuevo.'))
      setSubmitting(false)
      return
    }

    if (onSuccess) {
      onSuccess({
        rutina: plantillaSeleccionada?.nombre || 'Rutina',
        total: data?.tareas_creadas || tareasDePlantilla.length,
      })
    }
    onDone()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-iniciar-turno"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h3
              id="titulo-iniciar-turno"
              className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
            >
              <span>🚀</span>
              <span>Iniciar Mi Turno de Voluntariado</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Elige tu rol de hoy para preparar automáticamente tu lista de tareas.
            </p>
          </div>
          <button
            type="button"
            onClick={onDone}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold"
            aria-label="Cerrar ventana"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo */}
        <form onSubmit={handleIniciarTurno} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-xs rounded-xl">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-10 text-xs text-gray-400">
              Cargando roles y rutinas disponibles...
            </div>
          ) : plantillas.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl mb-2 inline-block">📋</span>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                No hay rutinas activas en este momento
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Consulta con la coordinación o gestor del albergue para que te asigne tareas directamente.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  ¿En qué área o rol apoyarás hoy? *
                </label>
                <select
                  value={selectedPlantillaId}
                  onChange={(e) => setSelectedPlantillaId(e.target.value)}
                  required
                  className="w-full min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {plantillas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.area ? `(Área: ${p.area.nombre})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {plantillaSeleccionada?.descripcion && (
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-3 rounded-xl text-xs text-blue-900 dark:text-blue-200">
                  {plantillaSeleccionada.descripcion}
                </div>
              )}

              {/* Vista previa de las tareas que recibirá */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">
                  Tareas que realizarás en esta jornada ({tareasDePlantilla.length}):
                </h4>
                <div className="space-y-2 max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900/40">
                  {tareasDePlantilla.map((t, idx) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs flex items-start justify-between gap-2 shadow-2xs"
                    >
                      <div>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {idx + 1}. {t.nombre}
                        </span>
                        {t.detalles && (
                          <p className="text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                            {t.detalles}
                          </p>
                        )}
                      </div>
                      {t.foto_requerida && (
                        <span className="shrink-0 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded font-medium text-xs">
                          📷 foto
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Botones */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <button
              type="button"
              onClick={onDone}
              className="flex-1 min-h-[44px] rounded-xl border border-gray-300 dark:border-gray-600 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || submitting || !plantillaSeleccionada}
              className="flex-1 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 inline-flex items-center justify-center gap-2"
            >
              {submitting ? 'Iniciando...' : '🚀 Comenzar mi jornada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
