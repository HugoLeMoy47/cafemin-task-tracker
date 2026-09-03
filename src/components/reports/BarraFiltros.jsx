import { useState } from 'react'
import { ESTADOS, SIN_ASIGNAR, hayFiltrosActivos } from '../../lib/reportes'
import { usePantallaChica } from '../../hooks/usePantallaChica'

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

/**
 * `min-h-[44px]` no es decorativo. Se midió: el buscador y los cinco selects
 * salían a 34 px de alto, once objetivos por debajo del mínimo. En un teléfono
 * básico, con el dedo y no con un ratón, 34 px es un blanco que se falla.
 *
 * Measured at 34 px tall; 44 px is the floor for a finger, not a mouse.
 */
const claseCampo =
  'text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 min-h-[44px] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500'

function Selector({ etiqueta, valor, onChange, opciones, todos }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">{etiqueta}</span>
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

  /**
   * Estos dos parecen enlaces de texto y por eso salían de 16 px de alto: el
   * texto y nada más. Se ven igual que antes —siguen siendo azules y
   * subrayables— pero el área que responde al dedo llega a 44 px con relleno
   * vertical. El `-mx-2` cancela el relleno horizontal para que la fila no se
   * vea más separada de lo que estaba.
   *
   * They still look like text links; the tappable area is now 44 px.
   */
  const claseEnlace =
    'text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded inline-flex items-center min-h-[44px] px-2 -mx-2'

  /**
   * En un teléfono la barra se pliega. En una pantalla grande, no.
   * On a phone the bar collapses. On a large screen it does not.
   *
   * Se midió después de subir los campos a 44 px: los seis campos con sus
   * etiquetas ocupaban los 640 px completos de un Android de entrada. Se abría
   * «Reportes» y no se veía ni un número — solo controles para filtrar datos
   * que aún no se habían visto. En escritorio los mismos campos caben en una
   * fila y cuestan 70 px; en el teléfono costaban la pantalla entera.
   *
   * Measured after raising the fields to 44 px: the six fields filled the whole
   * 640 px viewport, so the report opened on controls and zero data.
   *
   * Arranca abierta si el enlace ya traía filtros: si alguien comparte una vista
   * filtrada, esconder el motivo por el que se ven 12 tareas y no 42 sería
   * cambiar un problema por otro.
   * Starts open when the link already carried filters.
   */
  const esChica = usePantallaChica()
  const [abierto, setAbierto] = useState(activos)
  const camposVisibles = !esChica || abierto

  return (
    <section
      aria-label="Filtros del reporte"
      className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-5"
    >
      {esChica && (
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls="campos-de-filtro"
          className="w-full flex items-center justify-between gap-2 min-h-[44px] px-1 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
        >
          <span>
            {/* El espacio es literal a propósito: sin él, el nombre accesible
                que anuncia un lector de pantalla es «Filtrosactivos».
                Literal space: without it the accessible name runs the two
                spans together. */}
            Filtros{' '}
            {activos && (
              <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                activos · {mostradas} de {total}
              </span>
            )}
          </span>
          <span aria-hidden="true" className="text-gray-400">
            {abierto ? '▲' : '▼'}
          </span>
        </button>
      )}

      <div
        id="campos-de-filtro"
        hidden={!camposVisibles}
        className={`${camposVisibles ? 'flex' : ''} flex-wrap items-end gap-2 ${esChica ? 'pt-2' : ''}`}
      >
        <label className="flex flex-col gap-1 grow min-w-[180px]">
          <span className="text-xs text-gray-500 dark:text-gray-400">Buscar por nombre</span>
          <input
            type="search"
            value={filtros.busqueda}
            onChange={(e) => set('busqueda')(e.target.value)}
            placeholder="Escribe sin preocuparte por los acentos"
            className={claseCampo}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Periodo</span>
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
            className={claseEnlace}
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
          title="Copia la dirección de esta vista: pestaña, orden y todos los filtros menos el texto de búsqueda"
          className={claseEnlace}
        >
          🔗 Copiar enlace de esta vista
        </button>
        {avisoEnlace && (
          <span role="status" className="text-xs text-green-700 dark:text-green-400">
            {avisoEnlace}
          </span>
        )}

        {/* Solo se avisa cuando hay algo que avisar. Decir siempre que la
            búsqueda no viaja sería ruido; callarlo justo cuando el usuario
            acaba de escribir algo sería una sorpresa al pegar el enlace.
            Shown only when there is something to warn about. */}
        {filtros.busqueda !== '' && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            El enlace no incluye el texto de búsqueda.
          </span>
        )}

        {/* Explicación útil donde sobra el espacio; en un teléfono, con la barra
            plegada, es una línea de texto que empuja los datos hacia abajo sin
            decir nada que no se descubra usando la barra.
            Useful where there is room; on a phone it only pushes data down. */}
        <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400 ml-auto">
          Los filtros aplican al resumen, a las tres pestañas y a la exportación.
        </span>
      </div>
    </section>
  )
}
