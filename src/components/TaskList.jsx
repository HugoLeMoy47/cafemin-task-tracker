import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import TaskCard from './TaskCard'

const ESTADOS = ['Todos', 'Pendiente', 'En curso', 'Hecho']
const PAGE_SIZE = 20

const ESTADO_COUNT_STYLE = {
  Pendiente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'En curso': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Hecho: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

export default function TaskList({ userProfile, onEdit, onNew }) {
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('Todos')
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const canCreate = ['Administrador', 'Gestor'].includes(userProfile.rol)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tareas')
      .select(`
        *,
        asignado:usuarios!asignado_id(id, nombre_completo, rol),
        categoria:categorias(nombre),
        area:areas_trabajo(nombre)
      `)
      .order('fecha_creacion', { ascending: false })

    if (!error) setTasks(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  useEffect(() => {
    const channel = supabase
      .channel('tareas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas' }, () => {
        fetchTasks()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchTasks])

  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [filter])

  const filtered = filter === 'Todos' ? tasks : tasks.filter((t) => t.estado === filter)
  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount

  const counts = tasks.reduce((acc, t) => {
    acc[t.estado] = (acc[t.estado] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {userProfile.rol === 'Asignado' ? 'Mis Tareas' : 'Todas las Tareas'}
        </h2>
        {canCreate && (
          <button
            onClick={onNew}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Nueva tarea
          </button>
        )}
      </div>

      {/* Summary badges */}
      {tasks.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.entries(counts).map(([estado, count]) => (
            <span
              key={estado}
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${ESTADO_COUNT_STYLE[estado]}`}
            >
              {estado}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Filter tabs — scroll horizontal en móvil */}
      <div className="overflow-x-auto -mx-1 px-1 mb-5">
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 min-w-max">
          {ESTADOS.map((e) => (
            <button
              key={e}
              onClick={() => setFilter(e)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                filter === e
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">Cargando tareas...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          {filter === 'Todos' ? 'No hay tareas aún.' : `No hay tareas en estado "${filter}".`}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {visible.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                userProfile={userProfile}
                onRefresh={fetchTasks}
                onEdit={() => onEdit(task)}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-5 text-center">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="px-5 py-2 text-sm text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                Cargar más ({filtered.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
