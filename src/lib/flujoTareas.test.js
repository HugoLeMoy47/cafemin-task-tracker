import { describe, it, expect } from 'vitest'
import { ESTADOS, siguienteEstado, avanceDisponible, puedeMover } from './flujoTareas'

const T = (extra = {}) => ({
  id: 't1',
  nombre: 'Tarea',
  estado: 'Pendiente',
  foto_requerida: false,
  evidencia_url: null,
  ...extra,
})

const ASIGNADO = { esPrivilegiado: false }
const GESTOR = { esPrivilegiado: true }

describe('siguienteEstado', () => {
  it('recorre el flujo en orden / walks the flow in order', () => {
    expect(siguienteEstado('Pendiente')).toBe('En curso')
    expect(siguienteEstado('En curso')).toBe('Hecho')
  })

  it('Hecho es el final / Hecho is the end', () => {
    expect(siguienteEstado('Hecho')).toBeNull()
  })

  it('un estado inventado no inventa destino / unknown state yields none', () => {
    expect(siguienteEstado('Cancelada')).toBeNull()
    expect(siguienteEstado(undefined)).toBeNull()
  })
})

describe('avanceDisponible', () => {
  it('ofrece el avance con su etiqueta / offers the move with its label', () => {
    expect(avanceDisponible(T(), ASIGNADO)).toEqual({
      destino: 'En curso',
      etiqueta: 'Marcar en curso',
      pideFoto: false,
    })
    expect(avanceDisponible(T({ estado: 'En curso' }), ASIGNADO)).toEqual({
      destino: 'Hecho',
      etiqueta: 'Marcar hecha',
      pideFoto: false,
    })
  })

  it('no ofrece nada sobre una tarea ya hecha / nothing to offer on a done task', () => {
    expect(avanceDisponible(T({ estado: 'Hecho' }), ASIGNADO)).toBeNull()
    expect(avanceDisponible(T({ estado: 'Hecho' }), GESTOR)).toBeNull()
  })

  it('anuncia que va a pedir foto / announces the photo requirement', () => {
    // El botón lo dice antes de pulsarse. Un diálogo que aparece sin aviso, en
    // un teléfono, se lee como un error.
    const a = avanceDisponible(T({ estado: 'En curso', foto_requerida: true }), ASIGNADO)
    expect(a.pideFoto).toBe(true)
  })

  it('no pide foto si la tarea ya tiene evidencia / not when evidence exists', () => {
    const a = avanceDisponible(
      T({ estado: 'En curso', foto_requerida: true, evidencia_url: 't1/foto.jpg' }),
      ASIGNADO
    )
    expect(a.pideFoto).toBe(false)
  })

  it('no pide foto al pasar a En curso / never on the first step', () => {
    expect(avanceDisponible(T({ foto_requerida: true }), ASIGNADO).pideFoto).toBe(false)
  })

  it('Admin y Gestor se saltan la foto, como en el tablero', () => {
    // Es la excepción de producto documentada en KanbanBoard, no un descuido.
    const a = avanceDisponible(T({ estado: 'En curso', foto_requerida: true }), GESTOR)
    expect(a.pideFoto).toBe(false)
  })

  it('una tarea nula no revienta / a null task is handled', () => {
    expect(avanceDisponible(null, ASIGNADO)).toBeNull()
  })
})

describe('puedeMover — espejo de PT002', () => {
  it('el Asignado avanza / a non-privileged person moves forward', () => {
    expect(puedeMover(T(), 'En curso', ASIGNADO)).toBe(true)
    expect(puedeMover(T({ estado: 'En curso' }), 'Hecho', ASIGNADO)).toBe(true)
  })

  it('el Asignado NO reabre / cannot reopen', () => {
    expect(puedeMover(T({ estado: 'Hecho' }), 'En curso', ASIGNADO)).toBe(false)
    expect(puedeMover(T({ estado: 'Hecho' }), 'Pendiente', ASIGNADO)).toBe(false)
  })

  it('Admin y Gestor sí reabren / privileged roles can reopen', () => {
    expect(puedeMover(T({ estado: 'Hecho' }), 'En curso', GESTOR)).toBe(true)
  })

  it('mover al mismo estado no es un movimiento / same state is a no-op', () => {
    expect(puedeMover(T(), 'Pendiente', ASIGNADO)).toBe(false)
  })

  it('un destino inventado se rechaza / an unknown destination is refused', () => {
    expect(puedeMover(T(), 'Cancelada', GESTOR)).toBe(false)
  })

  it('los estados son los tres del esquema / the three states of the schema', () => {
    expect(ESTADOS).toEqual(['Pendiente', 'En curso', 'Hecho'])
  })
})
