import { ESTADOS, SIN_ASIGNAR, hayFiltrosActivos } from '../../lib/reportes'

/**
 * Barra de filtros GLOBAL de los reportes.
 * Global report filter bar.
 *
 * Vive arriba de las pestañas a propósito. Las pestañas no filtran: agrupan el
 * mismo conjunto de tareas de tres maneras distintas. Meter un filtro de estado
 * dentro de "Por Estado" o uno de persona dentro de "Por Asignado" sería tener
 * dos mecanismos que hacen lo mismo y se contradicen.
 *
 * It sits above the tabs on purpose. The tabs do not filter: they group the
 * same set three ways. A state filter inside "Por Estado" would be two
 * mechanisms doing the same job and contradicting each other.
 *
 * Consecuencia deliberada: la exportación a CSV usa exactamente lo que está
 * filtrado. Un botón que descarga 90 filas mientras la pantalla muestra 12
 * miente sobre lo que entrega.
 * Deliberate consequence: the CSV export carries exactly what is on screen.
 */

const PERIODOS = [
  { valor: 'todo', etiqueta: 'Todo el histórico' },
  { valor: '30', etiqueta: 'Últimos 30 días' },
  { valor: '90', etiqueta: 'Últimos 90 días' },
]

const claseCampo =
  'text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500'

function Selector({ etiqueta, valor, onChange, opciones, todos }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-gray-500 dark:text-gray-400">{etiqueta}</span>
      <select value={valor} onChange={(e) => onChange(e.target.value)} className={claseCampo}>
        <option value="">{todos}</option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function BarraFiltros({
  filtros,
  onCambiar,
  opciones,
  mostradas,
  total,
  onCopiarEnlace,
  avisoEnlace,
}) {
  const set = (campo) => (valor) => onCambiar({ ...filtros, [campo]: valor })
  const activos = hayFiltrosActivos(filtros)

  return (
    <section
      aria-label="Filtros del reporte"
      className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-5"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 grow min-w-[180px]">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">Buscar por nombre</span>
          <input
            type="search"
            value={filtros.busqueda}
            onChange={(e) => set('busqueda')(e.target.value)}
            placeholder="Escribe sin preocuparte por los acentos"
            className={claseCampo}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">Periodo</span>
          <select
            value={filtros.periodo}
            onChange={(e) => set('periodo')(e.target.value)}
            className={claseCampo}
          >
            {PERIODOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.etiqueta}
              </option>
            ))}
          </select>
        </label>

        <Selector
          etiqueta="Persona"
          valor={filtros.persona}
          onChange={set('persona')}
          // Se incluye "Sin asignar" como opción real: preguntar qué quedó sin
          // dueño es justo una de las cosas que se quieren saber.
          opciones={[...opciones.personas, SIN_ASIGNAR]}
          todos="Todas"
        />
        <Selector
          etiqueta="Estado"
          valor={filtros.estado}
          onChange={set('estado')}
          opciones={ESTADOS}
          todos="Todos"
        />
        <Selector
          etiqueta="Área"
          valor={filtros.area}
          onChange={set('area')}
          opciones={opciones.areas}
          todos="Todas"
        />
        <Selector
          etiqueta="Categoría"
          valor={filtros.categoria}
          onChange={set('categoria')}
          opciones={opciones.categorias}
          todos="Todas"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {activos ? (
            <>
              Mostrando <strong className="text-gray-700 dark:text-gray-200">{mostradas}</strong> de{' '}
              {total} tareas
            </>
          ) : (
            <>
              {total} tarea{total !== 1 ? 's' : ''}, sin filtrar
            </>
          )}
        </p>
        {activos && (
          <button
            type="button"
            onClick={() => onCambiar({ busqueda: '', periodo: 'todo', persona: '', estado: '', area: '', categoria: '' })}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            Limpiar filtros
          </button>
        )}

        {/* El enlace es la razón de que el filtro viva en la URL: sin un botón
            visible, nadie descubre que la vista se puede compartir tal cual.
            Without a visible button nobody discovers the view is shareable. */}
        <button
          type="button"
          onClick={onCopiarEnlace}
          title="Copia la dirección de esta vista, con sus filtros y su orden"
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          🔗 Copiar enlace de esta vista
        </button>
        {avisoEnlace && (
          <span role="status" className="text-xs text-green-700 dark:text-green-400">
            {avisoEnlace}
          </span>
        )}

        <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-auto">
          Los filtros aplican al resumen, a las tres pestañas y a la exportación.
        </span>
      </div>
    </section>
  )
}
