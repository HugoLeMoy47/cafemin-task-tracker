/**
 * Agregaciones para los reportes.
 * Report aggregations.
 *
 * Funciones PURAS a propósito: reciben las tareas y devuelven datos planos.
 * Las gráficas solo dibujan lo que sale de aquí, así que la lógica que puede
 * estar mal —los conteos y los cortes de semana— se prueba sin navegador.
 *
 * Deliberately PURE: the charts only draw what these return, so the logic that
 * can actually be wrong is testable without a browser.
 */

/** Orden del flujo. No alfabético: es la secuencia real de una tarea. */
export const ESTADOS = ['Pendiente', 'En curso', 'Hecho']

export const SIN_ASIGNAR = 'Sin asignar'

/**
 * Conteo por estado, siempre con los tres presentes aunque alguno sea cero.
 * Un estado ausente del gráfico se lee como "no existe", no como "está vacío".
 * Always includes all three states even at zero: a missing bar reads as
 * "does not exist" rather than "is empty".
 */
export function resumenPorEstado(tareas) {
  return ESTADOS.map((estado) => ({
    estado,
    conteo: tareas.filter((t) => t.estado === estado).length,
  }))
}

/**
 * Desglose por persona: cuántas tiene en cada estado.
 * Se ordena por total descendente para que la mayor carga quede arriba, y a
 * igualdad de total, alfabético, para que el orden sea estable entre recargas.
 * Sorted by total desc, then alphabetically so the order is stable.
 */
