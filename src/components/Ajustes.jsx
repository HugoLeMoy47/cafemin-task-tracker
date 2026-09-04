import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { mensajeDeError } from '../lib/errores'

/**
 * Ajustes de operación del albergue.
 * Shelter operating settings.
 *
 * ── Por qué esta pantalla existe ──
 *
 * Dos decisiones de este producto no tienen una respuesta correcta que el
 * código pueda elegir por el albergue:
 *
 * 1. **Quién lee la bitácora.** Son notas en texto libre sobre la operación
 *    del día en un refugio para mujeres migrantes. Que las lea todo el
 *    voluntariado ayuda a coordinar; que las lea todo el voluntariado también
 *    significa que una persona que estará dos semanas puede leerlo todo. Esa
 *    es una decisión de dirección, no una constante.
 *
 * 2. **Cuánto puede acaparar del pool una persona.** Tomar una tarea la
 *    esconde del resto, así que quien toma de más deja el pool vacío sin
 *    haber hecho nada.
 *
 * Neither has a right answer the code can pick for the shelter.
 *
 * ── La regla de las advertencias ──
 *
 * La advertencia va JUNTO al control y cambia según lo que se elija, no en un
 * bloque genérico arriba ni en un manual. Un aviso que dice lo mismo pase lo
 * que pase se vuelve invisible en la segunda visita; el que aparece cuando se
 * amplía el acceso y desaparece cuando se restringe, se lee.
 *
 * The warning sits next to the control and changes with the choice. A notice
 * that says the same thing whatever you pick becomes invisible.
 */

const CLAVES = ['bitacora_alcance', 'bitacora_dias', 'pool_tope_sin_empezar', 'pool_dias_para_soltar']

const ALCANCES = [
  {
    valor: 'todas',
    etiqueta: 'Todo el equipo',
    resumen: 'Cualquier persona con cuenta activa lee todas las novedades.',
    // Deliberadamente redactada en términos de personas, no de permisos: quien
    // decide esto es dirección del albergue, no un administrador de sistemas.
    aviso:
      'Una persona voluntaria que esté dos semanas podrá leer todas las novedades de todas las áreas, incluidas las anteriores a su llegada. Si en la bitácora se escriben situaciones de las personas alojadas, considera un alcance más estrecho o una ventana de días más corta.',
    nivel: 'aviso',
  },
  {
    valor: 'area',
    etiqueta: 'Solo su área',
    resumen: 'Cada persona lee las novedades de las áreas donde tiene tareas.',
    aviso:
      'El área se deduce de las tareas que la persona tiene asignadas. Consecuencia: quien todavía no tiene ninguna tarea no verá novedades hasta que se le asigne la primera.',
    nivel: 'nota',
  },
  {
    valor: 'propias',
    etiqueta: 'Solo las suyas',
    resumen: 'Cada persona lee únicamente lo que ella misma escribió.',
    aviso:
      'La bitácora deja de servir para entregar el turno entre voluntarios: solo coordinación verá el panorama completo.',
    nivel: 'nota',
  },
]

