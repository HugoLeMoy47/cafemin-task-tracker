import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const ROLES = ['Administrador', 'Gestor', 'Asignado']

const ROL_STYLE = {
  Administrador: 'bg-purple-100 text-purple-700',
  Gestor: 'bg-blue-100 text-blue-700',
  Asignado: 'bg-gray-100 text-gray-700',
}

export default function UserManagement() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState('')

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
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Gestión de Usuarios</h2>
      <p className="text-sm text-gray-500 mb-5">
        Los usuarios se registran por su cuenta. Aquí puedes modificar sus roles o eliminar su perfil.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

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
