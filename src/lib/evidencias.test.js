import { describe, it, expect } from 'vitest'
import { buildEvidencePath, toStoragePath } from './evidencias.js'

/**
 * El bucket es privado: si estas funciones devuelven una ruta equivocada, la
 * política de Storage niega el acceso y la evidencia deja de abrirse.
 * The bucket is private: a wrong path here means Storage denies access.
 */

describe('buildEvidencePath', () => {
  const ID = '11111111-2222-3333-4444-555555555555'

  it('pone el id de la tarea como primer segmento / task id is the first segment', () => {
    expect(buildEvidencePath(ID, 'foto.jpg').split('/')[0]).toBe(ID)
  })

  it('conserva la extensión en minúsculas / keeps the extension lowercased', () => {
    expect(buildEvidencePath(ID, 'FOTO.JPEG')).toMatch(/\.jpeg$/)
    expect(buildEvidencePath(ID, 'captura.PNG')).toMatch(/\.png$/)
  })

  it('usa la última extensión en nombres con puntos / uses the last extension', () => {
    expect(buildEvidencePath(ID, 'acta.final.v2.webp')).toMatch(/\.webp$/)
  })

  it('cae en jpg si el archivo no trae extensión / falls back to jpg', () => {
    expect(buildEvidencePath(ID, 'sinextension')).toMatch(/\.jpg$/)
    expect(buildEvidencePath(ID, '')).toMatch(/\.jpg$/)
    expect(buildEvidencePath(ID, undefined)).toMatch(/\.jpg$/)
  })
})

describe('toStoragePath', () => {
  const RUTA = '11111111-2222-3333-4444-555555555555/1730000000000.jpg'

  it('deja pasar una ruta ya normalizada / passes a plain path through', () => {
    expect(toStoragePath(RUTA)).toBe(RUTA)
  })

  it('extrae la ruta de una URL pública heredada / extracts it from a legacy URL', () => {
    const heredada = `https://abc.supabase.co/storage/v1/object/public/evidencias/${RUTA}`
    expect(toStoragePath(heredada)).toBe(RUTA)
  })

  it('quita las barras iniciales / strips leading slashes', () => {
    expect(toStoragePath(`/${RUTA}`)).toBe(RUTA)
  })

  it('recorta espacios / trims whitespace', () => {
    expect(toStoragePath(`  ${RUTA}  `)).toBe(RUTA)
  })

  it('rechaza una URL de otro origen / rejects a URL from another origin', () => {
    expect(toStoragePath('https://ejemplo.com/foto.jpg')).toBeNull()
    expect(toStoragePath('http://ejemplo.com/foto.jpg')).toBeNull()
  })

  it('rechaza vacíos y tipos inesperados / rejects empty and unexpected types', () => {
    expect(toStoragePath('')).toBeNull()
    expect(toStoragePath('   ')).toBeNull()
    expect(toStoragePath(null)).toBeNull()
    expect(toStoragePath(undefined)).toBeNull()
    expect(toStoragePath(42)).toBeNull()
  })
})
