import { createClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase.
 * Supabase client.
 *
 * Las variables se resuelven en tiempo de BUILD, no de ejecución: si el build
 * corre sin ellas, quedan como `undefined` en el bundle y `createClient` lanza
 * una excepción durante la carga del módulo, lo que deja la página en blanco
 * sin explicación. La validación de abajo convierte ese fallo mudo en un
 * mensaje accionable.
 *
 * These variables are resolved at BUILD time, not at runtime: if the build runs
 * without them they end up `undefined` in the bundle and `createClient` throws
 * during module evaluation, leaving a blank page with no explanation. The guard
 * below turns that silent failure into an actionable message.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const missing = [
  !supabaseUrl && 'VITE_SUPABASE_URL',
  !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
].filter(Boolean)

if (missing.length > 0) {
  const detalle = missing.join(', ')
  const mensaje =
    `Configuración incompleta: falta ${detalle} en el build. / ` +
    `Incomplete configuration: ${detalle} missing at build time.`

  // No se filtra ningún valor: solo se nombran las variables ausentes.
  // No values are leaked: only the names of the missing variables.
  console.error(`[CAFEMIN] ${mensaje}`)

  const root = typeof document !== 'undefined' && document.getElementById('root')
  if (root) {
    root.textContent = ''
    const aviso = document.createElement('div')
    aviso.setAttribute('role', 'alert')
    aviso.style.cssText =
      'max-width:34rem;margin:15vh auto;padding:1.5rem;font-family:system-ui,sans-serif;' +
      'line-height:1.5;border:1px solid #fca5a5;border-radius:.75rem;background:#fef2f2;color:#7f1d1d'

    const titulo = document.createElement('h1')
    titulo.textContent = 'La aplicación no está configurada'
    titulo.style.cssText = 'margin:0 0 .5rem;font-size:1.125rem'

    const cuerpo = document.createElement('p')
    cuerpo.textContent =
      `Faltan variables de entorno en el build: ${detalle}. ` +
      'Configúralas en el proveedor de despliegue y vuelve a construir.'
    cuerpo.style.margin = '0'

    aviso.append(titulo, cuerpo)
    root.appendChild(aviso)
  }

  throw new Error(mensaje)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
