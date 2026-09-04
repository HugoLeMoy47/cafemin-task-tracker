/**
 * Stub del arnés de verificación móvil. No entra en el bundle de la app.
 * Stub for the mobile verification harness. Never shipped.
 *
 * ── Por qué dejó de ser un objeto de una línea ──
 *
 * La primera versión devolvía la misma lista de tareas para cualquier consulta
 * y no implementaba `.is()`. Cuando llegaron el pool, la bitácora y las
 * plantillas, el arnés reventaba con «select(...).is is not a function» y
 * `npm run test:movil` dejaba de ver justamente las pantallas nuevas — que son
 * las del voluntario, o sea las del teléfono.
 *
 * Un arnés que no sabe fallar donde falla el producto no es una red: es un
 * adorno. Así que este stub conoce tablas, filtros y RPC.
 *
 * The first version answered every query with the same task list and had no
 * `.is()`, so the harness went blind on exactly the new phone-facing screens.
 */

const PERSONAS = ['Fernanda Quiroz Bello', 'Ignacio Salcedo Vera', 'Teresa Molina Arriaga', null]
const AREAS = ['Cocina', 'Baños', 'Dormitorios', 'Ludoteca', 'Oficinas']
const CATEGORIAS = ['Limpieza', 'Mantenimiento', 'Acompañamiento', 'Administración']
const ESTADOS = ['Pendiente', 'En curso', 'Hecho']

/* Nombres realistas: largos, con acentos. Los cortos esconden los desbordes. */
const NOMBRES = [
  'Aseo y reposición de insumos en baños de planta baja',
  'Revisión del botiquín de primeros auxilios',
  'Poda del patio trasero y retiro de residuos',
  'Inventario mensual de despensa y abarrotes',
  'Acompañamiento a cita médica en el centro de salud',
  'Reparación de la llave del lavabo del dormitorio 3',
  'Recepción y clasificación de donaciones en especie',
  'Limpieza profunda de cocina y campana de extracción',
]

const dia = 86400000
const ahora = Date.now()

const tareas = []
for (let i = 0; i < 42; i++) {
  const estado = ESTADOS[i % 3]
  const creacion = new Date(ahora - (i % 45) * dia - dia)
  const persona = PERSONAS[i % 4]
  tareas.push({
    id: `stub-${String(i).padStart(4, '0')}-0000-4000-8000-000000000000`,
    nombre: NOMBRES[i % NOMBRES.length],
    detalles: 'Detalle de la tarea para la prueba de pantalla pequeña.',
    estado,
    foto_requerida: i % 3 === 0,
    evidencia_url: estado === 'Hecho' && i % 3 === 0 ? `stub-${i}/foto.jpg` : null,
    fecha_creacion: creacion.toISOString(),
    fecha_inicio: estado === 'Pendiente' ? null : new Date(creacion.getTime() + dia).toISOString(),
    fecha_limite: new Date(ahora + ((i % 20) - 6) * dia).toISOString().slice(0, 10),
    fecha_hecho: estado === 'Hecho' ? new Date(creacion.getTime() + 3 * dia).toISOString() : null,
    // Algunas tareas propias vienen «tomadas del pool»: son las únicas que
    // deben ofrecer el botón de soltar, y sin ellas el arnés no lo mediría.
    reclamada_en: persona && estado === 'Pendiente' && i % 5 === 0
      ? new Date(ahora - 3 * 3600000).toISOString()
      : null,
    plantilla_id: null,
    asignado_id: persona ? `p${i % 4}` : null,
    asignado: persona ? { id: `p${i % 4}`, nombre_completo: persona } : null,
    area: { nombre: AREAS[i % 5] },
    area_trabajo_id: `area-${i % 5}`,
    categoria: { nombre: CATEGORIAS[i % 4] },
    categoria_id: `cat-${i % 4}`,
  })
}
tareas.sort((a, b) => (a.fecha_creacion < b.fecha_creacion ? 1 : -1))

const bitacora_turnos = [
  {
    id: 'bit-1',
    mensaje:
      'Quedó pendiente reponer el gel antibacterial de la entrada; el proveedor llega mañana temprano.',
    turno: 'Matutino',
    fecha: new Date(ahora).toISOString().slice(0, 10),
    created_at: new Date(ahora - 2 * 3600000).toISOString(),
    usuario_id: 'p0',
    usuario: { nombre_completo: 'Fernanda Quiroz Bello' },
    area_trabajo_id: 'area-0',
    area: { nombre: 'Cocina' },
  },
  {
    id: 'bit-2',
    mensaje: 'La lavadora del segundo piso vuelve a tirar agua. Ya se reportó a mantenimiento.',
    turno: 'Nocturno',
    fecha: new Date(ahora - dia).toISOString().slice(0, 10),
    created_at: new Date(ahora - 26 * 3600000).toISOString(),
    usuario_id: 'p1',
    usuario: { nombre_completo: 'Ignacio Salcedo Vera' },
    area_trabajo_id: 'area-2',
    area: { nombre: 'Dormitorios' },
  },
]

