import { useState } from 'react'
import { ESTADOS, avanceDisponible } from '../lib/flujoTareas'
import EvidenceLink from './EvidenceLink'

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
function TarjetaMovil({ tarea, esPrivilegiado, onAvanzar, onSoltar, onEditar, onReabrir, ocupada }) {
  const [expandido, setExpandido] = useState(false)
  const vencida =
    tarea.fecha_limite && tarea.estado !== 'Hecho' && new Date(tarea.fecha_limite) < new Date()
  const avance = avanceDisponible(tarea, { esPrivilegiado })

  return (
    <li className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 shadow-sm">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">
        {tarea.nombre}
      </p>

      {tarea.detalles && (
        <div className="mt-1">
          <p
            className={`text-xs text-gray-600 dark:text-gray-300 ${
              expandido ? 'whitespace-pre-line' : 'line-clamp-2'
            }`}
          >
            {tarea.detalles}
          </p>
          {tarea.detalles.length > 50 && (
            <button
              type="button"
              onClick={() => setExpandido((v) => !v)}
              className="min-h-[44px] min-w-[44px] inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
            >
              {expandido ? '▲ Ocultar instrucciones' : '▼ Ver instrucciones completas'}
            </button>
          )}
        </div>
      )}

      {/* Alerta preventiva temprana de foto requerida (antes de salir del área) */}
      {tarea.foto_requerida && !tarea.evidencia_url && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900/60">
          <span aria-hidden="true">📷</span>
          <span>Requiere foto de evidencia al terminar</span>
        </div>
      )}

      {/* Recordatorio en curso */}
      {tarea.estado === 'En curso' && tarea.foto_requerida && !tarea.evidencia_url && (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/90 italic">
          💡 Toma la foto antes de retirarte del área de trabajo.
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        {tarea.area && <span className="truncate max-w-[45%]">📍 {tarea.area.nombre}</span>}
        {tarea.fecha_limite && (
          <span className={vencida ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
            {vencida ? '⚠️' : '⏰'} {formatearFecha(tarea.fecha_limite)}
          </span>
        )}
        {tarea.evidencia_url && (
          <EvidenceLink
            value={tarea.evidencia_url}
            label="📷 Ver foto"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline min-h-[44px] inline-flex items-center font-medium"
          />
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
               objetivo táctil sigue siendo holgado. */
            className="min-h-[44px] rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50
              text-white text-sm font-medium px-4 transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
              dark:focus-visible:ring-offset-gray-800 inline-flex items-center gap-1.5"
          >
            {avance.destino === 'En curso' ? (
              <>▶ Comenzar tarea</>
            ) : avance.pideFoto ? (
              <>📷 Tomar foto y concluir</>
            ) : (
              <>✓ Concluir tarea</>
            )}
          </button>
        )}

        {/* El inverso de tomar del pool. Solo aparece donde tiene sentido: una
            tarea que ESTA persona tomó (`reclamada_en`) y todavía no empieza.
            Sin él, equivocarse de tarjeta con el pulgar solo lo podía deshacer
            un Gestor — y la tarea quedaba escondida del pool para todos.
            The inverse of claiming; without it a mis-tap needed a coordinator. */}
        {!esPrivilegiado &&
          onSoltar &&
          tarea.reclamada_en &&
          tarea.estado === 'Pendiente' && (
            <button
              type="button"
              onClick={() => onSoltar(tarea)}
              disabled={ocupada}
              className="min-h-[44px] px-3 rounded-lg border border-gray-200 dark:border-gray-600
                text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                disabled:opacity-50 transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              title="Devolver esta tarea al pool para que la tome alguien más"
            >
              ↩ Soltar
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
  onSoltar,
  onEditar,
  onReabrir,
  ocupada,
}) {
  const todasTerminadas =
    !esPrivilegiado && conteos?.Pendiente === 0 && conteos?.['En curso'] === 0 && conteos?.Hecho > 0
  const sinTareas =
    conteos?.Pendiente === 0 && conteos?.['En curso'] === 0 && conteos?.Hecho === 0

  return (
    <div>
      <SelectorDeEstado activo={estadoActivo} onCambiar={onCambiarEstado} conteos={conteos} />

      {tareas.length === 0 ? (
        todasTerminadas ? (
          <div className="text-center py-10 px-4">
            <span className="text-3xl mb-2 inline-block select-none" role="img" aria-label="Celebración">
              🌟
            </span>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              ¡Completaste tus tareas pendientes!
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
              Puedes revisar tus logros del día en la pestaña &ldquo;Hecho&rdquo;. ¡Gracias por tu apoyo en CAFEMIN!
            </p>
          </div>
        ) : sinTareas ? (
          <div className="text-center py-10 px-4">
            <span className="text-3xl mb-2 inline-block select-none" role="img" aria-label="Descanso">
              ☕
            </span>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              No hay tareas registradas
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
              {esPrivilegiado ? 'Usa el botón "+ Nueva tarea" para crear una.' : '¡Todo al día por el momento!'}
            </p>
          </div>
        ) : (
          <p className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
            No hay tareas en {estadoActivo.toLowerCase()}.
          </p>
        )
      ) : (
        <ul className="space-y-2.5 list-none p-0 m-0">
          {tareas.map((tarea) => (
            <TarjetaMovil
              key={tarea.id}
              tarea={tarea}
              esPrivilegiado={esPrivilegiado}
              onAvanzar={onAvanzar}
              onSoltar={onSoltar}
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
