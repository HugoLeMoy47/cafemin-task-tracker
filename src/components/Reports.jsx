import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CollapsibleGroup from './reports/CollapsibleGroup'
import { construirCsv, descargarCsv, fechaCsv, nombreArchivoCsv } from '../lib/csv'
import {
  resumenPorEstado,
  resumenPorAsignado,
  serieSemanal,
  aplicarFiltros,
  opcionesDeFiltro,
  ordenarTareas,
  hayFiltrosActivos,
  FILTRO_VACIO,
  CAMPOS_ORDEN,
} from '../lib/reportes'
import { leerEnlace, escribirEnlace, sanearFiltros } from '../lib/enlaceReporte'
import BarraFiltros from './reports/BarraFiltros'
import EncabezadoOrdenable from './reports/EncabezadoOrdenable'
import { GraficaEstado, GraficaAsignado, GraficaSemanal } from './reports/graficas'
import Dashboard from './reports/Dashboard'

// 'Resumen' va primero y es la pestaña inicial: quien entra a reportes quiere
// saber cómo va todo antes de escarbar en un listado.
// 'Resumen' comes first and is the landing tab.
const TABS = ['Resumen', 'Por Estado', 'Por Asignado', 'Por Fecha']

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ESTADO_STYLE = {
  Pendiente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'En curso': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Hecho: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

/**
 * El CSV exporta SIEMPRE todas las columnas, aunque la pestaña muestre menos.
 * Quien descarga un reporte lo va a filtrar en su hoja de cálculo; entregarle
 * un recorte lo obliga a volver a exportar. La pestaña define el orden, el
 * agrupamiento y el nombre del archivo, no qué datos se llevan.
 *
 * The CSV always carries every column even when the tab shows fewer: whoever
 * downloads it will filter in a spreadsheet, and a trimmed export just forces
 * a second trip. The tab decides ordering, grouping and filename — not scope.
 */
const COLUMNAS_CSV = [
  { clave: 'grupo', titulo: 'Grupo' },
  { clave: 'tarea', titulo: 'Tarea' },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'asignado', titulo: 'Asignado' },
  { clave: 'categoria', titulo: 'Categoría' },
  { clave: 'area', titulo: 'Área' },
  { clave: 'creada', titulo: 'Creada' },
  { clave: 'limite', titulo: 'Límite' },
  { clave: 'hecha', titulo: 'Hecha' },
]

function filaCsv(t, grupo) {
  return {
    grupo,
    tarea: t.nombre,
    estado: t.estado,
    asignado: t.asignado?.nombre_completo || 'Sin asignar',
    categoria: t.categoria?.nombre || '',
    area: t.area?.nombre || '',
    creada: fechaCsv(t.fecha_creacion),
    limite: t.fecha_limite ? fechaCsv(t.fecha_limite) : '',
    hecha: fechaCsv(t.fecha_hecho),
  }
}

/**
 * Orden inicial de cada pestaña. Las de fecha arrancan de lo más nuevo a lo
 * más viejo, que es lo que se busca al abrir un reporte.
 * Date columns start newest-first, which is what a report reader wants.
 */
const ORDEN_INICIAL = {
  'Por Estado': { campo: 'creada', direccion: 'desc' },
  'Por Asignado': { campo: 'tarea', direccion: 'asc' },
  'Por Fecha': { campo: 'creada', direccion: 'desc' },
}

/**
 * Primer clic en una columna: las fechas bajan de más nueva a más vieja; el
 * texto y el estado suben. Forzar 'asc' en una fecha obliga a un segundo clic
 * para ver lo reciente, que es lo que casi siempre se quiere.
 * First click: dates go newest-first, text and state ascending.
 */
function direccionInicial(campo) {
  return CAMPOS_ORDEN[campo]?.tipo === 'fecha' ? 'desc' : 'asc'
}

const tdBase = 'px-4 py-2.5'

const TAB_POR_DEFECTO = 'Resumen'
const OPCIONES_ENLACE = { tabs: TABS, tabPorDefecto: TAB_POR_DEFECTO, ordenInicial: ORDEN_INICIAL }

/**
 * Estado inicial tomado de la URL. Va en inicializadores perezosos y no en un
 * efecto: si se leyera después del primer render, quien abre un enlace filtrado
 * vería un parpadeo con el reporte completo antes de que se aplique el filtro,
 * y sobre 90 tareas eso se nota.
 * Read in lazy initializers, not in an effect: reading after the first render
 * would flash the unfiltered report before the filter lands.
 */
function estadoInicial() {
  return leerEnlace(typeof window === 'undefined' ? '' : window.location.search, OPCIONES_ENLACE)
}

