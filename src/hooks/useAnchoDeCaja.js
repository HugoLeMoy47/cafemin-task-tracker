import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Ancho real, en píxeles, del elemento al que se ata.
 * The element's real width in pixels.
 *
 * ── El problema que resuelve ──
 *
 * Un `<svg viewBox="0 0 600 160" class="w-full">` no dibuja a 600 px: dibuja a
 * lo ancho que le toque y escala TODO, el texto incluido. En un Android de 360
 * ese dibujo se pinta a 294 px —escala 0.49— y una etiqueta declarada de
 * 13 px aterriza a 6.4 px reales. El número del código y el número de la
 * pantalla son distintos, y esa diferencia es invisible leyendo el código:
 * hicieron falta tres rondas de trabajo en móvil para verla, y la vio una
 * medición, no una revisión.
 *
 * A viewBox'd SVG scales everything including text: a 13 px label inside a
 * 600-wide viewBox painted at 294 px lands at 6.4 real pixels.
 *
 * ── La solución ──
 *
 * En vez de dibujar en un lienzo imaginario y encogerlo, se mide el hueco
 * disponible y se dibuja a ese tamaño. Escala 1, y entonces 13 px son 13 px en
 * cualquier pantalla. Como efecto secundario, cada gráfica puede repartir el
 * espacio de otra manera cuando hay poco —nombres arriba en vez de al lado—,
 * que es lo que de verdad hace legible un teléfono; escalar solo achica.
 *
 * Instead of drawing on an imaginary canvas and shrinking it, measure the real
 * space and draw at that size. Scale 1, so 13 px is 13 px.
 *
 * Devuelve `null` en el primer render, antes de haber medido. Quien lo use no
 * debe dibujar hasta tener un número: inventar un ancho por defecto produce un
 * primer cuadro con la maquetación equivocada y un salto visible.
 * Returns `null` before the first measurement — do not guess a default.
 */
export function useAnchoDeCaja() {
  const [ancho, setAncho] = useState(null)
  const observador = useRef(null)

  // Callback ref en vez de useEffect + useRef: así se mide en cuanto el nodo
  // existe, y se vuelve a medir solo si el nodo cambia.
  const ref = useCallback((nodo) => {
    observador.current?.disconnect()
    if (!nodo) return
    setAncho(nodo.clientWidth)
    // ResizeObserver y no `resize` de window: la caja cambia de ancho por
    // muchas razones que no son girar el teléfono —abrir un panel, aparecer
    // una barra de desplazamiento—, y ninguna dispara un evento de ventana.
    const obs = new ResizeObserver(([e]) => setAncho(Math.round(e.contentRect.width)))
    obs.observe(nodo)
    observador.current = obs
  }, [])

  useEffect(() => () => observador.current?.disconnect(), [])

  return [ref, ancho]
}
