import { Leyenda, Marco } from './graficas'
import { COLOR_ESTADO, textoPrimario, textoTenue, useTooltip } from './base'
import {
  cargaPorDimension,
  metricasGlobales,
  metricasPorPersona,
  tareasRecurrentes,
} from '../../lib/reportes'

/**
 * Resumen general: la vista que responde "¿cómo vamos?" antes de entrar al
 * detalle de las tres pestañas.
 * The overview that answers "how are we doing?" before the detail tabs.
 *
 * El orden no es decorativo. Va de lo más agregado a lo más específico:
 * cifras de encabezado, el flujo completo, quién carga qué, y por último las
 * dimensiones donde se acumula el trabajo. Quien solo mira la primera pantalla
 * se lleva lo esencial.
 * The order runs from most aggregate to most specific, so whoever reads only
 * the first screen still leaves with the essentials.
 */

const fmtDias = (n) => (n === null || n === undefined ? '—' : `${n.toFixed(1)} d`)

/* ------------------------------------------------------------------ */
/* Fila de indicadores                                                 */
/* ------------------------------------------------------------------ */

function Indicador({ etiqueta, valor, nota, acento }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">{etiqueta}</p>
      <p
        className="text-3xl font-semibold mt-1 text-gray-900 dark:text-gray-50"
        style={{ fontVariantNumeric: 'tabular-nums', color: acento }}
      >
        {valor}
      </p>
      {nota && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{nota}</p>}
    </div>
  )
}

