import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { ordenarTareasPlantilla, validarPlantilla, validarTareaPlantilla } from '../lib/plantillas.js'
import { mensajeDeError } from '../lib/errores.js'

export default function TemplateManagement({ userProfile }) {
  const [plantillas, setPlantillas] = useState([])
  const [selectedPlantillaId, setSelectedPlantillaId] = useState(null)
  const [areas, setAreas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  // Formulario nuevo perfil
  const [mostrarNuevoPerfil, setMostrarNuevoPerfil] = useState(false)
  const [nuevoNombrePerfil, setNuevoNombrePerfil] = useState('')
  const [nuevaDescPerfil, setNuevaDescPerfil] = useState('')
  const [nuevaAreaPerfil, setNuevaAreaPerfil] = useState('')
  const [nuevaCatPerfil, setNuevaCatPerfil] = useState('')

  // Formulario nueva tarea de plantilla
  const [nuevoNombreTarea, setNuevoNombreTarea] = useState('')
  const [nuevosDetallesTarea, setNuevosDetallesTarea] = useState('')
  const [nuevaFotoRequerida, setNuevaFotoRequerida] = useState(false)

  const fetchDatos = useCallback(async () => {
    setLoading(true)
    setError('')

    const [{ data: p, error: ep }, { data: a, error: ea }, { data: c, error: ec }] =
      await Promise.all([
        supabase
          .from('plantillas_perfil')
          .select(`
            *,
            area:areas_trabajo(nombre),
            categoria:categorias(nombre),
            tareas:plantilla_tareas(*)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('areas_trabajo').select('id, nombre').order('nombre'),
        supabase.from('categorias').select('id, nombre').order('nombre'),
      ])

    if (ep || ea || ec) {
      setError(
        mensajeDeError(
          ep || ea || ec,
          'No se pudieron cargar los perfiles o catálogos. Intenta de nuevo.'
        )
      )
    } else {
      setPlantillas(p || [])
      setAreas(a || [])
      setCategorias(c || [])
      if (!selectedPlantillaId && p && p.length > 0) {
        setSelectedPlantillaId(p[0].id)
      }
    }
    setLoading(false)
  }, [selectedPlantillaId])

  useEffect(() => {
    fetchDatos()
  }, [fetchDatos])

  const plantillaActual = plantillas.find((p) => p.id === selectedPlantillaId)
  const tareasActuales = ordenarTareasPlantilla(plantillaActual?.tareas || [])

  async function handleCrearPerfil(e) {
    e.preventDefault()
    setError('')
    setExito('')

    const err = validarPlantilla({ nombre: nuevoNombrePerfil })
    if (err) {
      setError(err)
      return
    }

    const payload = {
      nombre: nuevoNombrePerfil.trim(),
      descripcion: nuevaDescPerfil.trim() || null,
      area_trabajo_id: nuevaAreaPerfil || null,
      categoria_id: nuevaCatPerfil || null,
      creado_por: userProfile?.id || null,
    }

    const { data, error: insertErr } = await supabase
      .from('plantillas_perfil')
      .insert(payload)
      .select()
      .single()

    if (insertErr) {
      setError(mensajeDeError(insertErr, 'No se pudo crear el perfil de rutina.'))
    } else {
      setNuevoNombrePerfil('')
      setNuevaDescPerfil('')
      setNuevaAreaPerfil('')
      setNuevaCatPerfil('')
      setMostrarNuevoPerfil(false)
      setExito(`Perfil "${payload.nombre}" creado exitosamente.`)
      await fetchDatos()
      if (data?.id) setSelectedPlantillaId(data.id)
    }
  }

  async function handleEliminarPerfil(plantilla) {
    if (!window.confirm(`¿Eliminar el perfil "${plantilla.nombre}" y todas sus tareas?`)) return
    setError('')
    setExito('')

    const { error: delErr } = await supabase
      .from('plantillas_perfil')
      .delete()
      .eq('id', plantilla.id)

    if (delErr) {
      setError(mensajeDeError(delErr, 'No se pudo eliminar el perfil.'))
    } else {
      setExito('Perfil eliminado.')
      setSelectedPlantillaId(null)
      fetchDatos()
    }
  }

  async function handleAgregarTarea(e) {
    e.preventDefault()
    if (!plantillaActual) return
    setError('')
    setExito('')

    const err = validarTareaPlantilla({ nombre: nuevoNombreTarea })
    if (err) {
      setError(err)
      return
    }

    const nuevoOrden = tareasActuales.length + 1
    const payload = {
      plantilla_id: plantillaActual.id,
      nombre: nuevoNombreTarea.trim(),
      detalles: nuevosDetallesTarea.trim() || null,
      orden: nuevoOrden,
      foto_requerida: nuevaFotoRequerida,
    }

    const { error: insertErr } = await supabase.from('plantilla_tareas').insert(payload)

    if (insertErr) {
      setError(mensajeDeError(insertErr, 'No se pudo agregar la tarea a este perfil.'))
    } else {
      setNuevoNombreTarea('')
      setNuevosDetallesTarea('')
      setNuevaFotoRequerida(false)
      fetchDatos()
    }
  }

  async function handleEliminarTarea(tarea) {
    setError('')
    const { error: delErr } = await supabase
      .from('plantilla_tareas')
      .delete()
      .eq('id', tarea.id)

    if (delErr) {
      setError(mensajeDeError(delErr, 'No se pudo eliminar la tarea del perfil.'))
    } else {
      fetchDatos()
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando perfiles y rutinas...</div>
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>📋</span>
            <span>Perfiles y Rutinas de Voluntariado</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Plantillas de tareas preconfiguradas para asignar rápidamente por turnos y áreas de trabajo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarNuevoPerfil((v) => !v)}
          className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-1.5 self-start sm:self-auto"
        >
          {mostrarNuevoPerfil ? '✕ Cancelar' : '+ Nuevo Perfil'}
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-xs rounded-xl">
          {error}
        </div>
      )}

      {exito && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl">
          {exito}
        </div>
      )}

      {/* Formulario nuevo perfil */}
      {mostrarNuevoPerfil && (
        <form
          onSubmit={handleCrearPerfil}
          className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in"
        >
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Crear Nuevo Perfil / Rutina</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Nombre del Perfil *
              </label>
              <input
                type="text"
                value={nuevoNombrePerfil}
                onChange={(e) => setNuevoNombrePerfil(e.target.value)}
                placeholder="Ej. Asistente de Cocina"
                required
                className="w-full min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Área por defecto
              </label>
              <select
                value={nuevaAreaPerfil}
                onChange={(e) => setNuevaAreaPerfil(e.target.value)}
                className="w-full min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Sin área fija --</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Categoría por defecto
              </label>
              <select
                value={nuevaCatPerfil}
                onChange={(e) => setNuevaCatPerfil(e.target.value)}
                className="w-full min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Sin categoría fija --</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Descripción del rol o turno
            </label>
            <input
              type="text"
              value={nuevaDescPerfil}
              onChange={(e) => setNuevaDescPerfil(e.target.value)}
              placeholder="Ej. Tareas operativas matutinas de preparación y servicio de alimentos"
              className="w-full min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setMostrarNuevoPerfil(false)}
              className="min-h-[44px] px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
            >
              Guardar Perfil
            </button>
          </div>
        </form>
      )}

      {/* Selector de perfil y tareas */}
      {plantillas.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <span className="text-4xl mb-2 inline-block">📋</span>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
            Aún no hay perfiles creados
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            Crea el primer perfil (ej. &ldquo;Asistente de Cocina&rdquo;) para estructurar las tareas
            rutinarias de los voluntarios.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Columna izquierda: Lista de perfiles */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 px-1">
              Perfiles Registrados ({plantillas.length})
            </h3>
            <ul className="space-y-1.5 list-none p-0 m-0">
              {plantillas.map((p) => {
                const activo = p.id === selectedPlantillaId
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedPlantillaId(p.id)}
                      className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-left text-xs font-medium transition-colors flex items-center justify-between gap-2 ${
                        activo
                          ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <span className="truncate">{p.nombre}</span>
                      <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold">
                        {(p.tareas || []).length}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Columna central/derecha: Detalle y tareas del perfil seleccionado */}
          <div className="md:col-span-2 space-y-4">
            {plantillaActual ? (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm space-y-5">
                {/* Cabecera del perfil */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 dark:border-gray-700 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {plantillaActual.nombre}
                    </h3>
                    {plantillaActual.descripcion && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {plantillaActual.descripcion}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {plantillaActual.area && <span>📍 Área: {plantillaActual.area.nombre}</span>}
                      {plantillaActual.categoria && (
                        <span>🏷 Categoría: {plantillaActual.categoria.nombre}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEliminarPerfil(plantillaActual)}
                    className="min-h-[44px] px-3 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors self-start sm:self-auto"
                  >
                    🗑 Eliminar perfil
                  </button>
                </div>

                {/* Formulario agregar tarea a la rutina */}
                <form
                  onSubmit={handleAgregarTarea}
                  className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700/80 rounded-xl p-4 space-y-3"
                >
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    + Agregar Tarea Rutinaria al Perfil
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={nuevoNombreTarea}
                        onChange={(e) => setNuevoNombreTarea(e.target.value)}
                        placeholder="Nombre de la tarea (ej. Lavar platos)"
                        required
                        className="w-full min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <label className="flex items-center gap-2 min-h-[44px] px-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={nuevaFotoRequerida}
                        onChange={(e) => setNuevaFotoRequerida(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>📷 Exigir foto</span>
                    </label>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={nuevosDetallesTarea}
                      onChange={(e) => setNuevosDetallesTarea(e.target.value)}
                      placeholder="Instrucciones o detalles opcionales..."
                      className="w-full min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                    >
                      Agregar Tarea
                    </button>
                  </div>
                </form>

                {/* Lista de tareas del perfil */}
                <div>
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Secuencia de tareas del turno ({tareasActuales.length})
                  </h4>
                  {tareasActuales.length === 0 ? (
                    <p className="text-xs text-gray-400 py-3 text-center">
                      Este perfil aún no tiene tareas asociadas.
                    </p>
                  ) : (
                    <ul className="space-y-2 list-none p-0 m-0">
                      {tareasActuales.map((t, index) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {index + 1}. {t.nombre}
                              </span>
                              {t.foto_requerida && (
                                <span className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded font-medium text-xs">
                                  📷 foto
                                </span>
                              )}
                            </div>
                            {t.detalles && (
                              <p className="text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                                {t.detalles}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleEliminarTarea(t)}
                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-gray-400 hover:text-red-600 dark:hover:text-red-400 text-sm"
                            aria-label={`Eliminar tarea ${t.nombre}`}
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