export function resumenPorAsignado(tareas) {
  const mapa = new Map()

  for (const t of tareas) {
    const nombre = t.asignado?.nombre_completo || SIN_ASIGNAR
    if (!mapa.has(nombre)) {
      mapa.set(nombre, { nombre, Pendiente: 0, 'En curso': 0, Hecho: 0, total: 0 })
    }
    const fila = mapa.get(nombre)
    if (ESTADOS.includes(t.estado)) fila[t.estado] += 1
    fila.total += 1
  }

  return [...mapa.values()].sort(
    (a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es')
  )
}

/**
 * Lunes 00:00 (hora local) de la semana a la que pertenece una fecha.
 * Se usa el lunes porque es el inicio de semana laboral en México; con domingo
 * el corte partiría los fines de semana a la mitad.
 * Monday because that is the start of the working week here.
 */
export function inicioDeSemana(fecha) {
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return null
  const diaDesdeLunes = (d.getDay() + 6) % 7 // domingo=0 → 6
  d.setDate(d.getDate() - diaDesdeLunes)
  d.setHours(0, 0, 0, 0)
  return d
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * Serie semanal de tareas creadas y cerradas.
 *
 * Se generan TODAS las semanas del rango, incluidas las vacías: saltarse una
 * semana sin actividad comprime el eje y hace que un hueco parezca continuidad.
 * Every week in the range is emitted, including empty ones: skipping a quiet
 * week compresses the axis and makes a gap look like continuity.
 *
 * @param {number} semanas cuántas semanas hacia atrás, contando la actual
 * @param {Date} referencia hoy; parametrizado para poder probarlo
 */
export function serieSemanal(tareas, semanas = 10, referencia = new Date()) {
  const semanaActual = inicioDeSemana(referencia)
  if (!semanaActual) return []

  const cubos = []
  const indice = new Map()

  for (let i = semanas - 1; i >= 0; i--) {
    const inicio = new Date(semanaActual)
    inicio.setDate(inicio.getDate() - i * 7)
    const cubo = {
      inicio,
      clave: inicio.toISOString().slice(0, 10),
      etiqueta: `${inicio.getDate()} ${MESES[inicio.getMonth()]}`,
      creadas: 0,
      cerradas: 0,
    }
    cubos.push(cubo)
    indice.set(cubo.clave, cubo)
  }

  const acumular = (iso, campo) => {
    if (!iso) return
    const semana = inicioDeSemana(iso)
    if (!semana) return
    const cubo = indice.get(semana.toISOString().slice(0, 10))
    if (cubo) cubo[campo] += 1 // fuera del rango: se ignora, no se apila en el borde
  }

  for (const t of tareas) {
    acumular(t.fecha_creacion, 'creadas')
    acumular(t.fecha_hecho, 'cerradas')
  }

  return cubos
}

/* ==================================================================== */
/* Métricas de desempeño                                                */
/*                                                                      */
/* Las tareas sin `fecha_inicio` quedan FUERA de los promedios y se      */
/* cuentan aparte. Esa columna se llena hacia adelante desde su          */
/* migración, así que el histórico previo no la tiene; promediar sobre   */
/* ella como si fuera cero inventaría un desempeño que nadie midió.      */
/*                                                                      */
/* Tasks without `fecha_inicio` are excluded from averages and counted   */
/* separately: that column only fills forward, so averaging over it as   */
/* if it were zero would invent performance nobody measured.             */
/* ==================================================================== */

const DIA_MS = 86400000

/** Diferencia en días entre dos fechas ISO. null si falta alguna. */
export function dias(desde, hasta) {
  if (!desde || !hasta) return null
  const a = new Date(desde).getTime()
  const b = new Date(hasta).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return (b - a) / DIA_MS
}

function promedio(valores) {
  const utiles = valores.filter((v) => v !== null && Number.isFinite(v))
  if (utiles.length === 0) return null
  return utiles.reduce((a, v) => a + v, 0) / utiles.length
}

export function estaVencida(t, ahora = new Date()) {
  if (!t.fecha_limite || t.estado === 'Hecho') return false
  const limite = new Date(t.fecha_limite)
  if (Number.isNaN(limite.getTime())) return false
  const hoy = new Date(ahora)
  hoy.setHours(0, 0, 0, 0)
  return limite < hoy
}

/**
 * Cifras de encabezado y tiempos del flujo completo.
 * Headline figures and end-to-end flow times.
 */
export function metricasGlobales(tareas, ahora = new Date()) {
  const hechas = tareas.filter((t) => t.estado === 'Hecho')
  const enCurso = tareas.filter((t) => t.estado === 'En curso')
  const pendientes = tareas.filter((t) => t.estado === 'Pendiente')

  // Arrancaron = tienen sello de inicio, sin importar dónde estén ahora.
  const arrancaron = tareas.filter((t) => t.fecha_inicio)
  const cerradasMedibles = hechas.filter((t) => t.fecha_inicio)

  return {
    total: tareas.length,
    pendientes: pendientes.length,
    enCurso: enCurso.length,
    hechas: hechas.length,
    arrancaron: arrancaron.length,
    vencidas: tareas.filter((t) => estaVencida(t, ahora)).length,
    porcentajeCerradas: tareas.length ? Math.round((hechas.length / tareas.length) * 100) : 0,
    esperaMedia: promedio(arrancaron.map((t) => dias(t.fecha_creacion, t.fecha_inicio))),
    trabajoMedio: promedio(cerradasMedibles.map((t) => dias(t.fecha_inicio, t.fecha_hecho))),
    totalMedio: promedio(hechas.map((t) => dias(t.fecha_creacion, t.fecha_hecho))),
    // Cerradas antes de que existiera la marca de inicio: se nombran para que
    // nadie lea los promedios como si cubrieran todo el histórico.
    sinMedicion: hechas.filter((t) => !t.fecha_inicio).length,
  }
}

/**
 * Desempeño por persona: espera contra trabajo.
 *
 * Ambas se miden sobre la MISMA población —las tareas cerradas que tienen
 * marca de inicio— para que su suma sea un tiempo de ciclo real. Promediar la
 * espera sobre todas las iniciadas y el trabajo solo sobre las cerradas daría
 * dos cifras de universos distintos, y sumarlas no significaría nada.
 *
 * Both are measured over the SAME population --closed tasks with a start
 * stamp-- so their sum is a real cycle time. Averaging waiting over every
 * started task and working over only the closed ones would mix two universes,
 * and adding them would mean nothing.
 *
 * Ambas en días, así que se apilan en una sola escala en vez de recurrir a dos
 * ejes, que sería la forma más común de mentir con un gráfico.
 */
export function metricasPorPersona(tareas) {
  const mapa = new Map()

  for (const t of tareas) {
    const nombre = t.asignado?.nombre_completo || SIN_ASIGNAR
    if (!mapa.has(nombre)) mapa.set(nombre, { nombre, esperas: [], trabajos: [], cerradas: 0, abiertas: 0 })
    const f = mapa.get(nombre)

    if (t.estado === 'Hecho') f.cerradas += 1
    else f.abiertas += 1

    if (t.estado === 'Hecho' && t.fecha_inicio) {
      f.esperas.push(dias(t.fecha_creacion, t.fecha_inicio))
      f.trabajos.push(dias(t.fecha_inicio, t.fecha_hecho))
    }
  }

  return [...mapa.values()]
    .map(({ nombre, esperas, trabajos, cerradas, abiertas }) => {
      const espera = promedio(esperas)
      const trabajo = promedio(trabajos)
      return {
        nombre,
        cerradas,
        abiertas,
        espera,
        trabajo,
        total: espera === null && trabajo === null ? null : (espera || 0) + (trabajo || 0),
        medibles: trabajos.length,
      }
    })
    .sort((a, b) => (b.total ?? -1) - (a.total ?? -1) || a.nombre.localeCompare(b.nombre, 'es'))
}

/**
 * Tareas que se repiten, agrupadas por nombre exacto.
 * @param {number} minimo cuántas repeticiones para considerarla recurrente
 */
export function tareasRecurrentes(tareas, minimo = 2) {
  const mapa = new Map()

  for (const t of tareas) {
    const clave = (t.nombre || '').trim()
    if (!clave) continue
    if (!mapa.has(clave)) mapa.set(clave, { nombre: clave, veces: 0, cerradas: 0, duraciones: [] })
    const f = mapa.get(clave)
    f.veces += 1
    if (t.estado === 'Hecho') {
      f.cerradas += 1
      f.duraciones.push(dias(t.fecha_creacion, t.fecha_hecho))
    }
  }

  return [...mapa.values()]
    .filter((f) => f.veces >= minimo)
    .map(({ nombre, veces, cerradas, duraciones }) => ({
      nombre,
      veces,
      cerradas,
      totalMedio: promedio(duraciones),
    }))
    .sort((a, b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre, 'es'))
}

/**
 * Carga por dimensión del catálogo (categoría o área).
 * @param {'categoria'|'area'} dimension
 */
export function cargaPorDimension(tareas, dimension) {
  const mapa = new Map()

  for (const t of tareas) {
    const nombre = t[dimension]?.nombre || 'Sin asignar'
    if (!mapa.has(nombre)) {
      mapa.set(nombre, { nombre, Pendiente: 0, 'En curso': 0, Hecho: 0, total: 0 })
    }
    const f = mapa.get(nombre)
    if (ESTADOS.includes(t.estado)) f[t.estado] += 1
    f.total += 1
  }

  return [...mapa.values()].sort(
    (a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es')
  )
}

/* ==================================================================== */
/* Filtrado y ordenamiento                                              */
/*                                                                      */
/* Una sola barra de filtros gobierna TODO: el resumen, las tres        */
/* pestañas y la exportación. Las pestañas dejan de ser filtros y son   */
/* lo que siempre fueron en realidad: formas de agrupar el mismo        */
/* conjunto. Sin esa regla, el botón de exportar mentiría —descargaría  */
/* 90 filas mientras la pantalla muestra 12—.                           */
/*                                                                      */
/* One filter bar governs EVERYTHING: overview, tabs and export. The    */
/* tabs are groupings, not filters. Without that rule the export button */
/* would lie.                                                           */
/* ==================================================================== */

export const FILTRO_VACIO = {
  busqueda: '',
  periodo: 'todo', // 'todo' | '30' | '90'
  persona: '',
  estado: '',
  area: '',
  categoria: '',
}

export function hayFiltrosActivos(f) {
  return (
    f.busqueda.trim() !== '' ||
    f.periodo !== 'todo' ||
    f.persona !== '' ||
    f.estado !== '' ||
    f.area !== '' ||
    f.categoria !== ''
  )
}

/**
 * Quita acentos y pasa a minúsculas.
 * En español buscar "bano" tiene que encontrar "Baños": exigir el acento
 * convierte el buscador en un examen de ortografía.
 * Searching "bano" must find "Baños"; requiring the accent turns the search
 * box into a spelling test.
 */
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Opciones de los desplegables, derivadas de los datos que hay. */
export function opcionesDeFiltro(tareas) {
  const unico = (valores) =>
    [...new Set(valores.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
  return {
    personas: unico(tareas.map((t) => t.asignado?.nombre_completo)),
    areas: unico(tareas.map((t) => t.area?.nombre)),
    categorias: unico(tareas.map((t) => t.categoria?.nombre)),
  }
}

export function aplicarFiltros(tareas, filtros, ahora = new Date()) {
  const q = normalizar(filtros.busqueda).trim()
  const dias = filtros.periodo === 'todo' ? null : Number(filtros.periodo)

  let desde = null
  if (dias) {
    desde = new Date(ahora)
    desde.setDate(desde.getDate() - dias)
    desde.setHours(0, 0, 0, 0)
  }

  return tareas.filter((t) => {
    if (q && !normalizar(t.nombre).includes(q)) return false
    if (filtros.estado && t.estado !== filtros.estado) return false
    if (filtros.persona && (t.asignado?.nombre_completo || SIN_ASIGNAR) !== filtros.persona)
      return false
    if (filtros.area && t.area?.nombre !== filtros.area) return false
    if (filtros.categoria && t.categoria?.nombre !== filtros.categoria) return false
    if (desde) {
      const creada = new Date(t.fecha_creacion)
      if (Number.isNaN(creada.getTime()) || creada < desde) return false
    }
    return true
  })
}

/* -------------------------------------------------------------------- */
/* Ordenamiento                                                          */
/* -------------------------------------------------------------------- */

/** Campos ordenables y cómo se extrae su valor comparable. */
export const CAMPOS_ORDEN = {
  tarea: { tipo: 'texto', valor: (t) => t.nombre },
  estado: { tipo: 'estado', valor: (t) => t.estado },
  asignado: { tipo: 'texto', valor: (t) => t.asignado?.nombre_completo || null },
  categoria: { tipo: 'texto', valor: (t) => t.categoria?.nombre || null },
  area: { tipo: 'texto', valor: (t) => t.area?.nombre || null },
  creada: { tipo: 'fecha', valor: (t) => t.fecha_creacion },
  limite: { tipo: 'fecha', valor: (t) => t.fecha_limite },
  hecha: { tipo: 'fecha', valor: (t) => t.fecha_hecho },
}

function comparable(valor, tipo) {
  if (valor === null || valor === undefined || valor === '') return null
  if (tipo === 'fecha') {
    const ms = new Date(valor).getTime()
    return Number.isNaN(ms) ? null : ms
  }
  if (tipo === 'estado') {
    const i = ESTADOS.indexOf(valor)
    return i === -1 ? null : i
  }
  return String(valor)
}

/**
 * Ordena sin mutar el arreglo original.
 *
 * Los vacíos van SIEMPRE al final, en ambas direcciones. Un valor ausente no
 * es "el más pequeño": es que no existe, y arrastrarlo al principio al invertir
 * el orden esconde las filas que sí tienen dato.
 * Empty values always sort last, in BOTH directions: a missing value is not
 * "smallest", it is absent.
 *
 * El estado se ordena por el flujo (Pendiente, En curso, Hecho), no
 * alfabéticamente, que daría "En curso, Hecho, Pendiente" y no significa nada.
 * State sorts by flow order, not alphabetically.
 */
export function ordenarTareas(tareas, campo, direccion = 'asc') {
  const def = CAMPOS_ORDEN[campo]
  if (!def) return [...tareas]
  const signo = direccion === 'desc' ? -1 : 1

  return [...tareas].sort((a, b) => {
    const va = comparable(def.valor(a), def.tipo)
    const vb = comparable(def.valor(b), def.tipo)

    if (va === null && vb === null) return 0
    if (va === null) return 1
    if (vb === null) return -1

    const cmp = def.tipo === 'texto' ? va.localeCompare(vb, 'es') : va - vb
    // Desempate estable por nombre, para que dos recargas den el mismo orden.
    return cmp !== 0 ? cmp * signo : String(a.nombre).localeCompare(String(b.nombre), 'es')
  })
}
