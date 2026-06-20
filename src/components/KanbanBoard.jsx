import { useState, useEffect, useRef, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../supabaseClient'

const COLUMNS = [
  {
    id: 'Pendiente',
    label: 'Pendiente',
    headerStyle: 'bg-yellow-100 text-yellow-700',
    borderStyle: 'border-yellow-300',
    overStyle: 'bg-yellow-50',
  },
  {
    id: 'En curso',
    label: 'En curso',
    headerStyle: 'bg-blue-100 text-blue-700',
    borderStyle: 'border-blue-300',
    overStyle: 'bg-blue-50',
  },
  {
    id: 'Hecho',
    label: 'Hecho',
    headerStyle: 'bg-green-100 text-green-700',
    borderStyle: 'border-green-300',
    overStyle: 'bg-green-50',
  },
]

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

// Contenido de la tarjeta reutilizado por DraggableCard y DragOverlay
function CardContent({ task }) {
  const isOverdue =
    task.fecha_limite && task.estado !== 'Hecho' && new Date(task.fecha_limite) < new Date()

  return (
    <>
      <p className="text-sm font-semibold text-gray-900 leading-snug">{task.nombre}</p>
      {task.detalles && (
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.detalles}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
        {task.categoria && <span>🏷 {task.categoria.nombre}</span>}
        {task.area && <span>📍 {task.area.nombre}</span>}
        {task.fecha_limite && (
          <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
            {isOverdue ? '⚠️' : '⏰'} {formatDate(task.fecha_limite)}
          </span>
        )}
        {task.foto_requerida && !task.evidencia_url && (
          <span className="text-orange-500">📷 foto requerida</span>
        )}
        {task.evidencia_url && (
          <a
            href={task.evidencia_url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-500 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            📷 ver foto
          </a>
        )}
      </div>
    </>
  )
}

function DraggableCard({ task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white rounded-lg border border-gray-200 p-3 shadow-sm select-none
        cursor-grab active:cursor-grabbing transition-shadow
        ${isDragging ? 'opacity-30' : 'hover:shadow-md hover:border-gray-300'}`}
    >
      <CardContent task={task} />
    </div>
  )
}

function KanbanColumn({ column, tasks }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex-1 min-w-[220px] flex flex-col">
      {/* Encabezado de columna */}
      <div className={`flex items-center justify-between mb-3 px-3 py-2 rounded-lg ${column.headerStyle}`}>
        <span className="text-sm font-semibold">{column.label}</span>
        <span className="text-xs bg-white bg-opacity-60 px-2 py-0.5 rounded-full font-medium">
          {tasks.length}
        </span>
      </div>

      {/* Zona de drop */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl border-2 border-dashed p-2 space-y-2 min-h-[300px] transition-colors
          ${column.borderStyle} ${isOver ? column.overStyle : 'bg-gray-50/60'}`}
      >
        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-28 text-xs text-gray-400">
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
    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const path = `${task.id}/${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('evidencias').upload(path, file)

    if (uploadErr) {
      setError('Error al subir foto: ' + uploadErr.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(path)
    const { error: updateErr } = await supabase
      .from('tareas')
      .update({ estado: 'Hecho', evidencia_url: publicUrl })
      .eq('id', task.id)

    if (updateErr) {
      setError(updateErr.message)
      setUploading(false)
      return
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-semibold text-gray-900 mb-1">📷 Foto de evidencia requerida</h3>
        <p className="text-sm text-gray-500 mb-4">
          Para mover{' '}
          <span className="font-medium text-gray-700">"{task.nombre}"</span>{' '}
          a Hecho necesitas subir una foto como evidencia.
        </p>
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <input type="file" accept="image/*" ref={fileRef} onChange={handleFile} className="hidden" />
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
            className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function KanbanBoard({ userProfile }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState(null)
  const [photoTask, setPhotoTask] = useState(null)

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tareas')
      .select(`
        *,
        categoria:categorias(nombre),
        area:areas_trabajo(nombre)
      `)
      .order('fecha_creacion', { ascending: false })
    if (!error) setTasks(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // Actualización en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('kanban-tareas')
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

    // Si requiere foto para marcar como Hecho, abrir modal
    if (newEstado === 'Hecho' && task.foto_requerida && !task.evidencia_url) {
      setPhotoTask(task)
      return
    }

    // Actualización optimista para respuesta inmediata
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, estado: newEstado } : t))
    )
    await supabase.from('tareas').update({ estado: newEstado }).eq('id', task.id)
  }

  async function handlePhotoSuccess() {
    setPhotoTask(null)
    await fetchTasks()
  }

  const tasksByEstado = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter((t) => t.estado === col.id)
    return acc
  }, {})

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando tareas...</div>
  }

  if (tasks.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Mis Tareas</h2>
        <div className="text-center py-16 text-gray-400">No tienes tareas asignadas aún.</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Mis Tareas</h2>
        <span className="text-xs text-gray-400 hidden sm:block">
          Arrastra las tarjetas para cambiar el estado
        </span>
      </div>

      {/* overflow-x-auto para pantallas pequeñas */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-[480px]">
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {COLUMNS.map((col) => (
              <KanbanColumn key={col.id} column={col} tasks={tasksByEstado[col.id]} />
            ))}

            <DragOverlay dropAnimation={null}>
              {activeTask ? (
                <div className="bg-white rounded-lg border border-blue-300 p-3 shadow-2xl rotate-1 cursor-grabbing w-64">
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
