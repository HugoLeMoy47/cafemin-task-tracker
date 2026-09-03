import { useState } from 'react'

/**
 * Piezas compartidas de las gráficas: tokens de color, clases de texto y el
 * enganche de tooltip.
 * Shared chart pieces: color tokens, text classes and the tooltip hook.
 *
 * Viven aparte de graficas.jsx porque ese archivo exporta componentes, y
 * mezclar componentes con constantes y hooks en un mismo módulo rompe el
 * refresco en caliente durante el desarrollo.
 * They live apart because mixing components with constants and hooks in one
 * module breaks fast refresh during development.
 */

export const COLOR_ESTADO = {
  Pendiente: 'var(--viz-pendiente)',
  'En curso': 'var(--viz-encurso)',
  Hecho: 'var(--viz-hecho)',
}

/**
 * Días con un decimal, o una raya cuando no hay dato. Vive aquí y no en
 * Dashboard porque ahora lo usan el dibujo de escritorio y la versión vertical
 * del teléfono, y dos formateadores distintos acaban mostrando «1.0 d» en una
 * pantalla y «1 d» en la otra para el mismo número.
 * Shared so the desktop drawing and the phone version cannot format the same
 * number two different ways.
 */
export const fmtDias = (n) => (n === null || n === undefined ? '—' : `${n.toFixed(1)} d`)

export const textoPrimario = 'fill-gray-700 dark:fill-gray-200'
export const textoTenue = 'fill-gray-500 dark:fill-gray-400'

/* ------------------------------------------------------------------ */
/* Piezas compartidas / Shared pieces                                  */
/* ------------------------------------------------------------------ */

export function useTooltip() {
  const [tip, setTip] = useState(null)

  const manejadores = (contenido) => ({
    onMouseEnter: (e) => mover(e, contenido),
    onMouseMove: (e) => mover(e, contenido),
    onMouseLeave: () => setTip(null),
    // Foco por teclado: el tooltip no puede depender solo del ratón.
    // Keyboard focus: the tooltip cannot be mouse-only.
    onFocus: (e) => {
      const caja = e.currentTarget.getBoundingClientRect()
      const padre = e.currentTarget.closest('[data-viz-marco]')?.getBoundingClientRect()
      if (!padre) return
      setTip({
        x: caja.left - padre.left + caja.width / 2,
        y: caja.top - padre.top,
        contenido,
      })
    },
    onBlur: () => setTip(null),
  })

  function mover(e, contenido) {
    const padre = e.currentTarget.closest('[data-viz-marco]')?.getBoundingClientRect()
    if (!padre) return
    setTip({ x: e.clientX - padre.left, y: e.clientY - padre.top, contenido })
  }

  const nodo = tip ? (
    <div
      role="status"
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs text-white shadow-lg whitespace-nowrap"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      {tip.contenido}
    </div>
  ) : null

  return { manejadores, nodo }
}
