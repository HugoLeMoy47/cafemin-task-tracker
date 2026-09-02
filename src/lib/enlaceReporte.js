/**
 * Estado del reporte guardado en la URL.
 * Report state serialized into the URL.
 *
 * El objetivo es que una vista filtrada se pueda pegar en un correo y que
 * quien la abra vea exactamente lo mismo. Por eso el módulo es puro: recibe
 * una cadena de consulta y devuelve estado, o al revés. Nada aquí toca el
 * navegador; eso lo hace Reports.jsx.
 *
 * The point is that a filtered view can be pasted into an email and open the
 * same way for the recipient. This module is pure — string in, state out, and
 * back — so it can be tested without a DOM. Reports.jsx owns the history API.
 */

import { FILTRO_VACIO, ESTADOS, SIN_ASIGNAR, CAMPOS_ORDEN } from './reportes'

/** Valores admitidos por el selector de periodo. */
export const PERIODOS = ['todo', '30', '90']

/**
 * Tope de longitud para un valor que llega de fuera. Un nombre de persona o de
 * área nunca se acerca a esto; el límite solo evita que una URL fabricada meta
 * un texto enorme al estado y de ahí al DOM.
 * Length cap for externally supplied values: no real name comes close, it just
 * stops a hand-crafted URL from pushing a huge string into state and the DOM.
 */
const MAX_VALOR = 120

/**
 * Nombre del parámetro por cada campo del filtro.
 *
 * `busqueda` NO está aquí, y es deliberado. Los demás filtros solo pueden tomar
 * valores que ya existen en los catálogos; la búsqueda es texto libre, y en un
 * refugio para personas migrantes lo que alguien teclea ahí puede ser el nombre
 * de una persona atendida. Una URL se pega en correos, queda en el historial del
 * navegador y sobrevive al motivo por el que se compartió. El resto de la vista
 * —periodo, persona, estado, área, categoría, pestaña y orden— sí viaja, que es
 * lo que hace útil compartir el enlace.
 *
 * `busqueda` is deliberately absent. Every other filter can only hold a value
 * that already exists in a catalog; free text can hold the name of a person the
 * shelter is sheltering, and a URL outlives the reason it was shared.
 */
const PARAM = {
  periodo: 'periodo',
  persona: 'persona',
  estado: 'estado',
  area: 'area',
  categoria: 'categoria',
}

function recortar(valor) {
  return String(valor ?? '').slice(0, MAX_VALOR)
}

/**
 * Lee el estado desde una cadena de consulta.
 *
 * Todo lo que tiene un conjunto cerrado de valores —pestaña, periodo, estado,
 * campo y dirección de orden— se valida contra ese conjunto y, si no coincide,
 * cae al valor por defecto en vez de propagarse. Un enlace mal editado abre el
 * reporte en su estado normal; no rompe la vista ni deja el estado en un valor
 * imposible.
 *
 * Closed-set values are validated against their set and fall back to the
 * default instead of propagating: a mangled link opens the normal report.
 */
export function leerEnlace(cadena, { tabs, tabPorDefecto, ordenInicial }) {
  const p = new URLSearchParams(cadena || '')

  const tabPedida = p.get('tab')
  const tab = tabs.includes(tabPedida) ? tabPedida : tabPorDefecto

  const periodo = p.get(PARAM.periodo)
  const estado = p.get(PARAM.estado)

  const filtros = {
    // `busqueda` se queda en su valor vacío: no se escribe a la URL, así que
    // tampoco se lee de ella. Un enlace viejo que traiga `q=` se ignora.
    // Not written to the URL, so not read from it: a stale `q=` is ignored.
    ...FILTRO_VACIO,
    periodo: PERIODOS.includes(periodo) ? periodo : FILTRO_VACIO.periodo,
    persona: recortar(p.get(PARAM.persona) || ''),
    estado: ESTADOS.includes(estado) ? estado : '',
    area: recortar(p.get(PARAM.area) || ''),
    categoria: recortar(p.get(PARAM.categoria) || ''),
  }

  /**
   * El orden solo existe en las pestañas que listan tareas. 'Resumen' no tiene
   * tabla, así que no tiene orden: devolver uno inventado lo metería al estado
   * y de ahí a la URL, ensuciando el enlace de quien nunca ordenó nada.
   * Sort only exists on tabs that list rows; inventing one for 'Resumen' would
   * leak into the URL of someone who never sorted anything.
   */
  const base = ordenInicial[tab]
  if (!base) return { tab, filtros, orden: null }

  const orden = { ...base }
  const crudo = p.get('orden')
  if (crudo) {
    const [campo, direccion] = crudo.split(':')
    if (Object.prototype.hasOwnProperty.call(CAMPOS_ORDEN, campo)) {
      orden.campo = campo
      orden.direccion = direccion === 'asc' || direccion === 'desc' ? direccion : 'asc'
    }
  }

  return { tab, filtros, orden }
}

/**
 * Escribe el estado como cadena de consulta.
 *
 * Solo se emite lo que se aparta del valor por defecto. Sin esto, entrar a
 * reportes y no tocar nada ya ensuciaría la barra de direcciones con siete
 * parámetros, y el enlace dejaría de comunicar qué se filtró de verdad.
 * Only non-default values are emitted, so an untouched report keeps a clean
 * URL and a shared link says what was actually filtered.
 */
export function escribirEnlace({ tab, filtros, orden }, { tabPorDefecto, ordenInicial }) {
  const p = new URLSearchParams()

  if (tab && tab !== tabPorDefecto) p.set('tab', tab)

  for (const [campo, nombre] of Object.entries(PARAM)) {
    const valor = filtros?.[campo]
    if (valor && valor !== FILTRO_VACIO[campo]) p.set(nombre, valor)
  }

  const base = ordenInicial[tab]
  if (base && orden && (orden.campo !== base.campo || orden.direccion !== base.direccion)) {
    p.set('orden', `${orden.campo}:${orden.direccion}`)
  }

  return p.toString()
}

/**
 * Descarta los valores de persona, área o categoría que no existen en los
 * datos cargados.
 *
 * Sin esto, un enlace con `persona=Alguien%20Que%20Ya%20No%20Está` deja el
 * selector en blanco y la tabla en cero, y nada explica por qué: parece que el
 * reporte está roto. Descartarlo muestra el reporte completo, que es la
 * lectura honesta de "ese filtro ya no aplica".
 *
 * A link naming someone no longer in the data would leave the dropdown blank
 * and the table empty with no explanation. Dropping the value shows the full
 * report instead, which is the honest reading of "that filter no longer
 * applies".
 */
export function sanearFiltros(filtros, opciones) {
  const vive = (valor, lista) => (valor && lista.includes(valor) ? valor : '')
  return {
    ...filtros,
    // 'Sin asignar' no sale de los datos: es una opción sintética del selector.
    persona:
      filtros.persona === SIN_ASIGNAR ? SIN_ASIGNAR : vive(filtros.persona, opciones.personas),
    area: vive(filtros.area, opciones.areas),
    categoria: vive(filtros.categoria, opciones.categorias),
  }
}
