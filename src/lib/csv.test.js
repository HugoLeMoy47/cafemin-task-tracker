import { describe, it, expect } from 'vitest'
import {
  construirCsv,
  escaparCampo,
  fechaCsv,
  neutralizarFormula,
  nombreArchivoCsv,
  CSV_SEPARADOR,
} from './csv.js'

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

/* ---------------------------------------------------------------- */
/* Inyección de fórmulas                                            */
/* ---------------------------------------------------------------- */

describe('inyección de fórmulas / formula injection', () => {
  /**
   * El CSV de este reporte está hecho para abrirse en la computadora de un
   * stakeholder. Una celda que empiece por = la evalúa la hoja de cálculo.
   */
  it.each([
    ['=1+1', "'=1+1"],
    ['=cmd|\' /C calc\'!A0', "'=cmd|' /C calc'!A0"],
    ['+SUM(A1:A9)', "'+SUM(A1:A9)"],
    ['-2+3', "'-2+3"],
    ['@SUM(1)', "'@SUM(1)"],
    ['\tvalor', "'\tvalor"],
  ])('neutraliza %s', (entrada, esperado) => {
    expect(neutralizarFormula(entrada)).toBe(esperado)
  })

  it('no toca texto normal / leaves ordinary text alone', () => {
    for (const t of ['Aseo de baños', 'Ñoño', 'Hecho', '2026-09-02', 'Área 3']) {
      expect(neutralizarFormula(t)).toBe(t)
    }
  })

  it('escaparCampo lo aplica antes de entrecomillar / applied before quoting', () => {
    // Lleva punto y coma, así que además va entrecomillado. El apóstrofo debe
    // quedar DENTRO de las comillas, no fuera.
    expect(escaparCampo('=A1;B2')).toBe('"\'=A1;B2"')
  })

  it('una tarea con nombre malicioso sale neutralizada en el archivo', () => {
    const csv = construirCsv(
      [{ clave: 'tarea', titulo: 'Tarea' }],
      [{ tarea: '=HYPERLINK("http://x.test","clic")' }]
    )
    // Lleva comillas, así que la celda va entrecomillada: el apóstrofo queda
    // DENTRO. Lo que importa es que la hoja no vea un '=' como primer carácter
    // del contenido de la celda.
    expect(csv.split('\r\n')[1]).toBe('"\'=HYPERLINK(""http://x.test"",""clic"")"')
  })

  it('un encabezado también se neutraliza / headers too', () => {
    expect(construirCsv([{ clave: 'a', titulo: '=mal' }], []).startsWith("'=")).toBe(true)
  })
})