function FilaIndicadores({ m }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <Indicador etiqueta="Tareas registradas" valor={m.total} nota={`${m.hechas} cerradas`} />
      <Indicador etiqueta="Avance" valor={`${m.porcentajeCerradas}%`} nota="del total, ya cerrado" />
      <Indicador
        etiqueta="Vencidas"
        valor={m.vencidas}
        nota={m.vencidas === 0 ? 'nada fuera de plazo' : 'abiertas y fuera de plazo'}
        acento={m.vencidas > 0 ? 'var(--viz-pendiente)' : undefined}
      />
      <Indicador
        etiqueta="De alta a cierre"
        valor={fmtDias(m.totalMedio)}
        nota="promedio de las cerradas"
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* El flujo — la pieza didáctica                                       */
/* ------------------------------------------------------------------ */

/**
 * Muestra el mecanismo, no solo los totales: cuántas tareas hay DETENIDAS en
 * cada estado (las cajas) y cuántas CRUZARON cada paso y en cuánto tiempo (las
 * flechas). Tres barras darían los mismos conteos sin explicar el movimiento.
 *
 * Shows the mechanism rather than the totals: how many sit in each state, and
 * how many crossed each step and how long it took.
 */
function Flujo({ m }) {
  const { manejadores, nodo } = useTooltip()

  const W = 700
  const H = 200
  const ANCHO_CAJA = 156
  const ALTO_CAJA = 86
  const Y_CAJA = 74
  const xs = [12, 272, 532]

  // Pies cortos a propósito: a 9.5 px no caben frases largas dentro de la caja
  // sin tocar el borde. Deliberately short: longer phrases hit the box edge.
  const cajas = [
    { estado: 'Pendiente', valor: m.pendientes, pie: 'esperan que las tomen' },
    { estado: 'En curso', valor: m.enCurso, pie: 'alguien las trabaja' },
    { estado: 'Hecho', valor: m.hechas, pie: 'cerradas con evidencia' },
  ]

  // Grosor proporcional al volumen que cruzó cada paso.
  const mayor = Math.max(m.arrancaron, m.hechas, 1)
  const grosor = (n) => 6 + (n / mayor) * 30

  const pasos = [
    { desde: 0, n: m.arrancaron, dias: m.esperaMedia, texto: 'arrancaron', color: 'var(--viz-encurso)' },
    { desde: 1, n: m.hechas, dias: m.trabajoMedio, texto: 'se cerraron', color: 'var(--viz-hecho)' },
  ]

  return (
    <Marco
      titulo="Cómo fluyen las tareas"
      descripcion="Las cajas son cuántas tareas están detenidas en cada estado. Las flechas, cuántas cruzaron ese paso y cuánto tardaron en promedio."
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Flujo de tareas: ${m.pendientes} pendientes, ${m.enCurso} en curso, ${m.hechas} hechas. ${m.arrancaron} arrancaron con una espera media de ${fmtDias(m.esperaMedia)}; ${m.hechas} se cerraron con un trabajo medio de ${fmtDias(m.trabajoMedio)}.`}
      >
        {pasos.map(({ desde, n, dias: d, texto, color }) => {
          const x1 = xs[desde] + ANCHO_CAJA
          const x2 = xs[desde + 1]
          const medio = (x1 + x2) / 2
          const g = grosor(n)
          const cy = Y_CAJA + ALTO_CAJA / 2
          return (
            <g key={texto} tabIndex={0} {...manejadores(`${n} ${texto} · ${fmtDias(d)} en promedio`)}>
              <title>{`${n} tareas ${texto}, ${fmtDias(d)} en promedio`}</title>
              <path
                d={`M ${x1} ${cy - g / 2} L ${x2 - 14} ${cy - g / 2} L ${x2 - 14} ${cy - g / 2 - 6} L ${x2} ${cy} L ${x2 - 14} ${cy + g / 2 + 6} L ${x2 - 14} ${cy + g / 2} L ${x1} ${cy + g / 2} Z`}
                fill={color}
                opacity="0.85"
              />
              {/* La flecha llega a 36 px de grosor, o sea +-18 desde su eje.
                  Las etiquetas van a -42 y +42 para no montarse encima.
                  The arrow reaches 36px thick, so labels sit clear at +-42. */}
              <text x={medio} y={cy - 42} textAnchor="middle" className={`${textoPrimario} text-[13px] font-semibold`}>
                {n}
              </text>
              <text x={medio} y={cy - 30} textAnchor="middle" className={`${textoTenue} text-[10px]`}>
                {texto}
              </text>
              <text x={medio} y={cy + 42} textAnchor="middle" className={`${textoTenue} text-[11px]`}>
                {fmtDias(d)}
              </text>
            </g>
          )
        })}

        {cajas.map(({ estado, valor, pie }, i) => (
          <g key={estado}>
            <rect
              x={xs[i]}
              y={Y_CAJA}
              width={ANCHO_CAJA}
              height={ALTO_CAJA}
              rx={10}
              fill="var(--viz-superficie)"
              stroke={COLOR_ESTADO[estado]}
              strokeWidth="2"
            />
            {/* Franja superior del color del estado: el mismo código que las
                insignias del tablero, para no obligar a reaprenderlo. */}
            <rect x={xs[i]} y={Y_CAJA} width={ANCHO_CAJA} height={5} rx={2.5} fill={COLOR_ESTADO[estado]} />
            <text x={xs[i] + ANCHO_CAJA / 2} y={Y_CAJA + 40} textAnchor="middle" className={`${textoPrimario} text-[26px] font-semibold`} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {valor}
            </text>
            <text x={xs[i] + ANCHO_CAJA / 2} y={Y_CAJA + 60} textAnchor="middle" className={`${textoPrimario} text-[13px] font-medium`}>
              {estado}
            </text>
            <text x={xs[i] + ANCHO_CAJA / 2} y={Y_CAJA + 77} textAnchor="middle" className={`${textoTenue} text-[9.5px]`}>
              {pie}
            </text>
          </g>
        ))}
      </svg>
      {nodo}
      {m.sinMedicion > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {m.sinMedicion} tarea{m.sinMedicion !== 1 ? 's' : ''} cerrada
          {m.sinMedicion !== 1 ? 's' : ''} antes de que el sistema registrara el inicio del trabajo.
          No entra{m.sinMedicion !== 1 ? 'n' : ''} en los promedios de las flechas.
        </p>
      )}
    </Marco>
  )
}

/* ------------------------------------------------------------------ */
/* Espera contra trabajo, por persona                                  */
/* ------------------------------------------------------------------ */

/**
 * Las dos medidas están en días, así que se apilan en UNA escala. Ponerlas en
 * dos ejes distintos sería la forma más común de mentir con un gráfico.
 * Both measures are in days, so they stack on ONE scale.
 */
function EsperaContraTrabajo({ filas }) {
  const { manejadores, nodo } = useTooltip()
  const medibles = filas.filter((f) => f.total !== null)
  if (medibles.length === 0) {
    return (
      <Marco titulo="En qué se va el tiempo, por persona">
        <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">
          Todavía no hay tareas cerradas con marca de inicio.
        </p>
      </Marco>
    )
  }

  const W = 600
  const ALTO_FILA = 38
  const GUTTER = 172
  const RESERVA = 56
  const H = medibles.length * ALTO_FILA + 12
  const maximo = Math.max(...medibles.map((f) => f.total), 0.1)
  const anchoUtil = W - GUTTER - RESERVA

  const series = [
    { clave: 'espera', etiqueta: 'Esperando que la tomen', color: 'var(--viz-pendiente)' },
    { clave: 'trabajo', etiqueta: 'Trabajándola', color: 'var(--viz-encurso)' },
  ]

  return (
    <Marco
      titulo="En qué se va el tiempo, por persona"
      descripcion="El tiempo total puede ser parecido entre personas y aun así repartirse muy distinto. Lo primero apunta a cómo se asignan las tareas; lo segundo, a cómo se ejecutan."
    >
      <Leyenda series={series} />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label={`Tiempo medio por persona, dividido en espera y trabajo: ${medibles.map((f) => `${f.nombre}, ${fmtDias(f.espera)} de espera y ${fmtDias(f.trabajo)} de trabajo`).join('; ')}.`}>
        {medibles.map((f, i) => {
          const y = i * ALTO_FILA + 6
          let x = GUTTER
          return (
            <g key={f.nombre}>
              <g>
                <title>{f.nombre}</title>
                <text x={0} y={y + 18} className={`${textoPrimario} text-[13px]`} dominantBaseline="middle">
                  {f.nombre.length > 24 ? `${f.nombre.slice(0, 23)}…` : f.nombre}
                </text>
              </g>
              {series.map(({ clave, etiqueta, color }) => {
                const v = f[clave] || 0
                if (v <= 0) return null
                const ancho = (v / maximo) * anchoUtil
                const izq = x
                x += ancho
                return (
                  <rect key={clave} x={izq} y={y + 6} width={Math.max(ancho - 2, 1)} height={24} rx={2}
                    fill={color} tabIndex={0}
                    {...manejadores(`${f.nombre} · ${etiqueta}: ${fmtDias(v)}`)}>
                    <title>{`${f.nombre}, ${etiqueta}: ${fmtDias(v)}`}</title>
                  </rect>
                )
              })}
              <text x={GUTTER + (f.total / maximo) * anchoUtil + 8} y={y + 18}
                className={`${textoPrimario} text-[12px] font-semibold`} dominantBaseline="middle"
                style={{ fontVariantNumeric: 'tabular-nums' }}>
                {fmtDias(f.total)}
              </text>
            </g>
          )
        })}
      </svg>
      {nodo}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Promedios sobre las tareas cerradas que tienen marca de inicio; ambas cifras salen del mismo conjunto, por eso su suma es un tiempo de ciclo real.{' '}
        {medibles.map((f) => `${f.nombre.split(' ')[0]}: ${f.medibles}`).join(' · ')}.
      </p>
    </Marco>
  )
}

/* ------------------------------------------------------------------ */
/* Recurrentes y carga por dimensión                                   */
/* ------------------------------------------------------------------ */

function Recurrentes({ filas }) {
  if (filas.length === 0) {
    return (
      <Marco titulo="Tareas que se repiten">
        <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">
          Ninguna tarea se ha registrado más de una vez con el mismo nombre.
        </p>
      </Marco>
    )
  }
  const top = filas.slice(0, 8)
  return (
    <Marco
      titulo="Tareas que se repiten"
      descripcion="Agrupadas por nombre exacto. Una tarea que vuelve cada semana y siempre tarda lo mismo es candidata a volverse rutina fija; si su tiempo varía mucho, algo la está entorpeciendo."
    >
      {/* Una tabla, no un gráfico: son tres medidas por fila y lo que se hace
          con ellas es leerlas y compararlas, no estimarlas de un vistazo. */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[420px]">
          <thead className="border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Tarea</th>
              <th className="text-right px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Veces</th>
              <th className="text-right px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Cerradas</th>
              <th className="text-right px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Promedio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
            {top.map((f) => (
              <tr key={f.nombre}>
                <td className="px-2 py-2 text-gray-800 dark:text-gray-100">{f.nombre}</td>
                <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-300" style={{ fontVariantNumeric: 'tabular-nums' }}>{f.veces}</td>
                <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-300" style={{ fontVariantNumeric: 'tabular-nums' }}>{f.cerradas}</td>
                <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-300" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDias(f.totalMedio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filas.length > top.length && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Se muestran las {top.length} más frecuentes de {filas.length}.
        </p>
      )}
    </Marco>
  )
}

function Carga({ titulo, descripcion, filas }) {
  const { manejadores, nodo } = useTooltip()
  if (filas.length === 0) return null

  const W = 600
  const ALTO_FILA = 30
  const GUTTER = 130
  const RESERVA = 40
  const top = filas.slice(0, 10)
  const H = top.length * ALTO_FILA + 10
  const maximo = Math.max(...top.map((f) => f.total), 1)
  const anchoUtil = W - GUTTER - RESERVA

  return (
    <Marco titulo={titulo} descripcion={descripcion}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label={`${titulo}: ${top.map((f) => `${f.nombre} ${f.total}`).join(', ')}.`}>
        {top.map((f, i) => {
          const y = i * ALTO_FILA + 4
          let x = GUTTER
          return (
            <g key={f.nombre}>
              <text x={0} y={y + 14} className={`${textoPrimario} text-[12px]`} dominantBaseline="middle">
                {f.nombre.length > 18 ? `${f.nombre.slice(0, 17)}…` : f.nombre}
              </text>
              {['Pendiente', 'En curso', 'Hecho'].map((estado) => {
                const n = f[estado]
                if (n === 0) return null
                const ancho = (n / maximo) * anchoUtil
                const izq = x
                x += ancho
                return (
                  <rect key={estado} x={izq} y={y + 3} width={Math.max(ancho - 2, 1)} height={20} rx={2}
                    fill={COLOR_ESTADO[estado]} tabIndex={0}
                    {...manejadores(`${f.nombre} · ${estado}: ${n}`)}>
                    <title>{`${f.nombre}, ${estado}: ${n}`}</title>
                  </rect>
                )
              })}
              <text x={GUTTER + (f.total / maximo) * anchoUtil + 8} y={y + 14}
                className={`${textoPrimario} text-[12px] font-semibold`} dominantBaseline="middle"
                style={{ fontVariantNumeric: 'tabular-nums' }}>
                {f.total}
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

export default function Dashboard({ tareas }) {
  const m = metricasGlobales(tareas)

  if (tareas.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 py-10 text-center">
        Todavía no hay tareas registradas.
      </p>
    )
  }

  return (
    <div>
      <FilaIndicadores m={m} />
      <Flujo m={m} />
      <EsperaContraTrabajo filas={metricasPorPersona(tareas)} />
      <Recurrentes filas={tareasRecurrentes(tareas)} />
      <div className="grid lg:grid-cols-2 gap-0 lg:gap-4">
        <Carga
          titulo="Carga por categoría"
          descripcion="Dónde se concentra el trabajo por tipo."
          filas={cargaPorDimension(tareas, 'categoria')}
        />
        <Carga
          titulo="Carga por área"
          descripcion="Dónde se concentra el trabajo por lugar."
          filas={cargaPorDimension(tareas, 'area')}
        />
      </div>
    </div>
  )
}
