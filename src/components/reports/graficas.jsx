import { ESTADOS } from '../../lib/reportes'
import { COLOR_ESTADO, textoPrimario, textoTenue, useTooltip } from './base'

/**
 * Gráficas de los reportes, en SVG hecho a mano.
 * Report charts, hand-authored SVG.
 *
 * Sin librería de gráficas a propósito: Recharts o Chart.js sumarían entre 150
 * y 250 KB a un bundle de 460 KB para dibujar barras y una línea.
 *
 * Reglas que se siguen en las tres:
 * - El color va por el token del estado, el MISMO que usan las insignias.
 * - El texto usa tokens de texto, nunca el color de la serie: el color lo
 *   carga la marca, no el número.
 * - Rejilla y ejes recesivos; separación de 2 px entre segmentos apilados.
 * - Leyenda siempre que haya dos o más series, más etiqueta directa.
 * - Capa de hover con tooltip, y <title> dentro del SVG para lector de
 *   pantalla y para el tooltip nativo si el JS falla.
 *
 * No chart library on purpose. Text wears text tokens, never the series color.
 */

export function Marco({ titulo, descripcion, children }) {
  return (
    <figure className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-5" data-viz-marco>
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{titulo}</h3>
        {descripcion && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{descripcion}</p>
        )}
      </figcaption>
      {children}
    </figure>
  )
}

export function Leyenda({ series }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-3 list-none p-0 m-0">
      {series.map(({ etiqueta, color }) => (
        <li key={etiqueta} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
          <span
            aria-hidden="true"
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ background: color }}
          />
          {etiqueta}
        </li>
      ))}
    </ul>
  )
}

function SinDatos({ children = 'Sin datos para graficar.' }) {
  return <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">{children}</p>
}

/* ------------------------------------------------------------------ */
/* 1. Por estado — barras horizontales                                 */
/* ------------------------------------------------------------------ */

export function GraficaEstado({ datos }) {
  const { manejadores, nodo } = useTooltip()
  const total = datos.reduce((a, d) => a + d.conteo, 0)
  if (total === 0) return <Marco titulo="Tareas por estado"><SinDatos /></Marco>

  const W = 600
  const ALTO_FILA = 40
  const GUTTER = 88 // columna de etiquetas
  const RESERVA = 78 // espacio del valor y el porcentaje al final de la barra
  const H = datos.length * ALTO_FILA + 12
  const maximo = Math.max(...datos.map((d) => d.conteo), 1)
  const anchoUtil = W - GUTTER - RESERVA

  return (
    <Marco
      titulo="Tareas por estado"
      descripcion={`${total} tareas en total. La longitud de cada barra es proporcional al número de tareas.`}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Barras de tareas por estado: ${datos.map((d) => `${d.estado} ${d.conteo}`).join(', ')}.`}
      >
        {datos.map((d, i) => {
          const y = i * ALTO_FILA + 6
          const ancho = Math.max((d.conteo / maximo) * anchoUtil, d.conteo > 0 ? 3 : 0)
          const pct = Math.round((d.conteo / total) * 100)
          return (
            <g key={d.estado}>
              <text x={0} y={y + 20} className={`${textoPrimario} text-[13px]`} dominantBaseline="middle">
                {d.estado}
              </text>
              {/* Riel recesivo: da referencia de escala sin competir con el dato. */}
              <rect x={GUTTER} y={y + 8} width={anchoUtil} height={24} rx={4} fill="var(--viz-rejilla)" opacity="0.5" />
              <rect
                x={GUTTER}
                y={y + 8}
                width={ancho}
                height={24}
                rx={4}
                fill={COLOR_ESTADO[d.estado]}
                tabIndex={0}
                {...manejadores(`${d.estado}: ${d.conteo} tarea${d.conteo !== 1 ? 's' : ''} (${pct}%)`)}
              >
                <title>{`${d.estado}: ${d.conteo} tareas (${pct}%)`}</title>
              </rect>
              <text
                x={GUTTER + ancho + 8}
                y={y + 20}
                className={`${textoPrimario} text-[13px] font-semibold`}
                dominantBaseline="middle"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {d.conteo}
              </text>
              <text
                x={GUTTER + ancho + 8 + String(d.conteo).length * 8 + 6}
                y={y + 20}
                className={`${textoTenue} text-[11px]`}
                dominantBaseline="middle"
              >
                {pct}%
              </text>
            </g>
          )
        })}
      </svg>
      {nodo}
    </Marco>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Por asignado — barras apiladas horizontales                      */
/* ------------------------------------------------------------------ */

export function GraficaAsignado({ datos }) {
  const { manejadores, nodo } = useTooltip()
  if (datos.length === 0) return <Marco titulo="Carga por persona"><SinDatos /></Marco>

  const W = 600
  const ALTO_FILA = 38
  const GUTTER = 172
  const RESERVA = 40
  const H = datos.length * ALTO_FILA + 12
  const maximo = Math.max(...datos.map((d) => d.total), 1)
  const anchoUtil = W - GUTTER - RESERVA

  return (
    <Marco
      titulo="Carga por persona"
      descripcion="Cada barra es el total de tareas de una persona, dividido por estado. Ordenadas de mayor a menor carga."
    >
      <Leyenda series={ESTADOS.map((e) => ({ etiqueta: e, color: COLOR_ESTADO[e] }))} />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Barras apiladas de carga por persona: ${datos.map((d) => `${d.nombre} ${d.total}`).join(', ')}.`}
      >
        {datos.map((d, i) => {
          const y = i * ALTO_FILA + 6
          let x = GUTTER
          return (
            <g key={d.nombre}>
              {/* El <title> va en el <g>, no dentro del <text>: anidado en el
                  texto, el navegador lo suma a la caja del elemento y el
                  nombre se mide (y puede dibujarse) dos veces.
                  The <title> belongs on the <g>: nested inside <text> the
                  browser folds it into the element's box. */}
              <g>
                <title>{d.nombre}</title>
                <text x={0} y={y + 18} className={`${textoPrimario} text-[13px]`} dominantBaseline="middle">
                  {d.nombre.length > 24 ? `${d.nombre.slice(0, 23)}…` : d.nombre}
                </text>
              </g>
              {ESTADOS.map((estado) => {
                const n = d[estado]
                if (n === 0) return null
                const ancho = (n / maximo) * anchoUtil
                const izq = x
                x += ancho
                return (
                  <rect
                    key={estado}
                    x={izq}
                    y={y + 6}
                    // 2 px de separación entre segmentos: sin ella, dos colores
                    // contiguos se leen como una sola masa.
                    width={Math.max(ancho - 2, 1)}
                    height={24}
                    rx={2}
                    fill={COLOR_ESTADO[estado]}
                    tabIndex={0}
                    {...manejadores(`${d.nombre} · ${estado}: ${n}`)}
                  >
                    <title>{`${d.nombre}, ${estado}: ${n} tareas`}</title>
                  </rect>
                )
              })}
              <text
                x={GUTTER + (d.total / maximo) * anchoUtil + 8}
                y={y + 18}
                className={`${textoPrimario} text-[13px] font-semibold`}
                dominantBaseline="middle"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {d.total}
              </text>
            </g>
          )
        })}
      </svg>
      {nodo}
    </Marco>
  )
}