export default function Reports({ userProfile }) {
  const [inicial] = useState(estadoInicial)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [tab, setTab] = useState(inicial.tab)
  const [enlaceCopiado, setEnlaceCopiado] = useState('')
  /**
   * Grupos abiertos, por clave. Arrancan cerrados: con 90 tareas, abrir todo
   * de entrada entierra los conteos, que es justamente el resumen que se busca
   * al entrar a un reporte.
   * Groups start collapsed: with 90 tasks, expanding everything buries the
   * counts, which are the summary the reader came for.
   */
  const [abiertos, setAbiertos] = useState(() => new Set())

  /** Filtro global: gobierna el resumen, las tres pestañas y la exportación. */
  const [filtros, setFiltros] = useState(inicial.filtros)

  /**
   * Orden por pestaña, no compartido. Cada pestaña muestra columnas distintas;
   * arrastrar el criterio de una a otra dejaría las filas ordenadas por algo
   * que ahí no se ve.
   * Per-tab sort: carrying one tab's criterion into another would order rows by
   * something that tab does not display.
   */
  const [ordenes, setOrdenes] = useState(() =>
    inicial.orden ? { ...ORDEN_INICIAL, [inicial.tab]: inicial.orden } : ORDEN_INICIAL
  )

  const estaAbierto = (clave) => abiertos.has(clave)
  const alternar = (clave) =>
    setAbiertos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(clave)) siguiente.delete(clave)
      else siguiente.add(clave)
      return siguiente
    })

  useEffect(() => {
    async function fetchAll() {
      const { data, error } = await supabase
        .from('tareas')
        .select(`
          *,
          asignado:usuarios!asignado_id(nombre_completo),
          categoria:categorias(nombre),
          area:areas_trabajo(nombre)
        `)
        .order('fecha_creacion', { ascending: false })
      if (error) {
        setFetchError('No se pudieron cargar los reportes. Verifica tu conexión.')
      } else {
        const filas = data || []
        setTasks(filas)
        // Un enlace puede nombrar a alguien que ya no tiene tareas, o un área
        // que se borró del catálogo. Se descarta ese filtro en vez de dejar el
        // selector en blanco y la tabla en cero sin explicación.
        // A link may name someone or something no longer in the data.
        setFiltros((prev) => sanearFiltros(prev, opcionesDeFiltro(filas)))
      }
      setLoading(false)
    }
    fetchAll()
  }, [])

  /**
   * Refleja el estado en la barra de direcciones.
   *
   * Es `replaceState` y no `pushState` a propósito: escribir en el buscador
   * dispara un cambio por tecla, y con `pushState` el botón «atrás» tendría
   * que pulsarse una vez por letra para salir del reporte. El enlace se
   * comparte copiando la URL, no navegando el historial.
   *
   * Deliberately replaceState: the search box fires per keystroke, and
   * pushState would make Back require one press per letter typed.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const consulta = escribirEnlace({ tab, filtros, orden: ordenes[tab] }, OPCIONES_ENLACE)
    const destino = `${window.location.pathname}${consulta ? `?${consulta}` : ''}${window.location.hash}`
    if (destino !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(null, '', destino)
    }
  }, [tab, filtros, ordenes])

  /** El aviso de «enlace copiado» se borra solo; no merece un botón para cerrarlo. */
  useEffect(() => {
    if (!enlaceCopiado) return undefined
    const t = setTimeout(() => setEnlaceCopiado(''), 2500)
    return () => clearTimeout(t)
  }, [enlaceCopiado])

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setEnlaceCopiado('Enlace copiado')
    } catch {
      // Sin permiso de portapapeles (contexto no seguro, o el usuario lo negó).
      // Decirle dónde está el enlace es más útil que un error.
      setEnlaceCopiado('Copia la URL desde la barra de direcciones')
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400 dark:text-gray-500">Cargando reportes...</div>

  if (fetchError) return (
    <div className="px-4 py-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
      {fetchError}
    </div>
  )

  const orden = ordenes[tab] ?? ORDEN_INICIAL['Por Fecha']

  function alternarOrden(campo) {
    setOrdenes((prev) => {
      const actual = prev[tab]
      const direccion =
        actual?.campo === campo
          ? actual.direccion === 'asc'
            ? 'desc'
            : 'asc'
          : direccionInicial(campo)
      return { ...prev, [tab]: { campo, direccion } }
    })
  }

  // Todo lo que se muestra abajo parte de aquí. Una sola fuente filtrada evita
  // que el resumen diga 90 y la tabla 12.
  const filtradas = aplicarFiltros(tasks, filtros)
  const ordenadas = ordenarTareas(filtradas, orden.campo, orden.direccion)
  const opciones = opcionesDeFiltro(tasks)

  const byEstado = ['Pendiente', 'En curso', 'Hecho'].map((estado) => ({
    estado,
    tasks: ordenadas.filter((t) => t.estado === estado),
  }))

  const byAsignado = Object.values(
    ordenadas.reduce((acc, t) => {
      const key = t.asignado?.nombre_completo || 'Sin asignar'
      if (!acc[key]) acc[key] = { nombre: key, tasks: [] }
      acc[key].tasks.push(t)
      return acc
    }, {})
  ).sort((a, b) => a.nombre.localeCompare(b.nombre))

  const byFecha = ordenadas

  // Claves de los grupos de la pestaña activa. Sirven para "expandir todo" y
  // para saber si ya está todo abierto.
  const clavesDeLaPestana =
    tab === 'Por Estado'
      ? byEstado.map(({ estado }) => `estado:${estado}`)
      : tab === 'Por Asignado'
        ? byAsignado.map(({ nombre }) => `asignado:${nombre}`)
        : tab === 'Por Fecha'
          ? ['fecha:todas']
          : []

  const todoAbierto =
    clavesDeLaPestana.length > 0 && clavesDeLaPestana.every((c) => abiertos.has(c))

  function alternarTodo() {
    setAbiertos((prev) => {
      const siguiente = new Set(prev)
      if (todoAbierto) clavesDeLaPestana.forEach((c) => siguiente.delete(c))
      else clavesDeLaPestana.forEach((c) => siguiente.add(c))
      return siguiente
    })
  }

  function exportar() {
    let filas
    if (tab === 'Por Estado') {
      filas = byEstado.flatMap(({ estado, tasks: g }) => g.map((t) => filaCsv(t, estado)))
    } else if (tab === 'Por Asignado') {
      filas = byAsignado.flatMap(({ nombre, tasks: g }) => g.map((t) => filaCsv(t, nombre)))
    } else {
      filas = byFecha.map((t) => filaCsv(t, ''))
    }
    descargarCsv(nombreArchivoCsv(tab), construirCsv(COLUMNAS_CSV, filas))
  }

  const btnBarra =
    'text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50'

  const tableWrap = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'
  const tableClass = 'w-full text-sm min-w-[480px]'
  const theadClass = 'bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700'
  const tbodyClass = 'divide-y divide-gray-50 dark:divide-gray-700'
  const trClass = 'hover:bg-gray-50 dark:hover:bg-gray-700/30'

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-5">Reportes</h2>

      {/* Tab bar — scroll horizontal en móvil */}
      <div className="overflow-x-auto -mx-1 px-1 mb-5">
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 min-w-max">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === t
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <BarraFiltros
        filtros={filtros}
        onCambiar={setFiltros}
        opciones={opciones}
        mostradas={filtradas.length}
        total={tasks.length}
        onCopiarEnlace={copiarEnlace}
        avisoEnlace={enlaceCopiado}
      />

      {filtradas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ninguna tarea coincide con los filtros.
          </p>
          <button
            type="button"
            onClick={() => setFiltros(FILTRO_VACIO)}
            className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
      <>
      {/* Resumen general */}
      {tab === 'Resumen' && <Dashboard tareas={filtradas} />}

      {/* Acciones de la pestaña. El resumen no agrupa filas ni lista tareas,
          así que ni colapsar ni exportar aplican ahí. */}
      {tab !== 'Resumen' && (
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button type="button" onClick={alternarTodo} className={btnBarra}>
          {todoAbierto ? 'Colapsar todo' : 'Expandir todo'}
        </button>
        <button type="button" onClick={exportar} disabled={filtradas.length === 0} className={btnBarra}>
          ⬇ Exportar CSV
        </button>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
          {hayFiltrosActivos(filtros)
            ? `${filtradas.length} de ${tasks.length} tareas`
            : `${tasks.length} tarea${tasks.length !== 1 ? 's' : ''} en total`}
        </span>
      </div>
      )}

      {/* Por Estado */}
      {tab === 'Por Estado' && (
        <div className="space-y-5">
          <GraficaEstado datos={resumenPorEstado(filtradas)} />
          {byEstado.map(({ estado, tasks: group }) => (
            <CollapsibleGroup
              key={estado}
              conteo={group.length}
              abierto={estaAbierto(`estado:${estado}`)}
              onAlternar={() => alternar(`estado:${estado}`)}
              insignia={
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ESTADO_STYLE[estado]}`}>{estado}</span>
              }
            >
              {group.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 pl-2">Sin tareas.</p>
              ) : (
                <div className={tableWrap}>
                  <div className="overflow-x-auto">
                    <table className={tableClass}>
                      <thead className={theadClass}>
                        <tr>
                          <EncabezadoOrdenable campo="tarea" etiqueta="Tarea" orden={orden} onOrdenar={alternarOrden} />
                          <EncabezadoOrdenable campo="asignado" etiqueta="Asignado" orden={orden} onOrdenar={alternarOrden} />
                          <EncabezadoOrdenable campo="categoria" etiqueta="Categoría" orden={orden} onOrdenar={alternarOrden} />
                          <EncabezadoOrdenable campo="creada" etiqueta="Creada" orden={orden} onOrdenar={alternarOrden} />
                        </tr>
                      </thead>
                      <tbody className={tbodyClass}>
                        {group.map((t) => (
                          <tr key={t.id} className={trClass}>
                            <td className={`${tdBase} font-medium text-gray-800 dark:text-gray-100`}>{t.nombre}</td>
                            <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{t.asignado?.nombre_completo || '—'}</td>
                            <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{t.categoria?.nombre || '—'}</td>
                            <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{formatDate(t.fecha_creacion)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CollapsibleGroup>
          ))}
        </div>
      )}

      {/* Por Asignado */}
      {tab === 'Por Asignado' && (
        <div className="space-y-5">
          <GraficaAsignado datos={resumenPorAsignado(filtradas)} />
          {byAsignado.map(({ nombre, tasks: group }) => (
            <CollapsibleGroup
              key={nombre}
              titulo={`👤 ${nombre}`}
              conteo={group.length}
              abierto={estaAbierto(`asignado:${nombre}`)}
              onAlternar={() => alternar(`asignado:${nombre}`)}
            >
              <div className={tableWrap}>
                <div className="overflow-x-auto">
                  <table className={tableClass}>
                    <thead className={theadClass}>
                      <tr>
                        <EncabezadoOrdenable campo="tarea" etiqueta="Tarea" orden={orden} onOrdenar={alternarOrden} />
                        <EncabezadoOrdenable campo="estado" etiqueta="Estado" orden={orden} onOrdenar={alternarOrden} />
                        <EncabezadoOrdenable campo="area" etiqueta="Área" orden={orden} onOrdenar={alternarOrden} />
                        <EncabezadoOrdenable campo="hecha" etiqueta="Fecha hecho" orden={orden} onOrdenar={alternarOrden} />
                      </tr>
                    </thead>
                    <tbody className={tbodyClass}>
                      {group.map((t) => (
                        <tr key={t.id} className={trClass}>
                          <td className={`${tdBase} font-medium text-gray-800 dark:text-gray-100`}>{t.nombre}</td>
                          <td className={tdBase}>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_STYLE[t.estado]}`}>{t.estado}</span>
                          </td>
                          <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{t.area?.nombre || '—'}</td>
                          <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{formatDate(t.fecha_hecho)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CollapsibleGroup>
          ))}
        </div>
      )}

      {/* Por Fecha */}
      {tab === 'Por Fecha' && (
        <>
        <GraficaSemanal datos={serieSemanal(filtradas, 10)} />
        <CollapsibleGroup
          titulo="📅 Todas las tareas por fecha"
          conteo={byFecha.length}
          abierto={estaAbierto('fecha:todas')}
          onAlternar={() => alternar('fecha:todas')}
        >
        <div className={tableWrap}>
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <EncabezadoOrdenable campo="tarea" etiqueta="Tarea" orden={orden} onOrdenar={alternarOrden} />
                  <EncabezadoOrdenable campo="estado" etiqueta="Estado" orden={orden} onOrdenar={alternarOrden} />
                  <EncabezadoOrdenable campo="asignado" etiqueta="Asignado" orden={orden} onOrdenar={alternarOrden} />
                  <EncabezadoOrdenable campo="creada" etiqueta="Creada" orden={orden} onOrdenar={alternarOrden} />
                  <EncabezadoOrdenable campo="limite" etiqueta="Límite" orden={orden} onOrdenar={alternarOrden} />
                  <EncabezadoOrdenable campo="hecha" etiqueta="Hecho" orden={orden} onOrdenar={alternarOrden} />
                </tr>
              </thead>
              <tbody className={tbodyClass}>
                {byFecha.map((t) => {
                  const overdue = t.fecha_limite && t.estado !== 'Hecho' && new Date(t.fecha_limite) < new Date()
                  return (
                    <tr key={t.id} className={trClass}>
                      <td className={`${tdBase} font-medium text-gray-800 dark:text-gray-100`}>{t.nombre}</td>
                      <td className={tdBase}>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_STYLE[t.estado]}`}>{t.estado}</span>
                      </td>
                      <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{t.asignado?.nombre_completo || '—'}</td>
                      <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{formatDate(t.fecha_creacion)}</td>
                      <td className={`${tdBase} ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                        {t.fecha_limite ? formatDate(t.fecha_limite) : '—'}
                      </td>
                      <td className={`${tdBase} text-gray-500 dark:text-gray-400`}>{formatDate(t.fecha_hecho)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {byFecha.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">Sin tareas.</div>
          )}
        </div>
        </CollapsibleGroup>
        </>
      )}
      </>
      )}
    </div>
  )
}