function Campo({ titulo, descripcion, children, aviso, nivel }) {
  return (
    <div className="py-5 border-t border-gray-200 dark:border-gray-700 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{titulo}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[62ch]">{descripcion}</p>
      <div className="mt-3">{children}</div>
      {aviso && (
        <p
          className={`mt-3 text-xs rounded-lg px-3 py-2 max-w-[62ch] border ${
            nivel === 'aviso'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          {nivel === 'aviso' ? '⚠ ' : ''}
          {aviso}
        </p>
      )}
    </div>
  )
}

const claseNumero =
  'w-24 border border-gray-300 dark:border-gray-600 rounded-lg px-3 min-h-[44px] text-sm ' +
  'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function Ajustes() {
  const [valores, setValores] = useState(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState('')
  const [guardado, setGuardado] = useState('')

  const cargar = useCallback(async () => {
    const { data, error: err } = await supabase.from('configuracion').select('clave, valor')
    if (err) {
      setError(mensajeDeError(err, 'No se pudieron leer los ajustes.'))
      return
    }
    setValores(Object.fromEntries((data || []).map((r) => [r.clave, r.valor])))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function guardar(clave, valor) {
    const previos = valores
    setError('')
    setGuardando(clave)
    // Optimista: el control responde al instante. Si la base rechaza, se
    // regresa el valor anterior y se dice por qué, en vez de dejar la pantalla
    // mostrando algo que no se guardó.
    setValores((v) => ({ ...v, [clave]: valor }))

    const { error: err } = await supabase
      .from('configuracion')
      .update({ valor, actualizado_en: new Date().toISOString() })
      .eq('clave', clave)

    if (err) {
      setValores(previos)
      setError(mensajeDeError(err, 'No se pudo guardar el ajuste.'))
    } else {
      setGuardado(clave)
      setTimeout(() => setGuardado(''), 2500)
    }
    setGuardando('')
  }

  if (error && !valores) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl px-4 py-3">
          {error}
        </p>
      </div>
    )
  }

  if (!valores) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando ajustes…</p>
  }

  const alcance = valores.bitacora_alcance || 'todas'
  const alcanceElegido = ALCANCES.find((a) => a.valor === alcance) || ALCANCES[0]
  const tope = Number(valores.pool_tope_sin_empezar ?? 0)
  const diasSoltar = Number(valores.pool_dias_para_soltar ?? 1)
  const diasBitacora = Number(valores.bitacora_dias ?? 30)

  const marca = (clave) =>
    guardando === clave ? (
      <span className="text-xs text-gray-400 ml-2">guardando…</span>
    ) : guardado === clave ? (
      <span className="text-xs text-emerald-700 dark:text-emerald-400 ml-2">✓ guardado</span>
    ) : null

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ajustes</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-[62ch]">
          Decisiones de operación que dependen de cómo trabaja este albergue, no del sistema.
          Aplican de inmediato para todo el equipo.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-4 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl px-4 py-3"
        >
          {error}
        </p>
      )}

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
          Bitácora de turno
        </h3>

        <Campo
          titulo={<>Quién lee las novedades {marca('bitacora_alcance')}</>}
          descripcion="Quien coordina y quien administra siempre ven todas las novedades: leerlas es su trabajo. Este ajuste decide qué ve el resto del equipo."
          aviso={alcanceElegido.aviso}
          nivel={alcanceElegido.nivel}
        >
          <div className="flex flex-col gap-2">
            {ALCANCES.map((a) => (
              <label
                key={a.valor}
                className="flex items-start gap-3 min-h-[44px] px-3 py-2 rounded-xl border cursor-pointer transition-colors
                  border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40
                  has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-950/40"
              >
                <input
                  type="radio"
                  name="bitacora_alcance"
                  value={a.valor}
                  checked={alcance === a.valor}
                  onChange={() => guardar('bitacora_alcance', a.valor)}
                  className="mt-1 w-4 h-4 accent-blue-600"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                    {a.etiqueta}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{a.resumen}</span>
                </span>
              </label>
            ))}
          </div>
        </Campo>

        <Campo
          titulo={<>Cuántos días hacia atrás se ven {marca('bitacora_dias')}</>}
          descripcion="Una bitácora sirve para entregar el turno, no para consultar el año pasado. Acortar la ventana reduce lo que queda expuesto sin quitarle utilidad."
          aviso={
            diasBitacora === 0
              ? 'Sin límite: se verá el historial completo desde el primer día del sistema.'
              : null
          }
          nivel="aviso"
        >
          <label className="inline-flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="number"
              min="0"
              max="3650"
              value={diasBitacora}
              onChange={(e) => guardar('bitacora_dias', String(Math.max(0, Number(e.target.value) || 0)))}
              className={claseNumero}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">días · 0 = sin límite</span>
          </label>
        </Campo>
      </section>

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
          Pool de tareas abiertas
        </h3>

        <Campo
          titulo={<>Máximo de tareas tomadas sin empezar {marca('pool_tope_sin_empezar')}</>}
          descripcion="Tomar una tarea la esconde del resto del equipo, así que quien toma muchas y no empieza deja el pool vacío. Solo cuenta lo que la persona tomó por su cuenta: lo que asignó coordinación no cuenta."
          aviso={
            tope > 0 && tope < 3
              ? `Un tope de ${tope} frena también a quien trabaja rápido. Si no has visto acaparamiento, 0 es la mejor primera opción.`
              : tope === 0
                ? 'Sin tope. La devolución automática de abajo suele bastar: quien toma de más y se va, libera solo.'
                : null
          }
          nivel={tope > 0 && tope < 3 ? 'aviso' : 'nota'}
        >
          <label className="inline-flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="number"
              min="0"
              max="50"
              value={tope}
              onChange={(e) =>
                guardar('pool_tope_sin_empezar', String(Math.max(0, Number(e.target.value) || 0)))
              }
              className={claseNumero}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">tareas · 0 = sin tope</span>
          </label>
        </Campo>

        <Campo
          titulo={<>Devolver al pool lo que nadie empezó {marca('pool_dias_para_soltar')}</>}
          descripcion="Una tarea tomada y no empezada vuelve al pool sola después de este plazo. Lo que asignó coordinación nunca se devuelve solo: eso sería deshacer la decisión de otra persona."
          aviso={
            diasSoltar === 0
              ? 'Apagado: lo que alguien tome y abandone se queda tomado hasta que esa persona lo suelte o coordinación lo reasigne.'
              : null
          }
          nivel="aviso"
        >
          <label className="inline-flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="number"
              min="0"
              max="30"
              value={diasSoltar}
              onChange={(e) =>
                guardar('pool_dias_para_soltar', String(Math.max(0, Number(e.target.value) || 0)))
              }
              className={claseNumero}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">días · 0 = nunca</span>
          </label>
        </Campo>
      </section>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-5 max-w-[62ch]">
        Estos ajustes los aplica la base de datos, no la pantalla: cambiarlos surte efecto aunque
        alguien tenga la aplicación abierta desde antes.
      </p>
    </div>
  )
}

export { CLAVES, ALCANCES }