/* ------------------------------------------------------------------ */
/* 3. Semanal — creadas contra cerradas                                */
/* ------------------------------------------------------------------ */

export function GraficaSemanal({ datos }) {
  const { manejadores, nodo } = useTooltip()
  const hayAlgo = datos.some((d) => d.creadas > 0 || d.cerradas > 0)
  if (!hayAlgo) return <Marco titulo="Creadas contra cerradas, por semana"><SinDatos /></Marco>

  const W = 620
  const H = 220
  const IZQ = 32
  const DER = 12
  const ARR = 12
  const ABA = 34
  const anchoUtil = W - IZQ - DER
  const altoUtil = H - ARR - ABA

  const maximo = Math.max(...datos.flatMap((d) => [d.creadas, d.cerradas]), 1)
  // Escala redondeada hacia arriba: un tope en el valor exacto pega la serie
  // al borde superior y parece truncada.
  const tope = Math.ceil(maximo / 5) * 5 || 5

  const px = (i) => IZQ + (datos.length === 1 ? anchoUtil / 2 : (i / (datos.length - 1)) * anchoUtil)
  const py = (v) => ARR + altoUtil - (v / tope) * altoUtil

  const series = [
    { clave: 'creadas', etiqueta: 'Creadas', color: 'var(--viz-encurso)' },
    { clave: 'cerradas', etiqueta: 'Cerradas', color: 'var(--viz-hecho)' },
  ]

  const marcasY = [0, tope / 2, tope]

  return (
    <Marco
      titulo="Creadas contra cerradas, por semana"
      descripcion="Si la línea de cerradas se queda por debajo de la de creadas semana tras semana, el pendiente crece. La última semana va en punteado porque aún no termina."
    >
      <Leyenda series={series} />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Líneas de tareas creadas y cerradas por semana durante ${datos.length} semanas.`}
      >
        {marcasY.map((v) => (
          <g key={v}>
            <line x1={IZQ} x2={W - DER} y1={py(v)} y2={py(v)} stroke="var(--viz-rejilla)" strokeWidth="1" />
            <text x={IZQ - 6} y={py(v)} textAnchor="end" dominantBaseline="middle" className={`${textoTenue} text-[10px]`}>
              {v}
            </text>
          </g>
        ))}

        {datos.map((d, i) =>
          // Una etiqueta de cada dos: con diez semanas, todas se encimarían.
          i % 2 === datos.length % 2 ? (
            <text key={d.clave} x={px(i)} y={H - 12} textAnchor="middle" className={`${textoTenue} text-[10px]`}>
              {d.etiqueta}
            </text>
          ) : null
        )}

        {series.map(({ clave, color }) => (
          <g key={clave}>
            {/* Tramo cerrado: semanas completas. */}
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={datos.slice(0, -1).map((d, i) => `${px(i)},${py(d[clave])}`).join(' ')}
            />
            {/* Último tramo punteado: la semana en curso siempre va incompleta y
                sin marcarla su bajada se lee como una caída real del ritmo.
                The current week is always partial; undashed, its dip reads as a
                genuine drop in throughput. */}
            {datos.length >= 2 && (
              <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeLinecap="round"
                points={`${px(datos.length - 2)},${py(datos[datos.length - 2][clave])} ${px(datos.length - 1)},${py(datos[datos.length - 1][clave])}`}
              />
            )}
          </g>
        ))}

        {series.map(({ clave, etiqueta, color }) =>
          datos.map((d, i) => (
            <circle
              key={`${clave}-${d.clave}`}
              cx={px(i)}
              cy={py(d[clave])}
              r={4}
              fill={i === datos.length - 1 ? 'var(--viz-superficie)' : color}
              // Anillo: separa los marcadores cuando las dos series se cruzan.
              // El de la semana en curso va hueco, con el color por fuera.
              stroke={i === datos.length - 1 ? color : 'var(--viz-superficie)'}
              tabIndex={0}
              {...manejadores(`Semana del ${d.etiqueta} · ${etiqueta}: ${d[clave]}`)}
            >
              <title>{`Semana del ${d.etiqueta}, ${etiqueta}: ${d[clave]} tareas`}</title>
            </circle>
          ))
        )}
      </svg>
      {nodo}
    </Marco>
  )
}
