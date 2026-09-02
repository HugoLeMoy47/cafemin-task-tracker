/**
 * Encabezado de tabla que ordena al pulsarlo.
 * Sortable table header.
 *
 * Se usa <button> dentro del <th> y se declara aria-sort en el <th>: eso es lo
 * que anuncia a un lector de pantalla que la columna está ordenada y en qué
 * dirección. Una flecha dibujada no comunica nada por sí sola.
 *
 * A <button> inside the <th> plus aria-sort on the <th>: that is what tells a
 * screen reader the column is sorted and which way. A drawn arrow alone says
 * nothing.
 */
export default function EncabezadoOrdenable({ campo, etiqueta, orden, onOrdenar, alineado = 'left' }) {
  const activo = orden.campo === campo
  const dir = activo ? orden.direccion : null

  return (
    <th
      scope="col"
      aria-sort={activo ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-4 py-2.5 text-${alineado} text-xs text-gray-500 dark:text-gray-400 font-normal`}
    >
      <button
        type="button"
        onClick={() => onOrdenar(campo)}
        className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        title={`Ordenar por ${etiqueta}`}
      >
        {etiqueta}
        <span aria-hidden="true" className={activo ? 'text-blue-600 dark:text-blue-400' : 'opacity-30'}>
          {activo ? (dir === 'asc' ? '▲' : '▼') : '▾'}
        </span>
      </button>
    </th>
  )
}
