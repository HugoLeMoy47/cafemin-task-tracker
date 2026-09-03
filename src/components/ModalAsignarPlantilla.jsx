import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { ordenarTareasPlantilla, prepararTareasDesdePlantilla } from '../lib/plantillas.js'
import { mensajeDeError } from '../lib/errores.js'

export default function ModalAsignarPlantilla({ userProfile, onDone, onSuccess }) {
  const [plantillas, setPlantillas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [selectedPlantillaId, setSelectedPlantillaId] = useState('')
  const [selectedUsuarioId, setSelectedUsuarioId] = useState('')
  const [fechaLimite, setFechaLimite] = useState(new Date().toISOString().split('T')[0])
  const [selectedItemIds, setSelectedItemIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      const [{ data: p, error: ep }, { data: u, error: eu }] = await Promise.all([
        supabase
          .from('plantillas_perfil')
          .select(`
            *,
            area:areas_trabajo(nombre),
            categoria:categorias(nombre),
            tareas:plantilla_tareas(*)
          `)
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('usuarios')
          .select('id, nombre_completo')
          .eq('activo', true)
          .eq('rol', 'Asignado')
          .order('nombre_completo'),
      ])

      if (ep || eu) {
        setError(
          mensajeDeError(
            ep || eu,
            'No se pudieron cargar los perfiles y voluntarios. Verifica tu conexión.'
          )
        )
      } else {
        setPlantillas(p || [])
        setUsuarios(u || [])
        if (p && p.length > 0) {
          setSelectedPlantillaId(p[0].id)
          const ordenadas = ordenarTareasPlantilla(p[0].tareas || [])
          setSelectedItemIds(new Set(ordenadas.map((t) => t.id)))
        }
      }
      setLoading(false)
    }

    loadData()
  }, [])

  // Al cambiar de plantilla, seleccionar todas sus tareas por defecto
  function handleCambiarPlantilla(plantillaId) {
    setSelectedPlantillaId(plantillaId)
    const plantilla = plantillas.find((p) => p.id === plantillaId)
    if (plantilla) {
      const ordenadas = ordenarTareasPlantilla(plantilla.tareas || [])
      setSelectedItemIds(new Set(ordenadas.map((t) => t.id)))
    } else {
      setSelectedItemIds(new Set())
    }
  }

  function toggleItem(itemId) {
    setSelectedItemIds((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(itemId)) {
        nuevo.delete(itemId)
      } else {
        nuevo.add(itemId)
      }
      return nuevo
    })
  }

  function toggleTodos() {
    const plantilla = plantillas.find((p) => p.id === selectedPlantillaId)
    if (!plantilla) return
    const todasIds = (plantilla.tareas || []).map((t) => t.id)
    if (selectedItemIds.size === todasIds.length) {
      setSelectedItemIds(new Set())
    } else {
      setSelectedItemIds(new Set(todasIds))
    }
  }

  const plantillaActual = plantillas.find((p) => p.id === selectedPlantillaId)
  const tareasDePlantilla = ordenarTareasPlantilla(plantillaActual?.tareas || [])
  const voluntarioActual = usuarios.find((u) => u.id === selectedUsuarioId)

  async function handleAsignar(e) {
    e.preventDefault()
    if (!selectedUsuarioId) {
      setError('Selecciona al voluntario que realizará las tareas.')
      return
    }
    if (!plantillaActual || selectedItemIds.size === 0) {
      setError('Selecciona al menos una tarea para asignar.')
      return
    }

    setSubmitting(true)
    setError('')

    const itemsAAsignar = tareasDePlantilla.filter((t) => selectedItemIds.has(t.id))
    const payloads = prepararTareasDesdePlantilla(plantillaActual, itemsAAsignar, {
      asignadoId: selectedUsuarioId,
      creadoPorId: userProfile?.id,
      fechaLimite,
    })

    const { error: insertErr } = await supabase.from('tareas').insert(payloads)

    if (insertErr) {
      setError(mensajeDeError(insertErr, 'No se pudieron asignar las tareas de la rutina.'))
      setSubmitting(false)
      return
    }

    if (onSuccess) {
      onSuccess({
        conteo: payloads.length,
        voluntario: voluntarioActual?.nombre_completo || 'el voluntario',
        perfil: plantillaActual.nombre,
      })
    }
    onDone()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-plantilla"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Encabezado */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h3
              id="titulo-modal-plantilla"
              className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
            >
              <span>⚡</span>
              <span>Asignar Rutina a Voluntario</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Genera en bloque las tareas predefinidas para la jornada del voluntario.
            </p>
          </div>
          <button
            type="button"
            onClick={onDone}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo con scroll */}
        <form onSubmit={handleAsignar} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-xs rounded-xl">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-10 text-sm text-gray-400">Cargando perfiles y voluntarios...</div>
          ) : plantillas.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl mb-2 inline-block">📋</span>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                No hay perfiles ni plantillas creadas
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                Crea perfiles en la sección &ldquo;Rutinas&rdquo; para poder asignar tareas de forma masiva.
              </p>
            </div>
          ) : (
            <>
              {/* Selector de Voluntario */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Voluntario Asignado *
                </label>
                <select
                  value={selectedUsuarioId}
                  onChange={(e) => setSelectedUsuarioId(e.target.value)}
                  required
                  className="w-full min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Seleccionar voluntario --</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre_completo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Perfil / Rutina */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Perfil / Rutina *
                  </label>
                  <select
                    value={selectedPlantillaId}
                    onChange={(e) => handleCambiarPlantilla(e.target.value)}
                    required
                    className="w-full min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {plantillas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Fecha límite
                  </label>
                  <input
                    type="date"
                    value={fechaLimite}
                    onChange={(e) => setFechaLimite(e.target.value)}
                    className="w-full min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {plantillaActual?.descripcion && (
                <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-lg">
                  ℹ️ {plantillaActual.descripcion}
                </p>
              )}

              {/* Lista de tareas de la rutina con checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    Tareas incluidas ({selectedItemIds.size} de {tareasDePlantilla.length})
                  </label>
                  {tareasDePlantilla.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleTodos}
                      className="min-h-[44px] text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline px-2 inline-flex items-center"
                    >
                      {selectedItemIds.size === tareasDePlantilla.length
                        ? 'Desmarcar todas'
                        : 'Marcar todas'}
                    </button>
                  )}
                </div>

                {tareasDePlantilla.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 py-2">
                    Este perfil no tiene tareas configuradas todavía.
                  </p>
                ) : (
                  <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-gray-50/50 dark:bg-gray-900/30">
                    {tareasDePlantilla.map((t, idx) => {
                      const marcada = selectedItemIds.has(t.id)
                      return (
                        <label
                          key={t.id}
                          className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer min-h-[44px] ${
                            marcada
                              ? 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-900/60 shadow-xs'
                              : 'bg-transparent border-transparent opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={marcada}
                            onChange={() => toggleItem(t.id)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {idx + 1}. {t.nombre}
                              </span>
                              {t.foto_requerida && (
                                <span className="shrink-0 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded font-medium text-xs">
                                  📷 foto
                                </span>
                              )}
                            </div>
                            {t.detalles && (
                              <p className="text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                                {t.detalles}
                              </p>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Botones de acción */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <button
              type="button"
              onClick={onDone}
              className="flex-1 min-h-[44px] rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                submitting ||
                !selectedUsuarioId ||
                !plantillaActual ||
                selectedItemIds.size === 0
              }
              className="flex-1 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 inline-flex items-center justify-center gap-1.5"
            >
              {submitting
                ? 'Asignando...'
                : `⚡ Asignar ${selectedItemIds.size} ${
                    selectedItemIds.size === 1 ? 'tarea' : 'tareas'
                  }`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
