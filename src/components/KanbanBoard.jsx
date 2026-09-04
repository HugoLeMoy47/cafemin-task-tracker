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
import { buildEvidencePath } from '../lib/evidencias'
import { puedeMover } from '../lib/flujoTareas'
import { usePantallaChica } from '../hooks/usePantallaChica'
import ListaMovil from './ListaMovil'
import EvidenceLink from './EvidenceLink'
import ProgresoVoluntario from './ProgresoVoluntario'
import CelebracionVictoria from './CelebracionVictoria'
import ModalAsignarPlantilla from './ModalAsignarPlantilla'
import ModalIniciarTurno from './ModalIniciarTurno'
import PoolTareasAbiertas from './PoolTareasAbiertas'
import BitacoraTurno from './BitacoraTurno'
import { mensajeDeError } from '../lib/errores'
import { obtenerMensajeVictoria } from '../lib/gamificacion'

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
  const [expandido, setExpandido] = useState(false)
  const isOverdue =
    task.fecha_limite && task.estado !== 'Hecho' && new Date(task.fecha_limite) < new Date()

  return (
    <>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{task.nombre}</p>
      {task.detalles && (
        <div className="mt-1">
          <p
            className={`text-xs text-gray-600 dark:text-gray-300 ${
              expandido ? 'whitespace-pre-line' : 'line-clamp-2'
            }`}
          >
            {task.detalles}
          </p>
          {task.detalles.length > 60 && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setExpandido((v) => !v)
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium min-h-[32px] inline-flex items-center mt-0.5 focus:outline-none"
            >
              {expandido ? '▲ Ocultar' : '▼ Ver instrucciones'}
            </button>
          )}
        </div>
      )}

      {task.foto_requerida && !task.evidencia_url && (
        <div className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/60 inline-flex items-center gap-1">
          <span aria-hidden="true">📷</span>
          <span>Requiere foto al terminar</span>
        </div>
      )}

      {task.estado === 'En curso' && task.foto_requerida && !task.evidencia_url && (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/90 italic">
          💡 Toma la foto antes de retirarte del área.
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        {task.categoria && <span>🏷 {task.categoria.nombre}</span>}
        {task.area && <span>📍 {task.area.nombre}</span>}
        {task.fecha_limite && (
          <span className={isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
            {isOverdue ? '⚠️' : '⏰'} {formatDate(task.fecha_limite)}
          </span>
        )}
        {task.evidencia_url && (
          <EvidenceLink
            value={task.evidencia_url}
            label="📷 ver foto"
            className="text-blue-500 dark:text-blue-400 hover:underline disabled:opacity-60"
          />
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
    const path = buildEvidencePath(task.id, file.name)
    const { error: uploadErr } = await supabase.storage.from('evidencias').upload(path, file)
    if (uploadErr) { setError(mensajeDeError(uploadErr, 'No se pudo subir la foto. Intenta de nuevo.')); setUploading(false); return }
    // Se guarda la RUTA: el bucket es privado y las URLs firmadas caducan.
    // Store the PATH: the bucket is private and signed URLs expire.
    const { error: updateErr } = await supabase
      .from('tareas')
      .update({ estado: 'Hecho', evidencia_url: path })
      .eq('id', task.id)
    if (updateErr) { setError(mensajeDeError(updateErr, 'No se pudo marcar la tarea como Hecha.')); setUploading(false); return }
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">📷 Foto de evidencia requerida</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Para mover <span className="font-medium text-gray-700 dark:text-gray-200">&ldquo;{task.nombre}&rdquo;</span> a Hecho necesitas subir una foto.
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
  const [moviendo, setMoviendo] = useState(null)
  const [celebracion, setCelebracion] = useState(null)
  const [mostrarAsignarPlantilla, setMostrarAsignarPlantilla] = useState(false)
  const [mostrarIniciarTurno, setMostrarIniciarTurno] = useState(false)
  const [mostrarBitacora, setMostrarBitacora] = useState(false)
  const [toastExito, setToastExito] = useState('')

  /**
   * Columna visible en el teléfono. Arranca SIEMPRE en 'Pendiente', aunque esté
   * vacía: el selector muestra los tres conteos, así que una lista vacía con
   * «En curso 5» al lado se entiende sola. Saltar automáticamente a la primera
   * columna con tareas haría que el sitio donde aterrizas cambie de un día para
   * otro, y para quien lo usa a diario la posición predecible vale más que el
   * atajo.
   * Always starts on 'Pendiente': a predictable landing beats a clever one.
   */
  const [estadoMovil, setEstadoMovil] = useState('Pendiente')
  const esChica = usePantallaChica()

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

  /**
   * El ÚNICO camino por el que una tarea cambia de estado.
   *
   * Lo usan el arrastre del tablero y el botón del teléfono. Tener dos caminos
   * que deciden por su cuenta si un movimiento es válido —y si pide foto— es
   * como se termina con una regla que se aplica en un aparato y no en el otro;
   * y el que se queda atrás siempre es el que menos se prueba.
   *
   * The ONE path a task changes state through, shared by the desktop drag and
   * the phone button. Two paths deciding validity on their own is how a rule
   * ends up applying on one device and not the other.
   */
  async function moverTarea(task, nuevoEstado) {
    if (!puedeMover(task, nuevoEstado, { esPrivilegiado: isPrivileged })) return

    if (nuevoEstado === 'Hecho' && task.foto_requerida && !task.evidencia_url && !isPrivileged) {
      setPhotoTask(task)
      return
    }

    const previousTasks = tasks
    setDragError('')
    setMoviendo(task.id)
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, estado: nuevoEstado } : t)))
    const { error } = await supabase.from('tareas').update({ estado: nuevoEstado }).eq('id', task.id)
    if (error) {
      setTasks(previousTasks)
      setDragError(mensajeDeError(error, 'No se pudo actualizar el estado. Intenta de nuevo.'))
    } else if (nuevoEstado === 'Hecho') {
      const restantes = previousTasks.filter((t) => t.id !== task.id && t.estado !== 'Hecho').length
      setCelebracion({
        tarea: task,
        mensaje: obtenerMensajeVictoria(),
        esUltima: !isPrivileged && restantes === 0,
      })
    }
    setMoviendo(null)
  }

  /**
   * Devolver al pool una tarea que se tomó por error.
   *
   * Va contra la RPC y no contra un `update` directo a propósito: quién puede
   * soltar qué —solo lo propio, solo sin empezar, solo lo que uno mismo tomó y
   * no lo que asignó la coordinación— es una regla de negocio, y en este
   * proyecto esas viven en la base de datos.
   *
   * Goes through the RPC, not a direct update: who may drop what is a business
   * rule, and in this project those live in the database.
   */
  async function soltarTarea(task) {
    const previas = tasks
    setDragError('')
    setMoviendo(task.id)
    // Se quita de la lista de inmediato: dejarla ahí mientras responde el
    // servidor hace dudar de si el toque sirvió, y en un teléfono lento eso
    // se traduce en un segundo toque.
    setTasks((prev) => prev.filter((t) => t.id !== task.id))

    const { error } = await supabase.rpc('soltar_tarea', { p_tarea_id: task.id })
    if (error) {
      setTasks(previas)
      setDragError(mensajeDeError(error, 'No se pudo soltar la tarea. Intenta de nuevo.'))
    }
    setMoviendo(null)
  }

  async function handleDragEnd({ active, over }) {
    setActiveTask(null)
    if (!over) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task) return
    await moverTarea(task, over.id)
  }

  async function handlePhotoSuccess() {
    if (photoTask) {
      const restantes = tasks.filter((t) => t.id !== photoTask.id && t.estado !== 'Hecho').length
      setCelebracion({
        tarea: photoTask,
        mensaje: obtenerMensajeVictoria(),
        esUltima: !isPrivileged && restantes === 0,
      })
    }
    setPhotoTask(null)
    await fetchTasks()
  }

  async function handleDelete(task) {
    if (!window.confirm(`¿Eliminar la tarea "${task.nombre}"?`)) return
    const { error } = await supabase.from('tareas').delete().eq('id', task.id)
    if (error) setDragError(mensajeDeError(error, 'No se pudo eliminar la tarea.'))
    else fetchTasks()
  }

  async function handleReopen(task) {
    const { error } = await supabase.from('tareas').update({ estado: 'En curso' }).eq('id', task.id)
    if (error) setDragError(mensajeDeError(error, 'No se pudo reabrir la tarea.'))
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
          <div className="flex items-center gap-2">
          {isPrivileged && (
            <button
              type="button"
              onClick={() => setMostrarAsignarPlantilla(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5"
              title="Asignar tareas de un perfil predefinido a un voluntario"
            >
              <span>⚡</span>
              <span>Asignar rutina</span>
            </button>
          )}
          {isPrivileged && onNew && (
            <button
              onClick={onNew}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors"
            >
              + Nueva tarea
            </button>
          )}
        </div>
      </div>
        {!isPrivileged ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
            <span className="text-4xl mb-3 inline-block select-none" role="img" aria-label="Descanso">
              ☕
            </span>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              ¡Todo en orden por ahora!
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              No tienes tareas asignadas por el momento. Puedes iniciar una jornada o tomar tareas abiertas disponibles.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setMostrarIniciarTurno(true)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors inline-flex items-center gap-2"
              >
                <span>🚀</span>
                <span>Comenzar mi turno</span>
              </button>
              <button
                type="button"
                onClick={() => setMostrarBitacora(true)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-xs transition-colors inline-flex items-center gap-1.5"
              >
                <span>📝</span>
                <span>Bitácora de novedades</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            No hay tareas aún.
          </div>
        )}

        {!isPrivileged && (
          <div className="mt-6">
            <PoolTareasAbiertas onTareaTomada={fetchTasks} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {isPrivileged ? 'Todas las Tareas' : 'Mis Tareas'}
        </h2>
        <div className="flex items-center gap-2 sm:gap-3">
          {isPrivileged ? (
            <>
              <button
                type="button"
                onClick={() => setMostrarAsignarPlantilla(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5"
                title="Asignar tareas de un perfil predefinido a un voluntario"
              >
                <span>⚡</span>
                <span>Asignar rutina</span>
              </button>
              {onNew && (
                <button
                  onClick={onNew}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors"
                >
                  + Nueva tarea
                </button>
              )}
              <button
                type="button"
                onClick={() => setMostrarBitacora(true)}
                /* En teléfono se esconde la palabra y queda solo el icono: sin
                   `min-w-[44px]` el blanco medía 41 px de ancho. Y sin
                   `aria-label` el botón se anuncia como «📝». */
                className="border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium px-3 min-h-[44px] min-w-[44px] justify-center rounded-lg transition-colors inline-flex items-center gap-1.5"
                title="Ver y registrar notas de entrega de turno"
                aria-label="Bitácora de turno"
              >
                <span aria-hidden="true">📝</span>
                <span className="hidden sm:inline">Bitácora</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMostrarIniciarTurno(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-3 min-h-[44px] rounded-lg transition-colors inline-flex items-center gap-1.5"
                title="Comenzar jornada seleccionando un perfil de tareas"
              >
                <span>🚀</span>
                <span>Iniciar turno</span>
              </button>
              <button
                type="button"
                onClick={() => setMostrarBitacora(true)}
                /* En teléfono se esconde la palabra y queda solo el icono: sin
                   `min-w-[44px]` el blanco medía 41 px de ancho. Y sin
                   `aria-label` el botón se anuncia como «📝». */
                className="border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium px-3 min-h-[44px] min-w-[44px] justify-center rounded-lg transition-colors inline-flex items-center gap-1.5"
                title="Ver y registrar notas de entrega de turno"
                aria-label="Bitácora de turno"
              >
                <span aria-hidden="true">📝</span>
                <span className="hidden sm:inline">Bitácora</span>
              </button>
            </>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
            Arrastra las tarjetas para cambiar el estado
          </span>
        </div>
      </div>

      {!isPrivileged && (
        <>
          <ProgresoVoluntario
            tareas={tasks}
            nombreUsuario={userProfile?.nombre_completo}
          />
          <PoolTareasAbiertas onTareaTomada={fetchTasks} />
        </>
      )}

      {toastExito && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs sm:text-sm flex items-center justify-between gap-2 shadow-xs animate-fade-in">
          <span className="flex items-center gap-2 font-medium">
            <span>✅</span>
            <span>{toastExito}</span>
          </span>
          <button
            type="button"
            onClick={() => setToastExito('')}
            className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline px-2 py-1 font-semibold"
          >
            ✕
          </button>
        </div>
      )}

      {dragError && (
        <div className="mb-4 px-4 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {dragError}
        </div>
      )}

      {/* ── Teléfono: una columna a la vez, avance por botón ──
          Medido: el tablero ocupa 692 px y en un Android de 360 se ven 328,
          con «Hecho» fuera de pantalla. Ninguna zona para soltar cabe entera,
          así que el arrastre no tiene destino. Ver src/components/ListaMovil.jsx.
          Measured: no drop zone fits on a 360 px screen. */}
      {esChica ? (
        <ListaMovil
          tareas={tasksByEstado[estadoMovil]}
          estadoActivo={estadoMovil}
          onCambiarEstado={setEstadoMovil}
          conteos={{
            Pendiente: tasksByEstado.Pendiente.length,
            'En curso': tasksByEstado['En curso'].length,
            Hecho: tasksByEstado.Hecho.length,
          }}
          esPrivilegiado={isPrivileged}
          onAvanzar={(tarea, avance) => moverTarea(tarea, avance.destino)}
          onSoltar={soltarTarea}
          onEditar={onEdit}
          onReabrir={handleReopen}
          ocupada={moviendo}
        />
      ) : (
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
      )}

      {photoTask && (
        <PhotoModal
          task={photoTask}
          onSuccess={handlePhotoSuccess}
          onCancel={() => setPhotoTask(null)}
        />
      )}

      {celebracion && (
        <CelebracionVictoria
          tarea={celebracion.tarea}
          mensaje={celebracion.mensaje}
          esUltima={celebracion.esUltima}
          onCerrar={() => setCelebracion(null)}
          onAbrirBitacora={() => setMostrarBitacora(true)}
        />
      )}

      {mostrarAsignarPlantilla && (
        <ModalAsignarPlantilla
          userProfile={userProfile}
          onDone={() => setMostrarAsignarPlantilla(false)}
          onSuccess={({ conteo, voluntario, perfil }) => {
            setToastExito(`Se asignaron ${conteo} tareas del perfil "${perfil}" a ${voluntario}.`)
            fetchTasks()
          }}
        />
      )}

      {mostrarIniciarTurno && (
        <ModalIniciarTurno
          onDone={() => setMostrarIniciarTurno(false)}
          onSuccess={({ rutina, total }) => {
            setToastExito(`¡Iniciaste tu turno en "${rutina}" con ${total} tareas!`)
            fetchTasks()
          }}
        />
      )}

      {mostrarBitacora && (
        <BitacoraTurno
          userProfile={userProfile}
          onDone={() => setMostrarBitacora(false)}
        />
      )}
    </div>
  )
}
