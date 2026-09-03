import { useSyncExternalStore } from 'react'

/**
 * ¿Estamos en una pantalla de teléfono?
 * Are we on a phone-sized screen?
 *
 * El corte es el mismo `sm:` de Tailwind (640 px), para que la decisión de
 * JavaScript y las clases de CSS no puedan discrepar. Si un día se mueve el
 * breakpoint en `tailwind.config.js`, hay que moverlo aquí también — y por eso
 * la constante está exportada y nombrada, en vez de escondida en la cadena.
 *
 * Same breakpoint as Tailwind's `sm:`, so the JS decision and the CSS classes
 * cannot disagree.
 *
 * ── Por qué un hook y no solo clases de CSS ──
 *
 * Esconder el tablero con `hidden sm:flex` dejaría montados los dos árboles:
 * el `DndContext` seguiría vivo en el teléfono, con sus sensores escuchando, y
 * el navegador cargaría el doble de nodos en el aparato que menos aguanta. Se
 * decide en JavaScript y se renderiza uno solo.
 *
 * Hiding one tree with CSS would keep both mounted — including the drag
 * context and its sensors — on the device least able to afford it.
 */
export const CONSULTA_PANTALLA_CHICA = '(max-width: 639px)'

function suscribir(alCambiar) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia(CONSULTA_PANTALLA_CHICA)
  // `addEventListener` no existe en Safari anterior a 14; el respaldo importa
  // porque este es justamente el proyecto donde hay aparatos viejos.
  // Older Safari lacks addEventListener on MediaQueryList.
  if (mq.addEventListener) {
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }
  mq.addListener(alCambiar)
  return () => mq.removeListener(alCambiar)
}

function leer() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(CONSULTA_PANTALLA_CHICA).matches
}

/**
 * Se usa `useSyncExternalStore` en vez de `useState` + `useEffect` porque el
 * valor se lee ya en el primer render: con el efecto, la primera pintura sería
 * siempre la de escritorio y el teléfono mostraría el tablero de tres columnas
 * durante un cuadro antes de corregirse.
 * Read on the first render, so a phone never flashes the desktop board.
 */
export function usePantallaChica() {
  return useSyncExternalStore(suscribir, leer, () => false)
}
