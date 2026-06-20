import { useState, useRef } from 'react'
import { supabase } from '../supabaseClient'

const ESTADO_STYLE = {
  Pendiente: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
  'En curso': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  Hecho: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
}

const NEXT_STATUS = { Pendiente: 'En curso', 'En curso': 'Hecho', Hecho: null }
const PREV_STATUS = { Pendiente: null, 'En curso': 'Pendiente', Hecho: 'En curso' }

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TaskCard({ task, userProfile, onRefresh, onEdit }) {
  const [uploading, setUploading] = useState(false)
  const [awaitingPhoto, setAwaitingPhoto] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const isAdmin = userProfile.rol === 'Administrador'
  const isGestor = userProfile.rol === 'Gestor'
  const canEdit = isAdmin || isGestor
  const canDelete = isAdmin
  const canChangeStatus = canEdit || task.asignado_id === userProfile.id
  const isOverdue = task.fecha_limite && task.estado !== 'Hecho' && new Date(task.fecha_limite) < new Date()

  const nextStatus = NEXT_STATUS[task.estado]
  const prevStatus = PREV_STATUS[task.estado]

  async function applyStatus(newStatus) {
    setError('')
    if (newStatus === 'Hecho' && task.foto_requerida && !task.evidencia_url) {
      setAwaitingPhoto(true)
      return
    }
    const { error } = await supabase.from('tareas').update({ estado: newStatus }).eq('id', task.id)
    if (error) setError(error.message)
    else onRefresh()
  }

  async function handlePhotoUpload(e) {
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
    if (updateErr) setError(updateErr.message)
    else { setAwaitingPhoto(false); onRefresh() }
    setUploading(false)
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar esta tarea?')) return
    const { error } = await supabase.from('tareas').delete().eq('id', task.id)
    if (error) setError(error.message)
    else onRefresh()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm dark:hover:shadow-gray-900 transition-shadow">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ESTADO_STYLE[task.estado]}`}>
              {task.estado}
            </span>
            {task.foto_requerida && (
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">📷 Foto requerida</span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mt-1.5 leading-snug">{task.nombre}</h3>
          {task.detalles && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{task.detalles}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 shrink-0">
          {canEdit && (
            <button
              onClick={() => onEdit(task)}
              className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
            >
              Editar
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="text-xs px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        {task.asignado && <span>👤 {task.asignado.nombre_completo}</span>}
        {task.categoria && <span>🏷 {task.categoria.nombre}</span>}
        {task.area && <span>📍 {task.area.nombre}</span>}
        <span>📅 {formatDate(task.fecha_creacion)}</span>
        {task.fecha_hecho && <span>✅ Hecho: {formatDate(task.fecha_hecho)}</span>}
        {task.fecha_limite && (
          <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
            {isOverdue ? '⚠️ Vencida:' : '⏰ Límite:'} {formatDate(task.fecha_limite)}
          </span>
        )}
      </div>

      {/* Evidencia foto */}
      {task.evidencia_url && (
        <div className="mt-3">
          <a href={task.evidencia_url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
            📷 Ver evidencia
          </a>
        </div>
      )}

      {/* Status change buttons */}
      {canChangeStatus && task.estado !== 'Hecho' && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {prevStatus && (
            <button
              onClick={() => applyStatus(prevStatus)}
              className="text-xs px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              ← {prevStatus}
            </button>
          )}
          {nextStatus && (
            <button
              onClick={() => applyStatus(nextStatus)}
              className="text-xs px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              Mover a {nextStatus} →
            </button>
          )}
        </div>
      )}

      {/* Admin/Gestor: reopen from Hecho */}
      {canEdit && task.estado === 'Hecho' && (
        <div className="mt-3">
          <button
            onClick={() => applyStatus('En curso')}
            className="text-xs px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            ↩ Reabrir tarea
          </button>
        </div>
      )}

      {/* Photo upload prompt */}
      {awaitingPhoto && (
        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
          <p className="text-sm text-orange-700 dark:text-orange-300 font-medium mb-2">
            Se requiere foto de evidencia para marcar como Hecho.
          </p>
          <input type="file" accept="image/*" ref={fileRef} onChange={handlePhotoUpload} className="hidden" />
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current.click()}
              disabled={uploading}
              className="text-sm px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {uploading ? 'Subiendo...' : '📷 Subir foto'}
            </button>
            <button
              onClick={() => setAwaitingPhoto(false)}
              className="text-sm px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
