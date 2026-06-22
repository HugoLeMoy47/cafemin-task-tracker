import { useState, useEffect, useRef, useCallback, useId } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../supabaseClient'
import { validateImageFile } from '../utils/validation'

const COLUMNS = [
  {
    id: 'Pendiente',
    label: 'Pendiente',
    headerStyle: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    borderStyle: 'border-yellow-300 dark:border-yellow-700',
    overStyle: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  {
    id: 'En curso',
    label: 'En curso',
    headerStyle: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    borderStyle: 'border-blue-300 dark:border-blue-700',
    overStyle: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    id: 'Hecho',
    label: 'Hecho',
    headerStyle: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    borderStyle: 'border-green-300 dark:border-green-700',
    overStyle: 'bg-green-50 dark:bg-green-900/20',
  },
]

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function CardContent({ task }) {
  const isOverdue =
    task.fecha_limite && task.estado !== 'Hecho' && new Date(task.fecha_limite) < new Date()

  return (
    <>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{task.nombre}</p>
      {task.detalles && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">{task.detalles}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
        {task.categoria && <span>🏷 {task.categoria.nombre}</span>}
        {task.area && <span>📍 {task.area.nombre}</span>}
        {task.fecha_limite && (
          <span className={isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
            {isOverdue ? '⚠️' : '⏰'} {formatDate(task.fecha_limite)}
          </span>
        )}
        {task.foto_requerida && !task.evidencia_url && (
          <span className="text-orange-500 dark:text-orange-400">📷 foto requerida</span>
        )}
        {task.evidencia_url && (
          <a
            href={task.evidencia_url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-500 dark:text-blue-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            📷 ver foto
          </a>
        )}
      </div>
    </>
  )
}

function DraggableCard({ task, isAdmin, isGestor, onEdit, onDelete, onReopen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  const isPrivileged = isAdmin || isGestor

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isPrivileged ? { ...listeners, ...attributes } : {})}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm select-none
        transition-shadow
        ${!isPrivileged ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isDragging ? 'opacity-30' : 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'}`}
    >
      {isPrivileged && (
        <div className="flex items-center justify-between mb-2">
          <div
            {...listeners}
            {...attributes}
            className="text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing px-0.5 text-base leading-none"
            title="Arrastrar para mover"
          >
            ⠿⠿
          </div>
          <div className="flex gap-1">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onEdit(task)}
              className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
            >
              Editar
            </button>
            {isAdmin && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onDelete(task)}
                className="text-xs px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      )}

      <CardContent task={task} />

      {isPrivileged && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>{task.asignado ? `👤 ${task.asignado.nombre_completo}` : ''}</span>
          {task.estado === 'Hecho' && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onReopen(task)}
              className="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              ↩ Reabrir
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function KanbanColumn({ column, tasks, isAdmin, isGestor, onEdit, onDelete, onReopen }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex-1 min-w-[220px] flex flex-col">
      <div className={`flex items-center justify-between mb-3 px-3 py-2 rounded-lg ${column.headerStyle}`}>
        <span className="text-sm font-semibold">{column.label}</span>
        <span className="text-xs bg-white dark:bg-gray-900 bg-opacity-60 px-2 py-0.5 rounded-full font-medium">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl border-2 border-dashed p-2 space-y-2 min-h-[300px] transition-colors
          ${column.borderStyle} ${isOver ? column.overStyle : 'bg-gray-50/60 dark:bg-gray-900/30'}`}
      >
        {tasks.map((task) => (
          <DraggableCard
            key={task.id}
            task={task}
            isAdmin={isAdmin}
            isGestor={isGestor}
            onEdit={onEdit}
            onDelete={onDelete}
            onReopen={onReopen}
          />
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-28 text-xs text-gray-400 dark:text-gray-600">
            Arrastra aquí
          </div>
        )}
      </div>
    </div>
  )
}

function PhotoModal({ task, onSuccess, onCancel }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const fileError = validateImageFile(file)
    if (fileError) { setError(fileError); return }
    setUploading(true)
    setError('')
    const ext = file.name.split('.').pop()
    const path = `${task.id}/${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('evidencias').upload(path, file)
    if (uploadErr) { setError('Error al subir foto: ' + uploadErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(path)
    const { error: updateErr } = await supabase
      .from('tareas')
      .update({ estado: 'Hecho', evidencia_url: publicUrl })
      .eq('id', task.id)
    if (updateErr) { setError(updateErr.message); setUploading(false); return }
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">📷 Foto de evidencia requerida</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Para mover <span className="font-medium text-gray-700 dark:text-gray-200">"{task.nombre}"</span> a Hecho necesitas subir una foto.
        </p>
        {error && <p className="text-xs text-red-600 dark:text-red-400 mb-3">{error}</p>}
        <input type="file" accept="image/jpeg,image/png,image/webp" ref={fileRef} onChange={handleFile} className="hidden" />
        <div className="flex gap-3">
          <button
            onClick={() => fileRef.current.click()}
            disabled={uploading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading ? 'Subiendo...' : 'Subir foto'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function KanbanBoard({ userProfile, onEdit, onNew }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState(null)
  const [photoTask, setPhotoTask] = useState(null)
  const [dragError, setDragError] = useState('')

  const isAdmin = userProfile?.rol === 'Administrador'
  const isGestor = userProfile?.rol === 'Gestor'
  const isPrivileged = isAdmin || isGestor
  const instanceId = useId()

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tareas')
      .select(`
        *,
        asignado:usuarios!asignado_id(id, nombre_completo),
        categoria:categorias(nombre),
        area:areas_trabajo(nombre)
      `)
      .order('fecha_creacion', { ascending: false })
    if (error) {
      setDragError('No se pudieron cargar las tareas. Verifica tu conexión.')
    } else {
      setTasks(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  useEffect(() => {
    const channel = supabase
      .channel(`kanban-tareas-${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas' }, fetchTasks)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchTasks])

  function handleDragStart({ active }) {
    setActiveTask(tasks.find((t) => t.id === active.id) || null)
  }

  async function handleDragEnd({ active, over }) {
    setActiveTask(null)
    if (!over) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.estado === over.id) return
    const newEstado = over.id

    // Asignado cannot reopen completed tasks via drag
    if (!isPrivileged && task.estado === 'Hecho') return

    if (newEstado === 'Hecho' && task.foto_requerida && !task.evidencia_url && !isPrivileged) {
      setPhotoTask(task)
      return
    }

    const previousTasks = tasks
    setDragError('')
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, estado: newEstado } : t)))
    const { error } = await supabase.from('tareas').update({ estado: newEstado }).eq('id', task.id)
    if (error) {
      setTasks(previousTasks)
      setDragError('No se pudo actualizar el estado. Intenta de nuevo.')
    }
  }

  async function handlePhotoSuccess() {
    setPhotoTask(null)
    await fetchTasks()
  }

  async function handleDelete(task) {
    if (!window.confirm(`¿Eliminar la tarea "${task.nombre}"?`)) return
    const { error } = await supabase.from('tareas').delete().eq('id', task.id)
    if (error) setDragError(error.message)
    else fetchTasks()
  }

  async function handleReopen(task) {
    const { error } = await supabase.from('tareas').update({ estado: 'En curso' }).eq('id', task.id)
    if (error) setDragError(error.message)
    else fetchTasks()
  }

  const tasksByEstado = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter((t) => t.estado === col.id)
    return acc
  }, {})

  if (loading) {
    return <div className="text-center py-12 text-gray-400 dark:text-gray-500">Cargando tareas...</div>
  }

  if (tasks.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {isPrivileged ? 'Todas las Tareas' : 'Mis Tareas'}
          </h2>
          {isPrivileged && onNew && (
            <button
              onClick={onNew}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Nueva tarea
            </button>
          )}
        </div>
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          {isPrivileged ? 'No hay tareas aún.' : 'No tienes tareas asignadas aún.'}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {isPrivileged ? 'Todas las Tareas' : 'Mis Tareas'}
        </h2>
        <div className="flex items-center gap-3">
          {isPrivileged && onNew && (
            <button
              onClick={onNew}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Nueva tarea
            </button>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
            Arrastra las tarjetas para cambiar el estado
          </span>
        </div>
      </div>

      {dragError && (
        <div className="mb-4 px-4 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {dragError}
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-[480px]">
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={tasksByEstado[col.id]}
                isAdmin={isAdmin}
                isGestor={isGestor}
                onEdit={onEdit}
                onDelete={handleDelete}
                onReopen={handleReopen}
              />
            ))}

            <DragOverlay dropAnimation={null}>
              {activeTask ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-300 dark:border-blue-600 p-3 shadow-2xl rotate-1 cursor-grabbing w-64">
                  <CardContent task={activeTask} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {photoTask && (
        <PhotoModal
          task={photoTask}
          onSuccess={handlePhotoSuccess}
          onCancel={() => setPhotoTask(null)}
        />
      )}
    </div>
  )
}
