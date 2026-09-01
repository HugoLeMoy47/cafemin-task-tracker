import { describe, it, expect } from 'vitest'
import { construirCsv, escaparCampo, fechaCsv, nombreArchivoCsv, CSV_SEPARADOR } from './csv.js'

/**
 * El CSV lo abre personal administrativo en Excel en español. Un error de
 * escapado no rompe la aplicación: corrompe silenciosamente un reporte que
 * alguien va a usar para tomar decisiones.
 * A quoting bug here silently corrupts a report someone acts on.
 */

describe('escaparCampo', () => {
  it('deja pasar texto simple / passes plain text through', () => {
    expect(escaparCampo('Limpieza de cocina')).toBe('Limpieza de cocina')
  })

  it('entrecomilla si contiene el separador / quotes when it contains the separator', () => {
    expect(escaparCampo('Cocina; Comedor')).toBe('"Cocina; Comedor"')
  })

  it('duplica las comillas internas / doubles inner quotes', () => {
    expect(escaparCampo('Cambiar la "llave" del baño')).toBe('"Cambiar la ""llave"" del baño"')
  })

  it('entrecomilla los saltos de línea / quotes newlines', () => {
    expect(escaparCampo('Primera\nSegunda')).toBe('"Primera\nSegunda"')
    expect(escaparCampo('Primera\r\nSegunda')).toBe('"Primera\r\nSegunda"')
  })

  it('convierte vacíos y nulos en cadena vacía / renders empties as blank', () => {
    expect(escaparCampo(null)).toBe('')
    expect(escaparCampo(undefined)).toBe('')
    expect(escaparCampo('')).toBe('')
  })

  it('conserva los números / keeps numbers', () => {
    expect(escaparCampo(0)).toBe('0')
    expect(escaparCampo(42)).toBe('42')
  })
})

describe('fechaCsv', () => {
  it('devuelve AAAA-MM-DD / returns ISO short date', () => {
    expect(fechaCsv('2026-09-01T15:30:00.000Z')).toBe('2026-09-01')
  })

  it('tolera vacíos y fechas inválidas / tolerates empty and invalid dates', () => {
    expect(fechaCsv(null)).toBe('')
    expect(fechaCsv('')).toBe('')
    expect(fechaCsv('no-es-fecha')).toBe('')
  })
})

describe('construirCsv', () => {
  const columnas = [
    { clave: 'nombre', titulo: 'Tarea' },
    { clave: 'estado', titulo: 'Estado' },
  ]

  it('escribe encabezado y filas separados por CRLF / writes header and CRLF rows', () => {
    const csv = construirCsv(columnas, [
      { nombre: 'Aseo', estado: 'Hecho' },
      { nombre: 'Poda', estado: 'Pendiente' },
    ])
    expect(csv).toBe(`Tarea${CSV_SEPARADOR}Estado\r\nAseo${CSV_SEPARADOR}Hecho\r\nPoda${CSV_SEPARADOR}Pendiente`)
  })

  it('escapa dentro de las filas / escapes inside rows', () => {
    const csv = construirCsv(columnas, [{ nombre: 'Aseo; profundo', estado: 'Hecho' }])
    expect(csv).toContain('"Aseo; profundo"')
  })

  it('sin filas deja solo el encabezado / header only when there are no rows', () => {
    expect(construirCsv(columnas, [])).toBe(`Tarea${CSV_SEPARADOR}Estado`)
  })

  it('rellena las claves ausentes / fills missing keys as blank', () => {
    expect(construirCsv(columnas, [{ nombre: 'Aseo' }])).toBe(
      `Tarea${CSV_SEPARADOR}Estado\r\nAseo${CSV_SEPARADOR}`
    )
  })
})

describe('nombreArchivoCsv', () => {
  it('normaliza acentos y espacios / normalizes accents and spaces', () => {
    expect(nombreArchivoCsv('Por Asignado')).toMatch(/^cafemin_por-asignado_\d{8}_\d{4}\.csv$/)
    expect(nombreArchivoCsv('Por Fecha')).toMatch(/^cafemin_por-fecha_/)
  })

  it('quita los diacríticos / strips diacritics', () => {
    expect(nombreArchivoCsv('Categoría única')).toMatch(/^cafemin_categoria-unica_/)
  })
})