const plantillas_perfil = [
  {
    id: 'plt-1',
    nombre: 'Turno de cocina — mañana',
    descripcion: 'Rutina completa de apertura de cocina y desayuno.',
    activo: true,
    area_trabajo_id: 'area-0',
    area: { nombre: 'Cocina' },
  },
  {
    id: 'plt-2',
    nombre: 'Acompañamiento y ludoteca',
    descripcion: 'Actividades con niñas y niños durante la tarde.',
    activo: true,
    area_trabajo_id: 'area-3',
    area: { nombre: 'Ludoteca' },
  },
]

const plantilla_tareas = [
  { id: 'pt-1', plantilla_id: 'plt-1', nombre: 'Revisar despensa', orden: 1, foto_requerida: false },
  { id: 'pt-2', plantilla_id: 'plt-1', nombre: 'Limpiar campana de extracción', orden: 2, foto_requerida: true },
]

const configuracion = [
  { clave: 'bitacora_alcance', valor: 'todas' },
  { clave: 'bitacora_dias', valor: '30' },
  { clave: 'pool_tope_sin_empezar', valor: '0' },
  { clave: 'pool_dias_para_soltar', valor: '1' },
]

const usuarios = PERSONAS.filter(Boolean).map((n, i) => ({
  id: `p${i}`,
  nombre_completo: n,
  correo: `persona${i}@ejemplo.test`,
  rol: 'Asignado',
  activo: true,
}))

const TABLAS = {
  tareas,
  bitacora_turnos,
  plantillas_perfil,
  plantilla_tareas,
  configuracion,
  usuarios,
  categorias: CATEGORIAS.map((n, i) => ({ id: `cat-${i}`, nombre: n })),
  areas_trabajo: AREAS.map((n, i) => ({ id: `area-${i}`, nombre: n })),
}

/**
 * Constructor de consultas encadenable y «thenable».
 *
 * Thenable a propósito: en supabase-js una consulta se puede esperar con o sin
 * `.order()` al final. Un stub que solo resuelve en `.order()` obliga a que
 * cada pantalla nueva termine igual, y esa dependencia no existe en el
 * producto — es del stub, y hace fallar el arnés por una razón inventada.
 *
 * Thenable on purpose: a real query resolves with or without a trailing
 * `.order()`.
 */
function consulta(tabla) {
  let filas = (TABLAS[tabla] || []).slice()

  const api = {
    select: () => api,
    eq: (col, val) => {
      filas = filas.filter((f) => f[col] === val)
      return api
    },
    is: (col, val) => {
      filas = filas.filter((f) => (val === null ? f[col] == null : f[col] === val))
      return api
    },
    neq: (col, val) => {
      filas = filas.filter((f) => f[col] !== val)
      return api
    },
    in: (col, vals) => {
      filas = filas.filter((f) => vals.includes(f[col]))
      return api
    },
    gte: (col, val) => {
      filas = filas.filter((f) => f[col] >= val)
      return api
    },
    lte: (col, val) => {
      filas = filas.filter((f) => f[col] <= val)
      return api
    },
    not: () => api,
    or: () => api,
    limit: (n) => {
      filas = filas.slice(0, n)
      return api
    },
    range: (a, b) => {
      filas = filas.slice(a, b + 1)
      return api
    },
    order: (col, opts) => {
      const desc = opts && opts.ascending === false
      filas.sort((a, b) => (a[col] === b[col] ? 0 : (a[col] < b[col] ? -1 : 1) * (desc ? -1 : 1)))
      return api
    },
    single: () => Promise.resolve({ data: filas[0] ?? null, error: null }),
    maybeSingle: () => Promise.resolve({ data: filas[0] ?? null, error: null }),
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: filas[0] ?? null, error: null }),
      }),
      then: (r) => r({ data: null, error: null }),
    }),
    update: () => ({
      eq: () => Promise.resolve({ data: null, error: null }),
      then: (r) => r({ data: null, error: null }),
    }),
    delete: () => ({
      eq: () => Promise.resolve({ data: null, error: null }),
      then: (r) => r({ data: null, error: null }),
    }),
    then: (resolver) => resolver({ data: filas, error: null }),
  }
  return api
}

const RESPUESTAS_RPC = {
  reclamar_tarea_abierta: { data: tareas[0], error: null },
  soltar_tarea: { data: tareas[0], error: null },
  liberar_reclamos_vencidos: { data: 0, error: null },
  iniciar_rutina_voluntario: {
    data: { success: true, plantilla: 'Turno de cocina — mañana', tareas_creadas: 2 },
    error: null,
  },
}

export const supabase = {
  from: consulta,
  rpc: (nombre) => Promise.resolve(RESPUESTAS_RPC[nombre] || { data: null, error: null }),
  auth: {
    signOut: () => Promise.resolve({ error: null }),
    getUser: () => Promise.resolve({ data: { user: { id: 'p0' } }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ error: null }),
      createSignedUrl: () => Promise.resolve({ data: { signedUrl: '#' }, error: null }),
    }),
  },
  channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
  removeChannel: () => {},
}

export function createTransientClient() {
  return supabase
}
export default supabase
