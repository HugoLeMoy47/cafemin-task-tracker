/* Stub para el arnés móvil. Solo vive en el contenedor. */

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
    asignado: persona ? { id: `p${i % 4}`, nombre_completo: persona } : null,
    area: { nombre: AREAS[i % 5] },
    categoria: { nombre: CATEGORIAS[i % 4] },
  })
}
tareas.sort((a, b) => (a.fecha_creacion < b.fecha_creacion ? 1 : -1))

function consulta() {
  const api = {
    select: () => api,
    eq: () => api,
    order: () => Promise.resolve({ data: tareas, error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
  }
  return api
}

export const supabase = {
  from: consulta,
  rpc: () => Promise.resolve({ data: null, error: null }),
  auth: {
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
  storage: { from: () => ({ upload: () => Promise.resolve({ error: null }) }) },
  channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
  removeChannel: () => {},
}

export function createTransientClient() {
  return supabase
}
export default supabase
