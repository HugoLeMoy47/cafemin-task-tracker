import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function TaskForm({ task, userProfile, onDone }) {
  const isEdit = !!task

  const [nombre, setNombre] = useState(task?.nombre || '')
  const [detalles, setDetalles] = useState(task?.detalles || '')
  const [fotoRequerida, setFotoRequerida] = useState(task?.foto_requerida || false)
  const [asignadoId, setAsignadoId] = useState(task?.asignado_id || '')
  const [categoriaId, setCategoriaId] = useState(task?.categoria_id || '')
  const [areaId, setAreaId] = useState(task?.area_trabajo_id || '')
  const [fechaLimite, setFechaLimite] = useState(
    task?.fecha_limite ? task.fecha_limite.split('T')[0] : ''
  )

  const [usuarios, setUsuarios] = useState([])
  const [categorias, setCategorias] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOptions() {
      const [{ data: u }, { data: c }, { data: a }] = await Promise.all([
        supabase.from('usuarios').select('id, nombre_completo').order('nombre_completo'),
        supabase.from('categorias').select('id, nombre').order('nombre'),
        supabase.from('areas_trabajo').select('id, nombre').order('nombre'),
      ])
      setUsuarios(u || [])
      setCategorias(c || [])
      setAreas(a || [])
    }
    loadOptions()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      nombre: nombre.trim(),
      detalles: detalles.trim() || null,
      foto_requerida: fotoRequerida,
      asignado_id: asignadoId || null,
      categoria_id: categoriaId || null,
      area_trabajo_id: areaId || null,
      fecha_limite: fechaLimite || null,
    }

    let err
    if (isEdit) {
      ;({ error: err } = await supabase.from('tareas').update(payload).eq('id', task.id))
    } else {
      ;({ error: err } = await supabase.from('tareas').insert({
        ...payload,
        creado_por: userProfile.id,
      }))
    }

    if (err) setError(err.message)
    else onDone()
    setLoading(false)
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onDone} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <h2 className="text-xl font-semibold text-gray-800">
          {isEdit ? 'Editar tarea' : 'Nueva tarea'}
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la tarea *</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej. Limpiar cocina principal"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Detalles</label>
          <textarea
            value={detalles}
            onChange={(e) => setDetalles(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Instrucciones adicionales o contexto..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Área de trabajo</label>
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin área</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a</label>
          <select
            value={asignadoId}
            onChange={(e) => setAsignadoId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sin asignar</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre_completo}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite</label>
          <input
            type="date"
            value={fechaLimite}
            onChange={(e) => setFechaLimite(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="foto"
            checked={fotoRequerida}
            onChange={(e) => setFotoRequerida(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600"
          />
          <label htmlFor="foto" className="text-sm font-medium text-gray-700">
            📷 Requiere foto de evidencia para marcar como Hecho
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear tarea'}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
