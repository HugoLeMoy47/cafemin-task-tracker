import { describe, it, expect } from 'vitest'
import { leerEnlace, escribirEnlace, sanearFiltros, PERIODOS } from './enlaceReporte'
import { FILTRO_VACIO } from './reportes'

const TABS = ['Resumen', 'Por Estado', 'Por Asignado', 'Por Fecha']

/**
 * Copia fiel del mapa de Reports.jsx. 'Resumen' NO aparece a propósito: no
 * lista tareas, así que no tiene orden. Un fixture que le inventara una entrada
 * dejaría pasar el bug de ensuciar la URL con `orden=` al entrar sin filtrar.
 * Faithful copy of the map in Reports.jsx — 'Resumen' is absent on purpose.
 */
const ORDEN_INICIAL = {
  'Por Estado': { campo: 'creada', direccion: 'desc' },
  'Por Asignado': { campo: 'tarea', direccion: 'asc' },
  'Por Fecha': { campo: 'creada', direccion: 'desc' },
}
const OPC = { tabs: TABS, tabPorDefecto: 'Resumen', ordenInicial: ORDEN_INICIAL }

describe('leerEnlace', () => {
  it('sin parámetros devuelve el estado por defecto / empty query yields defaults', () => {
    const r = leerEnlace('', OPC)
    expect(r.tab).toBe('Resumen')
    expect(r.filtros).toEqual(FILTRO_VACIO)
  })

  it('la pestaña Resumen no tiene orden / the summary tab carries no sort', () => {
    expect(leerEnlace('', OPC).orden).toBeNull()
    // Ni siquiera si el enlace trae uno: ahí no hay tabla que ordenar.
    expect(leerEnlace('?tab=Resumen&orden=tarea:asc', OPC).orden).toBeNull()
  })

  it('lee filtros, pestaña y orden / reads filters, tab and sort', () => {
    const r = leerEnlace(
      '?tab=Por%20Fecha&q=ba%C3%B1os&periodo=30&persona=Beto&estado=Hecho&area=Patio&categoria=Salud&orden=tarea:asc',
      OPC
    )
    expect(r.tab).toBe('Por Fecha')
    expect(r.filtros).toEqual({
      busqueda: 'baños',
      periodo: '30',
      persona: 'Beto',
      estado: 'Hecho',
      area: 'Patio',
      categoria: 'Salud',
    })
    expect(r.orden).toEqual({ campo: 'tarea', direccion: 'asc' })
  })

  it('una pestaña inexistente cae a la de inicio / unknown tab falls back', () => {
    expect(leerEnlace('?tab=Inventada', OPC).tab).toBe('Resumen')
  })

  it('un periodo inventado cae a "todo" / unknown period falls back', () => {
    expect(leerEnlace('?periodo=9999', OPC).filtros.periodo).toBe('todo')
    for (const p of PERIODOS) {
      expect(leerEnlace(`?periodo=${p}`, OPC).filtros.periodo).toBe(p)
    }
  })

  it('un estado inventado se descarta / unknown state is dropped', () => {
    expect(leerEnlace('?estado=Cancelada', OPC).filtros.estado).toBe('')
  })

  it('un campo de orden inexistente cae al de la pestaña / unknown sort field falls back', () => {
    expect(leerEnlace('?tab=Por%20Asignado&orden=inventado:asc', OPC).orden).toEqual(
      ORDEN_INICIAL['Por Asignado']
    )
  })

  it('una dirección inválida cae a asc / invalid direction falls back to asc', () => {
    expect(leerEnlace('?tab=Por%20Fecha&orden=tarea:lateral', OPC).orden).toEqual({
      campo: 'tarea',
      direccion: 'asc',
    })
  })

  it('recorta un valor absurdamente largo / caps an absurdly long value', () => {
    const largo = 'x'.repeat(500)
    expect(leerEnlace(`?persona=${largo}`, OPC).filtros.persona.length).toBe(120)
  })
})

