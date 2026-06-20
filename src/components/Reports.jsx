import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const TABS = ['Por Estado', 'Por Asignado', 'Por Fecha']

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ESTADO_STYLE = {
  Pendiente: 'bg-yellow-100 text-yellow-700',
  'En curso': 'bg-blue-100 text-blue-700',
  Hecho: 'bg-green-100 text-green-700',
}

export default function Reports({ userProfile }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Por Estado')

  useEffect(() => {
    async function fetchAll() {
      const { data } = await supabase
        .from('tareas')
        .select(`
          *,
          asignado:usuarios!asignado_id(nombre_completo),
          categoria:categorias(nombre),
          area:areas_trabajo(nombre)
        `)
        .order('fecha_creacion', { ascending: false })
      setTasks(data || [])
      setLoading(false)
    }
    fetchAll()
  }, [])

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando reportes...</div>

  // Group by estado
  const byEstado = ['Pendiente', 'En curso', 'Hecho'].map((estado) => ({
    estado,
    tasks: tasks.filter((t) => t.estado === estado),
  }))

  // Group by asignado
  const byAsignado = Object.values(
    tasks.reduce((acc, t) => {
      const key = t.asignado?.nombre_completo || 'Sin asignar'
      if (!acc[key]) acc[key] = { nombre: key, tasks: [] }
      acc[key].tasks.push(t)
      return acc
    }, {})
  ).sort((a, b) => a.nombre.localeCompare(b.nombre))

  // By fecha (already sorted)
  const byFecha = [...tasks]

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-5">Reportes</h2>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Por Estado */}
      {tab === 'Por Estado' && (
        <div className="space-y-5">
          {byEstado.map(({ estado, tasks: group }) => (
            <div key={estado}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ESTADO_STYLE[estado]}`}>
                  {estado}
                </span>
                <span className="text-sm text-gray-500">{group.length} tarea{group.length !== 1 ? 's' : ''}</span>
              </div>
              {group.length === 0 ? (
                <p className="text-sm text-gray-400 pl-2">Sin tareas.</p>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs text-gray-500">Tarea</th>
                        <th className="text-left px-4 py-2.5 text-xs text-gray-500">Asignado</th>
                        <th className="text-left px-4 py-2.5 text-xs text-gray-500">Categoría</th>
                        <th className="text-left px-4 py-2.5 text-xs text-gray-500">Creada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {group.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{t.nombre}</td>
                          <td className="px-4 py-2.5 text-gray-500">{t.asignado?.nombre_completo || '—'}</td>
                          <td className="px-4 py-2.5 text-gray-500">{t.categoria?.nombre || '—'}</td>
                          <td className="px-4 py-2.5 text-gray-500">{formatDate(t.fecha_creacion)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Por Asignado */}
      {tab === 'Por Asignado' && (
        <div className="space-y-5">
          {byAsignado.map(({ nombre, tasks: group }) => (
            <div key={nombre}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-700">👤 {nombre}</span>
                <span className="text-sm text-gray-500">({group.length})</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs text-gray-500">Tarea</th>
                      <th className="text-left px-4 py-2.5 text-xs text-gray-500">Estado</th>
                      <th className="text-left px-4 py-2.5 text-xs text-gray-500">Área</th>
                      <th className="text-left px-4 py-2.5 text-xs text-gray-500">Fecha hecho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {group.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{t.nombre}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_STYLE[t.estado]}`}>
                            {t.estado}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{t.area?.nombre || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">{formatDate(t.fecha_hecho)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Por Fecha */}
      {tab === 'Por Fecha' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-gray-500">Tarea</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500">Estado</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500">Asignado</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500">Creada</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500">Límite</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500">Hecho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {byFecha.map((t) => {
                const overdue = t.fecha_limite && t.estado !== 'Hecho' && new Date(t.fecha_limite) < new Date()
                return (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{t.nombre}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_STYLE[t.estado]}`}>
                      {t.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{t.asignado?.nombre_completo || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{formatDate(t.fecha_creacion)}</td>
                  <td className={`px-4 py-2.5 ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    {t.fecha_limite ? formatDate(t.fecha_limite) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{formatDate(t.fecha_hecho)}</td>
                </tr>
                )
              })}
            </tbody>
          </table>
          {byFecha.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">Sin tareas.</div>
          )}
        </div>
      )}
    </div>
  )
}
