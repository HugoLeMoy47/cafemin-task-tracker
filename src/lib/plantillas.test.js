import { describe, it, expect } from 'vitest'
import {
  ordenarTareasPlantilla,
  validarPlantilla,
  validarTareaPlantilla,
  prepararTareasDesdePlantilla,
  validarNotaTurno,
} from './plantillas.js'

describe('ordenarTareasPlantilla', () => {
  it('ordena por campo orden ascendente', () => {
    const items = [
      { id: 1, nombre: 'Limpieza final', orden: 3 },
      { id: 2, nombre: 'Preparar ingredientes', orden: 1 },
      { id: 3, nombre: 'Servir platillos', orden: 2 },
    ]
    const resultado = ordenarTareasPlantilla(items)
    expect(resultado.map((x) => x.nombre)).toEqual([
      'Preparar ingredientes',
      'Servir platillos',
      'Limpieza final',
    ])
  })

  it('desempata alfabéticamente si el orden es igual', () => {
    const items = [
      { id: 1, nombre: 'Zumo', orden: 0 },
      { id: 2, nombre: 'Agua', orden: 0 },
    ]
    const resultado = ordenarTareasPlantilla(items)
    expect(resultado.map((x) => x.nombre)).toEqual(['Agua', 'Zumo'])
  })

  it('maneja arrays vacíos o nulos sin error', () => {
    expect(ordenarTareasPlantilla([])).toEqual([])
    expect(ordenarTareasPlantilla(null)).toEqual([])
  })
})

describe('validarPlantilla', () => {
  it('rechaza nombres vacíos o solo espacios', () => {
    expect(validarPlantilla({ nombre: '' })).toBe('El nombre del perfil o rutina es obligatorio.')
    expect(validarPlantilla({ nombre: '   ' })).toBe('El nombre del perfil o rutina es obligatorio.')
    expect(validarPlantilla(null)).toBe('El nombre del perfil o rutina es obligatorio.')
  })

  it('rechaza nombres mayores a 100 caracteres', () => {
    expect(validarPlantilla({ nombre: 'a'.repeat(101) })).toBe(
      'El nombre del perfil no puede exceder 100 caracteres.'
    )
  })

  it('acepta nombres válidos', () => {
    expect(validarPlantilla({ nombre: 'Asistente de Cocina' })).toBeNull()
  })
})

describe('validarTareaPlantilla', () => {
  it('rechaza tareas sin nombre', () => {
    expect(validarTareaPlantilla({ nombre: '' })).toBe('El nombre de la tarea es obligatorio.')
    expect(validarTareaPlantilla(null)).toBe('El nombre de la tarea es obligatorio.')
  })

  it('rechaza nombres mayores a 120 caracteres', () => {
    expect(validarTareaPlantilla({ nombre: 'a'.repeat(121) })).toBe(
      'El nombre de la tarea no puede exceder 120 caracteres.'
    )
  })

  it('acepta tareas válidas', () => {
    expect(validarTareaPlantilla({ nombre: 'Lavar ollas y sartenes' })).toBeNull()
  })
})

describe('prepararTareasDesdePlantilla', () => {
  const plantilla = {
    id: 'p1',
    nombre: 'Cocina',
    area_trabajo_id: 'area-cocina',
    categoria_id: 'cat-alimentacion',
  }

  const items = [
    {
      nombre: 'Picar verduras',
      detalles: 'Usar tabla verde',
      foto_requerida: false,
      area_trabajo_id: null, // heredará de plantilla
      categoria_id: null,
    },
    {
      nombre: 'Limpieza de almacén',
      detalles: null,
      foto_requerida: true,
      area_trabajo_id: 'area-bodega', // sobreescribe
      categoria_id: 'cat-limpieza', // sobreescribe
    },
    {
      nombre: '   ', // debe omitirse
    },
  ]

  it('hereda área y categoría si el ítem no las especifica', () => {
    const tareas = prepararTareasDesdePlantilla(plantilla, items, {
      asignadoId: 'voluntario-123',
      creadoPorId: 'gestor-456',
      fechaLimite: '2026-09-03',
    })

    expect(tareas).toHaveLength(2)

    // Ítem 1: hereda área y categoría de la plantilla padre
    expect(tareas[0]).toEqual({
      nombre: 'Picar verduras',
      detalles: 'Usar tabla verde',
      foto_requerida: false,
      area_trabajo_id: 'area-cocina',
      categoria_id: 'cat-alimentacion',
      asignado_id: 'voluntario-123',
      fecha_limite: '2026-09-03',
      creado_por: 'gestor-456',
      estado: 'Pendiente',
    })

    // Ítem 2: conserva su propia área y categoría específica
    expect(tareas[1]).toEqual({
      nombre: 'Limpieza de almacén',
      detalles: null,
      foto_requerida: true,
      area_trabajo_id: 'area-bodega',
      categoria_id: 'cat-limpieza',
      asignado_id: 'voluntario-123',
      fecha_limite: '2026-09-03',
      creado_por: 'gestor-456',
      estado: 'Pendiente',
    })
  })

  it('maneja listas vacías', () => {
    const res = prepararTareasDesdePlantilla(plantilla, [])
    expect(res).toEqual([])
  })
})

describe('validarNotaTurno', () => {
  it('rechaza notas vacías o solo espacios', () => {
    expect(validarNotaTurno({ mensaje: '' })).toBe('El mensaje o novedad del turno no puede estar vacío.')
    expect(validarNotaTurno({ mensaje: '   ' })).toBe('El mensaje o novedad del turno no puede estar vacío.')
    expect(validarNotaTurno(null)).toBe('El mensaje o novedad del turno no puede estar vacío.')
  })

  it('rechaza notas mayores a 1000 caracteres', () => {
    expect(validarNotaTurno({ mensaje: 'x'.repeat(1001) })).toBe(
      'El mensaje no puede exceder 1000 caracteres.'
    )
  })

  it('rechaza turnos inválidos', () => {
    expect(validarNotaTurno({ mensaje: 'Todo bien', turno: 'Invalido' })).toBe(
      'El turno seleccionado no es válido.'
    )
  })

  it('acepta notas válidas con turno permitido', () => {
    expect(
      validarNotaTurno({
        mensaje: 'Se descongeló el pollo para el almuerzo de mañana.',
        turno: 'Matutino',
      })
    ).toBeNull()
  })
})
