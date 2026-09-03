import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { validarNotaTurno } from '../lib/plantillas.js'
import { mensajeDeError } from '../lib/errores.js'

export default function BitacoraTurno({ userProfile, onDone }) {
  const [notas, setNotas] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  // Formulario nueva nota
  const [mensaje, setMensaje] = useState('')
  const [areaId, setAreaId] = useState('')
  const [turno, setTurno] = useState('Matutino')

  const isAdmin = userProfile?.rol === 'Administrador'

  const fetchDatos = useCallback(async () => {
    setLoading(true)
    setError('')

    const [{ data: n, error: en }, { data: a, error: ea }] = await Promise.all([
      supabase
        .from('bitacora_turnos')
        .select(`
          *,
          usuario:usuarios(nombre_completo),
          area:areas_trabajo(nombre)
        `)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase.from('areas_trabajo').select('id, nombre').order('nombre'),
    ])

    if (en || ea) {
      setError(mensajeDeError(en || ea, 'No se pudieron cargar las notas de la bitácora.'))
    } else {
      setNotas(n || [])
      setAreas(a || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDatos()
  }, [fetchDatos])

  async function handleCrearNota(e) {
    e.preventDefault()
    setError('')
    setExito('')

    const err = validarNotaTurno({ mensaje, turno })
    if (err) {
      setError(err)
      return
    }

    setSubmitting(true)

    const payload = {
      usuario_id: userProfile?.id || null,
      area_trabajo_id: areaId || null,
      turno,
      mensaje: mensaje.trim(),
    }

    const { error: insertErr } = await supabase.from('bitacora_turnos').insert(payload)

    if (insertErr) {
      setError(mensajeDeError(insertErr, 'No se pudo guardar la nota en la bitácora.'))
    } else {
      setMensaje('')
      setExito('Novedad de turno registrada con éxito.')
      await fetchDatos()
    }
    setSubmitting(false)
  }

  async function handleEliminarNota(notaId) {
    if (!window.confirm('¿Deseas eliminar esta nota de la bitácora?')) return

    const { error: delErr } = await supabase
      .from('bitacora_turnos')
      .delete()
      .eq('id', notaId)

    if (delErr) {
      setError(mensajeDeError(delErr, 'No se pudo eliminar la nota.'))
    } else {
      fetchDatos()
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-bitacora"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h3
              id="titulo-bitacora"
              className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
            >
              <span>📝</span>
              <span>Bitácora y Entrega de Turno</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Novedades operativas, insumos faltantes y notas para el siguiente turno.
            </p>
          </div>
          <button
            type="button"
            onClick={onDone}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold"
            aria-label="Cerrar bitácora"
          >
            ✕
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
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

          {/* Formulario para dejar novedad */}
          <form
            onSubmit={handleCrearNota}
            className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3"
          >
            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
              + Registrar novedad o entrega de turno
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Área
                </label>
                <select
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="w-full min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- General (Toda el área) --</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Turno
                </label>
                <select
                  value={turno}
                  onChange={(e) => setTurno(e.target.value)}
                  className="w-full min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Matutino">Turno Matutino</option>
                  <option value="Vespertino">Turno Vespertino</option>
                  <option value="Nocturno">Turno Nocturno</option>
                  <option value="General">General / Todo el día</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mensaje o novedad *
              </label>
              <textarea
                rows={2}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Ej. Quedó lista la carne descongelada para el almuerzo de mañana; se terminaron las bolsas de basura en cocina."
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !mensaje.trim()}
                className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-xs"
              >
                {submitting ? 'Guardando...' : 'Publicar en bitácora'}
              </button>
            </div>
          </form>

          {/* Historial de notas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
              Novedades registradas recientemente ({notas.length})
            </h4>

            {loading ? (
              <div className="text-center py-6 text-xs text-gray-400">Cargando notas...</div>
            ) : notas.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                No hay notas en la bitácora todavía. ¡Sé el primero en dejar una!
              </p>
            ) : (
              <div className="space-y-2.5">
                {notas.map((n) => {
                  const puedeBorrar = isAdmin || n.usuario_id === userProfile?.id
                  const fechaFormateada = new Date(n.created_at).toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <div
                      key={n.id}
                      className="p-3.5 bg-white dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 text-xs space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 dark:text-gray-100">
                            {n.usuario?.nombre_completo || 'Voluntario'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-semibold text-xs">
                            {n.turno}
                          </span>
                          {n.area && (
                            <span className="text-gray-500 dark:text-gray-400">
                              📍 {n.area.nombre}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-gray-400 dark:text-gray-400 text-xs">
                            {fechaFormateada}
                          </span>
                          {puedeBorrar && (
                            <button
                              type="button"
                              onClick={() => handleEliminarNota(n.id)}
                              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-gray-400 hover:text-red-600 dark:hover:text-red-400 text-sm"
                              title="Eliminar nota"
                              aria-label="Eliminar nota de bitácora"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {n.mensaje}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
