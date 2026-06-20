import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'

const ROLES = ['Administrador', 'Gestor', 'Asignado']

const ROL_STYLE = {
  Administrador: 'bg-purple-100 text-purple-700',
  Gestor: 'bg-blue-100 text-blue-700',
  Asignado: 'bg-gray-100 text-gray-700',
}

// Cliente sin persistencia de sesión: permite crear usuarios sin reemplazar
// la sesión activa del administrador en localStorage.
const transientClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

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
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .order('nombre_completo')
    setUsuarios(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchUsuarios() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    setSuccessMsg('')

    // 1. Crear el usuario en Supabase Auth con el cliente sin sesión persistente
    const { data, error: signUpError } = await transientClient.auth.signUp({
      email: form.correo.trim(),
      password: form.password,
      options: { data: { nombre_completo: form.nombreCompleto.trim() } },
    })

    if (signUpError) {
      setCreateError(signUpError.message)
      setCreating(false)
      return
    }

    const userId = data.user?.id
    if (!userId) {
      setCreateError('No se pudo obtener el ID del nuevo usuario.')
      setCreating(false)
      return
    }

    // 2. El trigger on_auth_user_created ya creó la fila en public.usuarios con rol 'Asignado'.
    //    Si el rol deseado es diferente, actualizarlo ahora.
    if (form.rol !== 'Asignado') {
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ rol: form.rol })
        .eq('id', userId)

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
    const { error } = await supabase
      .from('usuarios')
      .update({ rol: newRol })
      .eq('id', userId)
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
        <h2 className="text-xl font-semibold text-gray-800">Gestión de Usuarios</h2>
        <button
          onClick={() => { setShowForm((v) => !v); setCreateError(''); setSuccessMsg('') }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Nuevo usuario'}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Crea usuarios y asígnales un rol, o modifica los roles de usuarios existentes.
      </p>

      {/* Formulario de creación */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-gray-200 p-5 mb-5 space-y-4"
        >
          <h3 className="font-semibold text-gray-800">Crear nuevo usuario</h3>

          {createError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {createError}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
              <input
                type="text"
                required
                value={form.nombreCompleto}
                onChange={(e) => setForm((f) => ({ ...f, nombreCompleto: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico *</label>
              <input
                type="email"
                required
                value={form.correo}
                onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña temporal *</label>
              <input
                type="text"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
              <select
                value={form.rol}
                onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            El usuario recibirá un correo de confirmación. Comparte la contraseña temporal de forma segura.
          </p>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {creating ? 'Creando...' : 'Crear usuario'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setCreateError('') }}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Mensaje de éxito */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-start justify-between gap-3">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="shrink-0 text-green-500 hover:text-green-700">✕</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Tabla de usuarios */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando usuarios...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Correo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Rol</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.nombre_completo}</td>
                  <td className="px-4 py-3 text-gray-500">{u.correo}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.rol}
                      onChange={(e) => updateRol(u.id, e.target.value)}
                      disabled={updatingId === u.id}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${ROL_STYLE[u.rol]}`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteUser(u.id, u.nombre_completo)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {usuarios.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No hay usuarios registrados.</div>
          )}
        </div>
      )}
    </div>
  )
}
