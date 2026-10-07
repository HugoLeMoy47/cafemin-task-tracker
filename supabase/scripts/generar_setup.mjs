// Genera supabase/setup_completo.sql: schema + todas las migraciones, en orden,
// en un solo archivo para pegar en el SQL Editor de un proyecto NUEVO.
// Builds one pasteable file: schema + every migration, in order.
//
// El orden NO se define aquí: se lee de las líneas `\ir` de tests/00_espejo.sql,
// que es la lista que la suite de pruebas ya ejecuta. Una sola fuente de verdad;
// una segunda lista se desincroniza.
//
// Uso / Usage:  npm run db:setup
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const supabase = join(dirname(fileURLToPath(import.meta.url)), '..')
const espejo = readFileSync(join(supabase, 'tests', '00_espejo.sql'), 'utf8')

const archivos = [...espejo.matchAll(/^\\ir\s+\.\.\/(\S+\.sql)\s*$/gm)].map((m) => m[1])
if (archivos.length < 2 || archivos[0] !== 'schema.sql') {
  throw new Error('No se pudo leer el orden de 00_espejo.sql (se esperaba schema.sql primero).')
}

const partes = [
  `-- ============================================================================\n` +
    `-- setup_completo.sql — GENERADO, no editar a mano. Regenerar: npm run db:setup\n` +
    `-- Para un proyecto de Supabase NUEVO y vacío: pega todo en el SQL Editor y ejecuta.\n` +
    `-- Orden: ${archivos.join(' → ')}\n` +
    `-- ============================================================================\n`,
]
for (const rel of archivos) {
  partes.push(
    `\n-- ============================================================================\n` +
      `-- >>> ${rel}\n` +
      `-- ============================================================================\n\n` +
      readFileSync(join(supabase, rel), 'utf8').replace(/\r\n/g, '\n').trimEnd() +
      '\n',
  )
}
writeFileSync(join(supabase, 'setup_completo.sql'), partes.join(''))
console.log(`setup_completo.sql: ${archivos.length} archivos`)
