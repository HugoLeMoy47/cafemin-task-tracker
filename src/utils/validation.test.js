import { describe, it, expect } from 'vitest'
import {
  normalizeText,
  validateEmail,
  validatePassword,
  validateTaskPayload,
  validateImageFile,
} from './validation.js'

/**
 * Pruebas del módulo de validación — es la última barrera antes de que
 * datos del usuario lleguen a Supabase (tareas y evidencia fotográfica).
 * Tests for the validation module — the last gate before user data
 * reaches Supabase (tasks and photo evidence).
 */

describe('normalizeText', () => {
  it('recorta espacios de una cadena / trims a string', () => {
    expect(normalizeText('  hola  ')).toBe('hola')
  })

  it('devuelve cadena vacía para no-cadenas / returns empty string for non-strings', () => {
    expect(normalizeText(null)).toBe('')
    expect(normalizeText(undefined)).toBe('')
    expect(normalizeText(42)).toBe('')
    expect(normalizeText({})).toBe('')
    expect(normalizeText([])).toBe('')
  })

  it('convierte una cadena de solo espacios en vacía / collapses whitespace-only to empty', () => {
    expect(normalizeText('   \t\n  ')).toBe('')
  })
})

describe('validateEmail', () => {
  it('acepta correos válidos / accepts valid addresses', () => {
    expect(validateEmail('gerardo@cafemin.org')).toBe(true)
    expect(validateEmail('  hugo.legorreta@gmail.com  ')).toBe(true)
    expect(validateEmail('a+etiqueta@sub.dominio.mx')).toBe(true)
  })

  it('rechaza correos inválidos / rejects invalid addresses', () => {
    expect(validateEmail('')).toBe(false)
    expect(validateEmail('sinarroba.com')).toBe(false)
    expect(validateEmail('sin@dominio')).toBe(false)
    expect(validateEmail('con espacio@dominio.com')).toBe(false)
    expect(validateEmail('@dominio.com')).toBe(false)
  })

  it('rechaza entradas que no son cadena / rejects non-string input', () => {
    expect(validateEmail(null)).toBe(false)
    expect(validateEmail(undefined)).toBe(false)
    expect(validateEmail(12345)).toBe(false)
  })
})

describe('validatePassword', () => {
  it('acepta 6 caracteres o más / accepts 6+ characters', () => {
    expect(validatePassword('123456')).toBe(true)
    expect(validatePassword('contraseña-larga-segura')).toBe(true)
  })

  it('rechaza menos de 6 caracteres / rejects fewer than 6 characters', () => {
    expect(validatePassword('12345')).toBe(false)
    expect(validatePassword('')).toBe(false)
  })

  it('rechaza entradas que no son cadena / rejects non-string input', () => {
    expect(validatePassword(null)).toBe(false)
    expect(validatePassword(undefined)).toBe(false)
    expect(validatePassword(123456)).toBe(false)
  })
})

describe('validateTaskPayload', () => {
  it('acepta una tarea válida / accepts a valid task', () => {
    expect(validateTaskPayload({ nombre: 'Revisar bodega', detalles: 'Piso 2' })).toBeNull()
  })

  it('acepta detalles vacíos o ausentes / accepts empty or missing details', () => {
    expect(validateTaskPayload({ nombre: 'Revisar bodega', detalles: '' })).toBeNull()
    expect(validateTaskPayload({ nombre: 'Revisar bodega' })).toBeNull()
  })

  it('rechaza un nombre menor a 3 caracteres / rejects a name shorter than 3 chars', () => {
    expect(validateTaskPayload({ nombre: 'ab', detalles: '' })).toMatch(/al menos 3 caracteres/)
  })

  it('no cuenta los espacios al medir el nombre / does not count padding whitespace', () => {
    expect(validateTaskPayload({ nombre: '  ab  ', detalles: '' })).toMatch(/al menos 3 caracteres/)
    expect(validateTaskPayload({ nombre: '  abc  ', detalles: '' })).toBeNull()
  })

  it('respeta el límite de 250 caracteres del nombre / enforces the 250-char name limit', () => {
    expect(validateTaskPayload({ nombre: 'a'.repeat(250), detalles: '' })).toBeNull()
    expect(validateTaskPayload({ nombre: 'a'.repeat(251), detalles: '' })).toMatch(/demasiado largo/)
  })

  it('respeta el límite de 1000 caracteres de los detalles / enforces the 1000-char detail limit', () => {
    expect(validateTaskPayload({ nombre: 'Tarea', detalles: 'x'.repeat(1000) })).toBeNull()
    expect(validateTaskPayload({ nombre: 'Tarea', detalles: 'x'.repeat(1001) })).toMatch(/1000 caracteres/)
  })

  it('rechaza un nombre nulo o de tipo inesperado / rejects null or unexpected name types', () => {
    expect(validateTaskPayload({ nombre: null, detalles: null })).toMatch(/al menos 3 caracteres/)
    expect(validateTaskPayload({})).toMatch(/al menos 3 caracteres/)
  })
})

describe('validateImageFile', () => {
  const archivo = (type, size) => ({ type, size })
  const MB = 1024 * 1024

  it('acepta JPG, PNG y WEBP dentro del límite / accepts JPG, PNG and WEBP under the limit', () => {
    expect(validateImageFile(archivo('image/jpeg', 1 * MB))).toBeNull()
    expect(validateImageFile(archivo('image/png', 2 * MB))).toBeNull()
    expect(validateImageFile(archivo('image/webp', 4 * MB))).toBeNull()
  })

  it('rechaza cuando no hay archivo / rejects a missing file', () => {
    expect(validateImageFile(null)).toMatch(/ningún archivo/)
    expect(validateImageFile(undefined)).toMatch(/ningún archivo/)
  })

  it('rechaza formatos no permitidos / rejects disallowed formats', () => {
    expect(validateImageFile(archivo('image/gif', 1 * MB))).toMatch(/Formato de imagen no válido/)
    expect(validateImageFile(archivo('application/pdf', 1 * MB))).toMatch(/Formato de imagen no válido/)
    expect(validateImageFile(archivo('image/svg+xml', 1024))).toMatch(/Formato de imagen no válido/)
    expect(validateImageFile(archivo('', 1024))).toMatch(/Formato de imagen no válido/)
  })

  it('valida el formato antes que el tamaño / checks format before size', () => {
    expect(validateImageFile(archivo('application/pdf', 50 * MB))).toMatch(/Formato de imagen no válido/)
  })

  it('respeta el límite exacto de 5 MB / enforces the exact 5 MB limit', () => {
    expect(validateImageFile(archivo('image/png', 5 * MB))).toBeNull()
    expect(validateImageFile(archivo('image/png', 5 * MB + 1))).toMatch(/demasiado grande/)
  })

  it('acepta un archivo de 0 bytes con tipo válido / accepts a 0-byte file with a valid type', () => {
    expect(validateImageFile(archivo('image/png', 0))).toBeNull()
  })
})
