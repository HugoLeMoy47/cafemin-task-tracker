import { COLOR_ESTADO, fmtDias } from './base'

/**
 * El flujo de tareas, para un teléfono.
 * The task flow, for a phone.
 *
 * ── Por qué no es el mismo SVG más chico ──
 *
 * Se midió: el dibujo usa un `viewBox` de 700 px de ancho y en un Android de
 * 360 se pinta a 294, o sea a escala 0.42. Un texto de 10 px del dibujo aterriza
 * a 4.0 px REALES. Los números grandes sobreviven; las etiquetas que explican
 * qué significan —«esperan que las tomen», «arrancaron», «1.0 d»— se vuelven
 * manchas grises. Y son justamente esas etiquetas las que hacen que el diagrama
 * signifique algo: sin ellas quedan tres números sueltos.
 *
 * Measured: at 360 px the SVG renders at scale 0.42, so its 10 px labels land
 * at 4.0 real pixels. The big numbers survive; the words that make the diagram
 * mean anything do not.
 *
 * ── Y por qué vertical ──
 *
 * Tres cajas y dos flechas en horizontal dan ~90 px por caja en una pantalla de
 * 360: apretado incluso a escala 1. Un teléfono es alto, no ancho, así que el
 * flujo se lee hacia abajo. Y al ser HTML y no SVG, el texto respeta el tamaño
 * de letra que la persona configuró en su aparato — que en un refugio, con
 * gente de todas las edades, no es un detalle.
 *
 * HTML, not SVG, so the text honors the reader's system font size.
 *
 * Muestra lo mismo que el dibujo de escritorio: las cajas son inventario
 * —cuántas tareas están DETENIDAS en cada estado— y los pasos entre ellas son
 * movimiento —cuántas CRUZARON y en cuánto tiempo—.
 */
export default function FlujoVertical({ m }) {
  const cajas = [
    { estado: 'Pendiente', valor: m.pendientes, pie: 'esperan que las tomen' },
    { estado: 'En curso', valor: m.enCurso, pie: 'alguien las trabaja' },
    { estado: 'Hecho', valor: m.hechas, pie: 'cerradas con evidencia' },
  ]

  const pasos = [
    { n: m.arrancaron, dias: m.esperaMedia, texto: 'arrancaron', color: 'var(--viz-encurso)' },
    { n: m.hechas, dias: m.trabajoMedio, texto: 'se cerraron', color: 'var(--viz-hecho)' },
  ]

  return (
    <div className="flex flex-col">
      {cajas.map(({ estado, valor, pie }, i) => (
        <div key={estado}>
          <div
            className="rounded-xl border-2 bg-white dark:bg-gray-800 px-4 py-3 flex items-center gap-4"
            style={{ borderColor: COLOR_ESTADO[estado] }}
          >
            <span
              className="text-3xl font-semibold text-gray-900 dark:text-gray-100 min-w-[2.2ch] text-right"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {valor}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{estado}</span>
              {/* text-xs = 12 px: el piso por debajo del cual, en una pantalla
                  de baja densidad, el texto es decorativo y no legible.
                  12 px is the floor below which small text stops being read. */}
              <span className="block text-xs text-gray-500 dark:text-gray-400">{pie}</span>
            </span>
          </div>

          {/* El paso hacia la siguiente caja. Va entre las dos, no al lado, y
              lleva su conteo y su tiempo en texto de tamaño normal. */}
          {i < pasos.length && (
            <div className="flex items-stretch gap-4 pl-4 py-1">
              <div className="flex flex-col items-center w-[2.2ch]">
                <span
                  className="w-[3px] flex-1 rounded"
                  style={{ background: pasos[i].color, minHeight: '14px' }}
                  aria-hidden="true"
                />
                <span className="text-[11px] leading-none -mt-1" style={{ color: pasos[i].color }} aria-hidden="true">
                  ▼
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 py-1">
                <strong className="font-semibold text-gray-900 dark:text-gray-100">{pasos[i].n}</strong>{' '}
                {pasos[i].texto}
                {pasos[i].dias != null && (
                  <>
                    {' · '}
                    <span className="text-gray-500 dark:text-gray-400">
                      {fmtDias(pasos[i].dias)} en promedio
                    </span>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
