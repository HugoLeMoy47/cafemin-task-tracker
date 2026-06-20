import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function CatalogSection({ title, table }) {
  const [items, setItems] = useState([])
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchItems() {
    const { data } = await supabase.from(table).select('*').order('nombre')
    setItems(data || [])
  }

  useEffect(() => { fetchItems() }, [table])

  async function addItem(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.from(table).insert({ nombre: newName.trim() })
    if (error) setError(error.message)
    else { setNewName(''); fetchItems() }
    setLoading(false)
  }

  async function updateItem(id) {
    if (!editName.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.from(table).update({ nombre: editName.trim() }).eq('id', id)
    if (error) setError(error.message)
    else { setEditingId(null); fetchItems() }
    setLoading(false)
  }

  async function deleteItem(id, nombre) {
    if (!window.confirm(`¿Eliminar "${nombre}"?`)) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) setError(error.message)
    else fetchItems()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>

      {error && (
        <div className="text-red-600 text-xs mb-3">{error}</div>
      )}

      <ul className="space-y-2 mb-4">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50">
            {editingId === item.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && updateItem(item.id)}
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={() => updateItem(item.id)}
                  disabled={loading}
                  className="text-xs text-green-600 hover:text-green-800 font-medium"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm text-gray-800">{item.nombre}</span>
                <div className="flex items-center gap-3 ml-4">
                  <button
                    onClick={() => { setEditingId(item.id); setEditName(item.nombre) }}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteItem(item.id, item.nombre)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-gray-400 py-2">Sin valores aún.</li>
        )}
      </ul>

      <form onSubmit={addItem} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Agregar nuevo valor..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          Agregar
        </button>
      </form>
    </div>
  )
}

export default function CatalogManagement() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-5">Gestión de Catálogos</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <CatalogSection title="📋 Categorías" table="categorias" />
        <CatalogSection title="📍 Áreas de Trabajo" table="areas_trabajo" />
      </div>
    </div>
  )
}
