/**
 * Exportación a CSV.
 * CSV export.
 *
 * Decisión de formato: separador PUNTO Y COMA y BOM de UTF-8.
 *
 * Excel en español interpreta la coma como separador decimal, así que un CSV
 * separado por comas se abre con todo amontonado en una sola columna. El punto
 * y coma es lo que espera, y el BOM evita que los acentos se vean como "Ã³".
 * Google Sheets y LibreOffice aceptan ambos sin problema.
 *
 * Format decision: SEMICOLON separator and a UTF-8 BOM. Spanish-locale Excel
 * treats the comma as a decimal separator, so a comma-separated file lands in
 * a single column; the BOM keeps accents from rendering as mojibake.
 */

export const CSV_SEPARADOR = ';'

/**
 * Escapa un valor. Envuelve en comillas si contiene el separador, comillas o
 * saltos de línea, y duplica las comillas internas (regla estándar de CSV).
 * Escapes a value following the standard CSV quoting rules.
 */
export function escaparCampo(valor) {
  if (valor === null || valor === undefined) return ''
  const texto = String(valor)
  if (texto === '') return ''
  if (
    texto.includes(CSV_SEPARADOR) ||
    texto.includes('"') ||
    texto.includes('\n') ||
    texto.includes('\r')
  ) {
    return `"${texto.replace(/"/g, '""')}"`
  }
  return texto
}

/**
 * Fecha en formato ISO corto (AAAA-MM-DD).
 * Se prefiere sobre el formato local porque Excel lo ordena correctamente como
 * fecha; "01/09/2026" es ambiguo entre convenciones.
 * ISO short date: Excel sorts it correctly, unlike locale formats.
 */
export function fechaCsv(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

/**
 * Construye el contenido CSV.
 * @param {Array<{clave: string, titulo: string}>} columnas
 * @param {Array<object>} filas
 */
export function construirCsv(columnas, filas) {
  const encabezado = columnas.map((c) => escaparCampo(c.titulo)).join(CSV_SEPARADOR)
  const cuerpo = filas.map((fila) =>
    columnas.map((c) => escaparCampo(fila[c.clave])).join(CSV_SEPARADOR)
  )
  // CRLF: es lo que espera Excel para respetar los saltos de línea dentro de
  // celdas entrecomilladas. CRLF is what Excel expects.
  return [encabezado, ...cuerpo].join('\r\n')
}

/**
 * Nombre de archivo con marca de tiempo, para no sobrescribir descargas.
 * Timestamped filename so repeated exports do not overwrite each other.
 */
export function nombreArchivoCsv(vista) {
  const ahora = new Date()
  const marca = [
    ahora.getFullYear(),
    String(ahora.getMonth() + 1).padStart(2, '0'),
    String(ahora.getDate()).padStart(2, '0'),
    '_',
    String(ahora.getHours()).padStart(2, '0'),
    String(ahora.getMinutes()).padStart(2, '0'),
  ].join('')
  const limpia = String(vista)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // marcas diacríticas / combining marks
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `cafemin_${limpia}_${marca}.csv`
}

/**
 * Dispara la descarga en el navegador.
 * Aislado del resto para que las funciones de arriba sean puras y probables.
 * Kept separate so the functions above stay pure and testable.
 */
export function descargarCsv(nombre, contenido) {
  const BOM = '﻿'
  const blob = new Blob([BOM + contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}
