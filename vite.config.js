import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  construirCsp,
  contenidoDeHeaders,
  hashDeScript,
  origenesDeSupabase,
  scriptsEnLinea,
} from './build/cabeceras.js'

/**
 * Escribe `dist/_headers` con la política de contenido calculada.
 *
 * Corre en `writeBundle`, cuando `dist/index.html` ya existe: el hash tiene que
 * salir del HTML FINAL, no de la plantilla, porque Vite puede transformarlo.
 *
 * Si algo sale mal, tira el build. Es deliberado: un despliegue sin cabeceras
 * de seguridad no avisa de nada —la aplicación funciona igual de bien— y ese
 * silencio es justo lo que hace que el fallo dure meses.
 *
 * Fails the build on purpose: a deploy with no security headers looks exactly
 * like a healthy one, and that silence is what makes it last for months.
 */
function cabecerasDeSeguridad(urlDeSupabase) {
  return {
    name: 'cabeceras-de-seguridad',
    apply: 'build',
    writeBundle(opciones) {
      const salida = opciones.dir || resolve('dist')
      const rutaHtml = resolve(salida, 'index.html')

      const html = readFileSync(rutaHtml, 'utf8')
      const enLinea = scriptsEnLinea(html)
      if (enLinea.length === 0) {
        throw new Error(
          'No se encontró ningún script en línea en index.html. Si se quitó a propósito, ' +
            'actualiza build/cabeceras.js; si no, la CSP habría bloqueado algo sin avisar.'
        )
      }

      const supabase = origenesDeSupabase(urlDeSupabase)
      if (!supabase.exacto) {
        this.warn(
          'VITE_SUPABASE_URL no está definida: la CSP queda con comodín (*.supabase.co). ' +
            'Defínela en las variables de build para acotarla al proyecto real.'
        )
      }

      const csp = construirCsp({ supabase, hashesDeScript: enLinea.map(hashDeScript) })
      writeFileSync(resolve(salida, '_headers'), contenidoDeHeaders(csp), 'utf8')
    },
  }
}

export default defineConfig(({ mode }) => {
  // `loadEnv` lee los archivos .env; en Cloudflare las variables de build
  // llegan por process.env, así que se consultan las dos fuentes.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  return {
    plugins: [react(), cabecerasDeSeguridad(env.VITE_SUPABASE_URL)],
  }
})
