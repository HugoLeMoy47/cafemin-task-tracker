import { ESTADOS, avanceDisponible } from '../lib/flujoTareas'

/**
 * El tablero, para un teléfono.
 * The board, for a phone.
 *
 * ── Por qué no es el tablero con anchos más chicos ──
 *
 * Se midió: el tablero de tres columnas ocupa 692 px. En un Android de 360 —el
 * más común de gama de entrada— se ven 328, la columna «Hecho» empieza en el
 * píxel 500 y ni siquiera el centro de la zona para soltar «En curso» cabe:
 * queda en el 362, dos más allá del borde. En ese aparato, el gesto que el
 * producto le pide a quien hace el trabajo NO TIENE DESTINO VISIBLE.
 *
 * Measured: the board is 692 px wide; a 360 px phone shows 328, and not one
 * drop zone is fully on screen. The gesture has nowhere to land.
 *
 * No se arregla estrechando columnas: tres de 220 px no entran en 360, y a 160
 * el texto de las tarjetas deja de caber. Lo que no sobrevive a la pantalla
 * chica no es el diseño, es el modelo de interacción — arrastrar presupone ver
 * origen y destino a la vez.
 *
 * ── Lo que se hace en su lugar ──
 *
 * Una columna a la vez, y el avance por botón en vez de por gesto. No es un
 * parche: incluso donde el arrastre funciona, en un teléfono es un gesto caro,
 * y con una sola mano —que es como se usa esto mientras se carga algo— es peor.
 * Un toque con el destino escrito en el botón es más rápido que el tablero.
 *
 * Not a fallback: even where dragging works, on a phone it is an expensive
 * gesture, and one-handed it is worse. A tap with the destination written on it
 * beats the board.
 */

/**
 * Selector de columna. Botones de verdad con `aria-pressed`, no pestañas: lo
 * que hacen es filtrar la lista de abajo, y una pestaña promete una región
 * conmutable que aquí no existe.
 * Real buttons with aria-pressed, not tabs: this filters a list.
 */
function SelectorDeEstado({ activo, onCambiar, conteos }) {
  return (
    <div
      role="group"
      aria-label="Filtrar por estado"
      className="grid grid-cols-3 gap-1 mb-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl"
    >
      {ESTADOS.map((estado) => {
        const seleccionado = estado === activo
        return (
          <button
            key={estado}
            type="button"
            aria-pressed={seleccionado}
            onClick={() => onCambiar(estado)}
            /* min-h-[44px]: la medición encontró objetivos de 34 px en la app.
               44 es el mínimo con el que un dedo no falla.
               44 px is the floor at which a finger stops missing. */
            className={`min-h-[44px] rounded-lg px-1 flex flex-col items-center justify-center leading-tight
              transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              ${
                seleccionado
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            <span className="text-[13px] font-medium">{estado}</span>
            <span
              className={`text-xs tabular-nums ${
                seleccionado ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {conteos[estado]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function formatearFecha(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

/**
 * Tarjeta compacta. En el tablero una tarjeta ocupaba ~380 px —media pantalla
 * por tarea, catorce pendientes eran 5 300 px de recorrido—. Aquí el título se
 * recorta a dos líneas y el detalle a una: se ven cuatro tareas por pantalla en
 * vez de una y media.
 * The board's card took ~380 px; clamping gets four tasks per screen.
 */
function TarjetaMovil({ tarea, esPrivilegiado, onAvanzar, onEditar, onReabrir, ocupada }) {
  const vencida =
    tarea.fecha_limite && tarea.estado !== 'Hecho' && new Date(tarea.fecha_limite) < new Date()
  const avance = avanceDisponible(tarea, { esPrivilegiado })

  return (
    <li className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
        {tarea.nombre}
      </p>

      {tarea.detalles && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">{tarea.detalles}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        {tarea.area && <span className="truncate max-w-[45%]">📍 {tarea.area.nombre}</span>}
        {tarea.fecha_limite && (
          <span className={vencida ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
            {vencida ? '⚠️' : '⏰'} {formatearFecha(tarea.fecha_limite)}
          </span>
        )}
        {esPrivilegiado && tarea.asignado && (
          <span className="truncate max-w-[45%]">👤 {tarea.asignado.nombre_completo}</span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {avance && (
          <button
            type="button"
            onClick={() => onAvanzar(tarea, avance)}
            disabled={ocupada}
            /* Ancho por contenido, no completo. Tres botones azules de ancho
               completo apilados hacen que la lista se lea como una pila de
               botones y no como tareas: el nombre de la tarea deja de ser lo
               primero que ve el ojo. Con 44 px de alto y ~150 de ancho el
               objetivo táctil sigue siendo holgado.
               Content width, not full: three stacked full-width buttons make
               the list read as buttons instead of tasks. */
            className="min-h-[44px] rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50
              text-white text-sm font-medium px-5 transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
              dark:focus-visible:ring-offset-gray-800"
          >
            {/* El botón anuncia la foto ANTES de pulsarse. Un diálogo que
                aparece sin aviso, en un teléfono, se lee como un error.
                Announced up front: an unannounced dialog reads as an error. */}
            {avance.etiqueta}
            {avance.pideFoto && ' 📷'}
          </button>
        )}

        {tarea.estado === 'Hecho' && esPrivilegiado && (
          <button
            type="button"
            onClick={() => onReabrir(tarea)}
            className="min-h-[44px] px-3 rounded-lg border border-gray-200 dark:border-gray-600
              text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            ↩ Reabrir
          </button>
        )}

        {esPrivilegiado && onEditar && (
          <button
            type="button"
            onClick={() => onEditar(tarea)}
            className="min-h-[44px] px-3 rounded-lg border border-gray-200 dark:border-gray-600
              text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Editar
          </button>
        )}
      </div>
    </li>
  )
}

export default function ListaMovil({
  tareas,
  estadoActivo,
  onCambiarEstado,
  conteos,
  esPrivilegiado,
  onAvanzar,
  onEditar,
  onReabrir,
  ocupada,
}) {
  return (
    <div>
      <SelectorDeEstado activo={estadoActivo} onCambiar={onCambiarEstado} conteos={conteos} />

      {tareas.length === 0 ? (
        <p className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
          No hay tareas en {estadoActivo.toLowerCase()}.
        </p>
      ) : (
        <ul className="space-y-2 list-none p-0 m-0">
          {tareas.map((tarea) => (
            <TarjetaMovil
              key={tarea.id}
              tarea={tarea}
              esPrivilegiado={esPrivilegiado}
              onAvanzar={onAvanzar}
              onEditar={onEditar}
              onReabrir={onReabrir}
              ocupada={ocupada === tarea.id}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
