import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'

const ROLES = ['Administrador', 'Gestor', 'Asignado']

const ROL_STYLE = {
  Administrador: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  Gestor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  Asignado: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

const transientClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const inputClass = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

const EMPTY_FORM = { nombreCompleto: '', correo: '', password: '', rol: 'Asignado' }

export default function UserManagement() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function fetchUsuarios() {
    setLoading(true)
    const { data } = await supabase.from('usuarios').select('*').order('nombre_completo')
    setUsuarios(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchUsuarios() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    setSuccessMsg('')

    const { data, error: signUpError } = await transientClient.auth.signUp({
      email: form.correo.trim(),
      password: form.password,
      options: { data: { nombre_completo: form.nombreCompleto.trim() } },
    })

    if (signUpError) { setCreateError(signUpError.message); setCreating(false); return }

    const userId = data.user?.id
    if (!userId) { setCreateError('No se pudo obtener el ID del nuevo usuario.'); setCreating(false); return }

    if (form.rol !== 'Asignado') {
      const { error: updateError } = await supabase
        .from('usuarios').update({ rol: form.rol }).eq('id', userId)
      if (updateError) {
        setCreateError(`Usuario creado pero no se pudo asignar el rol: ${updateError.message}`)
        setCreating(false)
        fetchUsuarios()
        return
      }
    }

    setSuccessMsg(`Usuario "${form.nombreCompleto.trim()}" creado con rol ${form.rol}. Comparte las credenciales de forma segura.`)
    setForm(EMPTY_FORM)
    setShowForm(false)
    fetchUsuarios()
    setCreating(false)
  }

  async function updateRol(userId, newRol) {
    setUpdatingId(userId)
    setError('')
    const { error } = await supabase.from('usuarios').update({ rol: newRol }).eq('id', userId)
    if (error) setError(error.message)
    else fetchUsuarios()
    setUpdatingId(null)
  }

  async function deleteUser(userId, nombre) {
    if (!window.confirm(`¿Eliminar el perfil de ${nombre}? Esta acción no elimina la cuenta de autenticación.`)) return
    const { error } = await supabase.from('usuarios').delete().eq('id', userId)
    if (error) setError(error.message)
    else fetchUsuarios()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Gestión de Usuarios</h2>
        <button
          onClick={() => { setShowForm((v) => !v); setCreateError(''); setSuccessMsg('') }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Nuevo usuario'}
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Crea usuarios y asígnales un rol, o modifica los roles de usuarios existentes.
      </p>

      {/* Formulario de creación */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5 space-y-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Crear nuevo usuario</h3>
          {createError && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
              {createError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nombre completo *</label>
              <input type="text" required value={form.nombreCompleto}
                onChange={(e) => setForm((f) => ({ ...f, nombreCompleto: e.target.value }))}
                className={inputClass} placeholder="Nombre completo" />
            </div>
            <div>
              <label className={labelClass}>Correo electrónico *</label>
              <input type="email" required value={form.correo}
                onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
                className={inputClass} placeholder="correo@ejemplo.com" />
            </div>
            <div>
              <label className={labelClass}>Contraseña temporal *</label>
              <input type="text" required minLength={6} value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className={inputClass} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className={labelClass}>Rol *</label>
              <select value={form.rol} onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))} className={inputClass}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            El usuario recibirá un correo de confirmación. Comparte la contraseña temporal de forma segura.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50">
              {creating ? 'Creando...' : 'Crear usuario'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setCreateError('') }}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {successMsg && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg mb-4 text-sm flex items-start justify-between gap-3">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="shrink-0 text-green-500 hover:text-green-700 dark:hover:text-green-200">✕</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">Cargando usuarios...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Scroll horizontal en móvil */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Correo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rol</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{u.nombre_completo}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.correo}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.rol}
                        onChange={(e) => updateRol(u.id, e.target.value)}
                        disabled={updatingId === u.id}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${ROL_STYLE[u.rol]}`}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteUser(u.id, u.nombre_completo)}
                        className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {usuarios.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">No hay usuarios registrados.</div>
          )}
        </div>
      )}
    </div>
  )
}
