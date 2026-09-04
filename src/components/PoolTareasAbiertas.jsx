import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { mensajeDeError } from '../lib/errores.js'

export default function PoolTareasAbiertas({ onTareaTomada }) {
  const [tareasAbiertas, setTareasAbiertas] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reclamandoId, setReclamandoId] = useState(null)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const fetchTareasAbiertas = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('tareas')
      .select(`
        *,
        area:areas_trabajo(nombre),
        categoria:categorias(nombre)
      `)
      .is('asignado_id', null)
      .eq('estado', 'Pendiente')
      .order('fecha_creacion', { ascending: false })

    if (err) {
      setError(mensajeDeError(err, 'No se pudieron consultar las tareas disponibles.'))
    } else {
      setTareasAbiertas(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTareasAbiertas()
  }, [fetchTareasAbiertas])

  async function handleTomarTarea(tarea) {
    setReclamandoId(tarea.id)
    setError('')
    setExito('')

    const { error: rpcErr } = await supabase.rpc('reclamar_tarea_abierta', {
      p_tarea_id: tarea.id,
    })

    if (rpcErr) {
      setError(mensajeDeError(rpcErr, 'No se pudo tomar la tarea. Puede que alguien más la haya tomado.'))
    } else {
      setExito(`¡Tomaste la tarea "${tarea.nombre}"! Ya está en tu lista de pendientes.`)
      await fetchTareasAbiertas()
      if (onTareaTomada) onTareaTomada()
    }
    setReclamandoId(null)
  }

  // Si no hay tareas y no está cargando, no estorba en pantalla
  if (!loading && tareasAbiertas.length === 0) {
    return null
  }

  return (
    <div className="mb-6 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs overflow-hidden transition-all">
      {/* Cabecera / disparador de colapso */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
        aria-expanded={abierto}
      >
        {/* `min-w-0` en el contenedor y en el bloque de texto: sin ellos, con
            la letra del sistema al 130% el título no puede encoger y empuja
            26 px fuera de la pantalla. Medido por npm run test:movil.
            Without min-w-0 the title cannot shrink and pushes 26 px off. */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl shrink-0" aria-hidden="true">🖐</span>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-blue-950 dark:text-blue-100">
              Tareas disponibles en el albergue ({tareasAbiertas.length})
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Tareas sin asignar que puedes tomar para apoyar a la comunidad
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
            {tareasAbiertas.length} {tareasAbiertas.length === 1 ? 'disponible' : 'disponibles'}
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">{abierto ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Contenido desplegable */}
      {abierto && (
        <div className="p-4 border-t border-blue-200/80 dark:border-blue-900/50 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-xs rounded-xl">
              {error}
            </div>
          )}

          {exito && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl">
              {exito}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tareasAbiertas.map((t) => (
              <div
                key={t.id}
                className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">
                      {t.nombre}
                    </h4>
                    {t.foto_requerida && (
                      <span className="shrink-0 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded font-medium text-xs">
                        📷 foto
                      </span>
                    )}
                  </div>
                  {t.detalles && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {t.detalles}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {t.area && (
                      <span className="bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded text-xs">
                        📍 {t.area.nombre}
                      </span>
                    )}
                    {t.categoria && (
                      <span className="bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded text-xs">
                        🏷 {t.categoria.nombre}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={reclamandoId === t.id}
                  onClick={() => handleTomarTarea(t)}
                  className="w-full min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 self-end"
                >
                  {reclamandoId === t.id ? 'Asignando a tu turno...' : '🖐 Tomar esta tarea'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
