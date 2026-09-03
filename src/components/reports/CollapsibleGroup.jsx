import { useId } from 'react'

/**
 * Grupo colapsable para los reportes.
 * Collapsible group for the reports view.
 *
 * El estado vive en el componente padre a propósito: así "Expandir todo" y
 * "Colapsar todo" pueden gobernar todos los grupos a la vez sin trucos.
 * State lives in the parent on purpose, so an "expand/collapse all" control can
 * govern every group at once.
 *
 * Se usa <button> real, no un <div> con onClick: eso da foco por teclado,
 * activación con Enter y Espacio, y anuncio correcto en lectores de pantalla
 * gracias a aria-expanded y aria-controls.
 * A real <button> gives keyboard focus, Enter/Space activation and correct
 * screen-reader semantics via aria-expanded / aria-controls.
 */
export default function CollapsibleGroup({
  titulo,
  conteo,
  insignia = null,
  abierto,
  onAlternar,
  children,
}) {
  const idPanel = useId()

  return (
    <div>
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierto}
        aria-controls={idPanel}
        /* `min-h-[44px]`: es el control que abre y cierra cada grupo, o sea el
           único camino a las filas. Salía a 32 px. Lo encontró
           `npm run test:movil`, no una revisión del código.
           This is the only path to the rows; it measured 32 px. */
        className="w-full flex items-center gap-2 mb-2 text-left rounded-lg px-1 py-1 min-h-[44px] hover:bg-gray-50 dark:hover:bg-gray-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span
          aria-hidden="true"
          className={`text-gray-400 dark:text-gray-500 transition-transform ${abierto ? 'rotate-90' : ''}`}
        >
          ▸
        </span>
        {insignia}
        {titulo && (
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{titulo}</span>
        )}
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {conteo} tarea{conteo !== 1 ? 's' : ''}
        </span>
      </button>

      {/* hidden en vez de desmontar: conserva el scroll horizontal de la tabla
          al volver a abrir. hidden instead of unmounting, so the table keeps
          its horizontal scroll position when reopened. */}
      <div id={idPanel} hidden={!abierto}>
        {children}
      </div>
    </div>
  )
}
