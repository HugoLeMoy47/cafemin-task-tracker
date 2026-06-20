import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const TABS = ['Por Estado', 'Por Asignado', 'Por Fecha']

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ESTADO_STYLE = {
  Pendiente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'En curso': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Hecho: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

const thClass = 'text-left px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400'
const tdBase = 'px-4 py-2.5'

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

  if (loading) return <div className="text-center py-12 text-gray-400 dark:text-gray-500">Cargando reportes...</div>

  const byEstado = ['Pendiente', 'En curso', 'Hecho'].map((estado) => ({
    estado,
    tasks: tasks.filter((t) => t.estado === estado),
  }))

  const byAsignado = Object.values(
    tasks.reduce((acc, t) => {
      const key = t.asignado?.nombre_completo || 'Sin asignar'
      if (!acc[key]) acc[key] = { nombre: key, tasks: [] }
      acc[key].tasks.push(t)
      return acc
    }, {})
  ).sort((a, b) => a.nombre.localeCompare(b.nombre))

  const byFecha = [...tasks]

  const tableWrap = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'
  const tableClass = 'w-full text-sm min-w-[480px]'
  const theadClass = 'bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700'
  const tbodyClass = 'divide-y divide-gray-50 dark:divide-gray-700'
  const trClass = 'hover:bg-gray-50 dark:hover:bg-gray-700/30'

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-5">Reportes</h2>

      {/* Tab bar — scroll horizontal en móvil */}
      <div className="overflow-x-auto -mx-1 px-1 mb-5">
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 min-w-max">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === t
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Por Estado */}
      {tab === 'Por Estado' && (
        <div className="space-y-5">
          {byEstado.map(({ estado, tasks: group }) => (
            <div key={estado}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ESTADO_STYLE[estado]}`}>{estado}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{group.length} tarea{group.length !== 1 ? 's' : ''}</span>
              </div>
              {group.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 pl-2">Sin tareas.</p>
              ) : (
                <div className={tableWrap}>
                  <div className="overflow-x-auto">
                    <table className={tableClass}>
                      <thead className={theadClass}>
                        <tr>
                          <th className={thClass}>Tarea</th>
                          <th className={thClass}>Asignado</th>
                          <th className={thClass}>Categoría</th>
                          <th className={thClass}>Creada</th>
                        </tr>
                      </thead>
                      <tbody className={tbodyClass}>
                        {group.map((t) => (
                          <tr key={t.id} className={trClass}>
                            <td className={`${tdBase} font-medium text-gray-800 dark:text-gray-100`}>{t.nombre}</td>
                            <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{t.asignado?.nombre_completo || '—'}</td>
                            <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{t.categoria?.nombre || '—'}</td>
                            <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{formatDate(t.fecha_creacion)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">👤 {nombre}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">({group.length})</span>
              </div>
              <div className={tableWrap}>
                <div className="overflow-x-auto">
                  <table className={tableClass}>
                    <thead className={theadClass}>
                      <tr>
                        <th className={thClass}>Tarea</th>
                        <th className={thClass}>Estado</th>
                        <th className={thClass}>Área</th>
                        <th className={thClass}>Fecha hecho</th>
                      </tr>
                    </thead>
                    <tbody className={tbodyClass}>
                      {group.map((t) => (
                        <tr key={t.id} className={trClass}>
                          <td className={`${tdBase} font-medium text-gray-800 dark:text-gray-100`}>{t.nombre}</td>
                          <td className={tdBase}>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_STYLE[t.estado]}`}>{t.estado}</span>
                          </td>
                          <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{t.area?.nombre || '—'}</td>
                          <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{formatDate(t.fecha_hecho)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Por Fecha */}
      {tab === 'Por Fecha' && (
        <div className={tableWrap}>
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>Tarea</th>
                  <th className={thClass}>Estado</th>
                  <th className={thClass}>Asignado</th>
                  <th className={thClass}>Creada</th>
                  <th className={thClass}>Límite</th>
                  <th className={thClass}>Hecho</th>
                </tr>
              </thead>
              <tbody className={tbodyClass}>
                {byFecha.map((t) => {
                  const overdue = t.fecha_limite && t.estado !== 'Hecho' && new Date(t.fecha_limite) < new Date()
                  return (
                    <tr key={t.id} className={trClass}>
                      <td className={`${tdBase} font-medium text-gray-800 dark:text-gray-100`}>{t.nombre}</td>
                      <td className={tdBase}>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_STYLE[t.estado]}`}>{t.estado}</span>
                      </td>
                      <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{t.asignado?.nombre_completo || '—'}</td>
                      <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{formatDate(t.fecha_creacion)}</td>
                      <td className={`${tdBase} ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                        {t.fecha_limite ? formatDate(t.fecha_limite) : '—'}
                      </td>
                      <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{formatDate(t.fecha_hecho)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {byFecha.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">Sin tareas.</div>
          )}
        </div>
      )}
    </div>
  )
}
