import { describe, it, expect } from 'vitest'
import {
  MENSAJES_VICTORIA,
  obtenerMensajeVictoria,
  calcularProgresoVoluntario,
  obtenerMensajeProgreso,
} from './gamificacion.js'

describe('obtenerMensajeVictoria', () => {
  it('devuelve un mensaje de la lista con índice determinista', () => {
    expect(obtenerMensajeVictoria(0)).toBe(MENSAJES_VICTORIA[0])
    expect(obtenerMensajeVictoria(1)).toBe(MENSAJES_VICTORIA[1])
  })

  it('hace wrap-around si el índice excede la longitud', () => {
    const len = MENSAJES_VICTORIA.length
    expect(obtenerMensajeVictoria(len)).toBe(MENSAJES_VICTORIA[0])
  })

  it('devuelve un mensaje válido sin índice', () => {
    const msg = obtenerMensajeVictoria()
    expect(MENSAJES_VICTORIA).toContain(msg)
  })
})

describe('calcularProgresoVoluntario', () => {
  it('maneja listas vacías o nulas', () => {
    const vacio = calcularProgresoVoluntario([])
    expect(vacio).toEqual({
      total: 0,
      pendientes: 0,
      enCurso: 0,
      hechas: 0,
      porcentaje: 0,
      todasCompletadas: false,
      hayPendientes: false,
    })

    const nulo = calcularProgresoVoluntario(null)
    expect(nulo.total).toBe(0)
    expect(nulo.todasCompletadas).toBe(false)
  })

  it('calcula correctamente con tareas repartidas', () => {
    const tareas = [
      { id: '1', estado: 'Pendiente' },
      { id: '2', estado: 'En curso' },
      { id: '3', estado: 'Hecho' },
      { id: '4', estado: 'Hecho' },
    ]
    const p = calcularProgresoVoluntario(tareas)
    expect(p.total).toBe(4)
    expect(p.pendientes).toBe(1)
    expect(p.enCurso).toBe(1)
    expect(p.hechas).toBe(2)
    expect(p.porcentaje).toBe(50)
    expect(p.todasCompletadas).toBe(false)
    expect(p.hayPendientes).toBe(true)
  })

  it('detecta victoria total cuando todas están hechas', () => {
    const tareas = [
      { id: '1', estado: 'Hecho' },
      { id: '2', estado: 'Hecho' },
    ]
    const p = calcularProgresoVoluntario(tareas)
    expect(p.total).toBe(2)
    expect(p.hechas).toBe(2)
    expect(p.porcentaje).toBe(100)
    expect(p.todasCompletadas).toBe(true)
    expect(p.hayPendientes).toBe(false)
  })
})

describe('obtenerMensajeProgreso', () => {
  it('informa cuando no hay tareas', () => {
    expect(obtenerMensajeProgreso(null)).toBe('No tienes tareas asignadas por ahora.')
    expect(obtenerMensajeProgreso({ total: 0 })).toBe('No tienes tareas asignadas por ahora.')
  })

  it('celebra cuando todas están completadas', () => {
    const msg = obtenerMensajeProgreso({ total: 3, hechas: 3, todasCompletadas: true, porcentaje: 100 })
    expect(msg).toContain('Completaste todas tus tareas de hoy')
  })

  it('da mensaje de inicio cuando no lleva ninguna hecha', () => {
    const msg1 = obtenerMensajeProgreso({ total: 1, hechas: 0, todasCompletadas: false, porcentaje: 0 })
    expect(msg1).toContain('Tienes 1 tarea asignada')

    const msg3 = obtenerMensajeProgreso({ total: 3, hechas: 0, todasCompletadas: false, porcentaje: 0 })
    expect(msg3).toContain('Tienes 3 tareas asignadas')
  })

  it('avisa cuando solo falta 1 tarea', () => {
    const msg = obtenerMensajeProgreso({ total: 4, hechas: 3, todasCompletadas: false, porcentaje: 75 })
    expect(msg).toContain('Solo te falta 1 tarea')
  })

  it('muestra gran avance con más del 50%', () => {
    const msg = obtenerMensajeProgreso({ total: 6, hechas: 4, todasCompletadas: false, porcentaje: 67 })
    expect(msg).toContain('¡Gran avance!')
  })

  it('muestra buen inicio con menos del 50%', () => {
    const msg = obtenerMensajeProgreso({ total: 6, hechas: 2, todasCompletadas: false, porcentaje: 33 })
    expect(msg).toContain('¡Buen inicio!')
  })
})