describe('escribirEnlace', () => {
  it('el estado por defecto no produce parámetros / defaults produce no query', () => {
    expect(escribirEnlace({ tab: 'Resumen', filtros: FILTRO_VACIO, orden: null }, OPC)).toBe('')
  })

  it('no emite orden en una pestaña sin tabla / no sort param on a tabless tab', () => {
    // Aunque el estado traiga un orden colgado, 'Resumen' no lo publica.
    const q = escribirEnlace(
      { tab: 'Resumen', filtros: FILTRO_VACIO, orden: { campo: 'tarea', direccion: 'asc' } },
      OPC
    )
    expect(q).toBe('')
  })

  it('solo emite lo que se apartó del valor por defecto / emits only non-defaults', () => {
    const q = escribirEnlace(
      {
        tab: 'Por Estado',
        filtros: { ...FILTRO_VACIO, persona: 'Beto' },
        orden: ORDEN_INICIAL['Por Estado'],
      },
      OPC
    )
    const p = new URLSearchParams(q)
    expect([...p.keys()].sort()).toEqual(['persona', 'tab'])
  })

  it('emite el orden solo si difiere del inicial de esa pestaña / sort only when changed', () => {
    const igual = escribirEnlace(
      { tab: 'Por Fecha', filtros: FILTRO_VACIO, orden: { campo: 'creada', direccion: 'desc' } },
      OPC
    )
    expect(new URLSearchParams(igual).get('orden')).toBeNull()

    const distinto = escribirEnlace(
      { tab: 'Por Fecha', filtros: FILTRO_VACIO, orden: { campo: 'creada', direccion: 'asc' } },
      OPC
    )
    expect(new URLSearchParams(distinto).get('orden')).toBe('creada:asc')
  })
})

describe('ida y vuelta / round trip', () => {
  it('escribir y volver a leer devuelve el mismo estado', () => {
    const estado = {
      tab: 'Por Asignado',
      filtros: {
        busqueda: 'poda & riego',
        periodo: '90',
        persona: 'Lucía Ferrer',
        estado: 'En curso',
        area: 'Patio',
        categoria: 'Mantenimiento',
      },
      orden: { campo: 'limite', direccion: 'asc' },
    }
    const vuelta = leerEnlace(`?${escribirEnlace(estado, OPC)}`, OPC)
    expect(vuelta).toEqual(estado)
  })

  it('sobrevive a acentos, espacios y ampersands / survives accents and separators', () => {
    const estado = {
      tab: 'Por Fecha',
      filtros: { ...FILTRO_VACIO, busqueda: 'baños & niños=sí?' },
      orden: ORDEN_INICIAL['Por Fecha'],
    }
    const vuelta = leerEnlace(`?${escribirEnlace(estado, OPC)}`, OPC)
    expect(vuelta.filtros.busqueda).toBe('baños & niños=sí?')
  })
})

describe('sanearFiltros', () => {
  const opciones = {
    personas: ['Beto Aguilar', 'Lucía Ferrer'],
    areas: ['Patio', 'Cocina'],
    categorias: ['Salud'],
  }

  it('conserva lo que existe en los datos / keeps values present in the data', () => {
    const f = { ...FILTRO_VACIO, persona: 'Beto Aguilar', area: 'Patio', categoria: 'Salud' }
    expect(sanearFiltros(f, opciones)).toEqual(f)
  })

  it('descarta a quien ya no aparece en los datos / drops a person no longer present', () => {
    const f = { ...FILTRO_VACIO, persona: 'Alguien Que Se Fue' }
    expect(sanearFiltros(f, opciones).persona).toBe('')
  })

  it('conserva "Sin asignar", que no sale de los datos / keeps the synthetic option', () => {
    const f = { ...FILTRO_VACIO, persona: 'Sin asignar' }
    expect(sanearFiltros(f, opciones).persona).toBe('Sin asignar')
  })

  it('no toca la búsqueda ni el periodo ni el estado / leaves free-text fields alone', () => {
    const f = { ...FILTRO_VACIO, busqueda: 'poda', periodo: '30', estado: 'Hecho' }
    const r = sanearFiltros(f, opciones)
    expect(r.busqueda).toBe('poda')
    expect(r.periodo).toBe('30')
    expect(r.estado).toBe('Hecho')
  })
})
