import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function CatalogSection({ title, table }) {
  const [items, setItems] = useState([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetch() {
    const { data } = await supabase.from(table).select('*').order('nombre')
    setItems(data || [])
  }

  useEffect(() => { fetch() }, [table])

  async function addItem(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.from(table).insert({ nombre: newName.trim() })
    if (error) setError(error.message)
    else { setNewName(''); fetch() }
    setLoading(false)
  }

  async function deleteItem(id, nombre) {
    if (!window.confirm(`¿Eliminar "${nombre}"?`)) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) setError(error.message)
    else fetch()
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
            <span className="text-sm text-gray-800">{item.nombre}</span>
            <button
              onClick={() => deleteItem(item.id, item.nombre)}
              className="text-xs text-red-500 hover:text-red-700 ml-4"
            >
              Eliminar
            </button>
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
