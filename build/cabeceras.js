/**
 * Cabeceras de seguridad del sitio publicado.
 * Security headers for the published site.
 *
 * Este archivo es la ÚNICA fuente del archivo `_headers` que Cloudflare aplica.
 * Antes vivía en `public/_headers` y se copiaba tal cual, pero la política de
 * contenido no se puede escribir a mano: necesita dos cosas que solo existen
 * al construir.
 *
 *   1. El origen de Supabase, que es una variable de entorno. Escribirlo fijo
 *      ataría el archivo a un proyecto concreto y rompería cualquier otro
 *      ambiente en silencio.
 *
 *   2. El hash del script en línea de `index.html`. Ese script hace dos cosas
 *      que tienen que pasar ANTES de que cargue el bundle: marcar que la página
 *      se abrió desde un enlace de recuperación de contraseña, y aplicar el
 *      modo oscuro para evitar el flash blanco. Una `script-src 'self'` a secas
 *      lo bloquea, y el resultado sería que quien sigue un enlace de
 *      recuperación entra a la aplicación normal sin cambiar nada — un fallo
 *      silencioso de seguridad introducido por una medida de seguridad.
 *
 * The inline script must run BEFORE the bundle: a plain `script-src 'self'`
 * blocks it, and password recovery then fails silently — a security hole
 * introduced by a security measure.
 */

import { createHash } from 'node:crypto'

/** Hash en el formato que espera CSP. */
export function hashDeScript(contenido) {
  return `'sha256-${createHash('sha256').update(contenido, 'utf8').digest('base64')}'`
}

/**
 * Extrae el contenido de cada `<script>` SIN atributo `src` de un HTML.
 * El navegador calcula el hash sobre el texto exacto entre las etiquetas, así
 * que no se recorta ni se normaliza nada.
 * The browser hashes the exact text between the tags, so nothing is trimmed.
 */
export function scriptsEnLinea(html) {
  const encontrados = []
  const patron = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = patron.exec(html)) !== null) encontrados.push(m[1])
  return encontrados
}

/**
 * Deriva los orígenes de Supabase a partir de la URL del proyecto.
 *
 * Si falta la variable se cae a un comodín en vez de romper el build: un
 * despliegue con una CSP algo más laxa sigue siendo mejor que un despliegue
 * fallido a media ventana de demostración, y el aviso queda en el log.
 * Falls back to a wildcard rather than failing the build.
 */
export function origenesDeSupabase(urlDelProyecto) {
  if (!urlDelProyecto) {
    return { http: 'https://*.supabase.co', ws: 'wss://*.supabase.co', exacto: false }
  }
  const { origin, host } = new URL(urlDelProyecto)
  return { http: origin, ws: `wss://${host}`, exacto: true }
}

/**
 * Construye la política.
 *
 * Sobre `style-src 'unsafe-inline'`: el módulo de reportes usa `style={{…}}` de
 * React en once sitios —posición del tooltip, `tabular-nums`, el color de una
 * barra— y React los escribe como atributo `style`, que `style-src` gobierna.
 * Existe `style-src-attr`, que permitiría solo los atributos y seguiría
 * bloqueando un `<style>` inyectado, pero un navegador que no lo entienda cae
 * a `style-src` y deja los tooltips fuera de sitio. Se prefiere la versión que
 * no puede romper nada: el valor real de esta política está en `script-src` y
 * `connect-src` —limitar qué se ejecuta y a dónde puede salir un dato— y ahí no
 * se cede nada. La revisión no encontró ningún vector de XSS en el código.
 *
 * The real value of this policy is in script-src and connect-src; nothing is
 * conceded there.
 */
export function construirCsp({ supabase, hashesDeScript }) {
  const directivas = [
    // Todo lo no listado abajo: solo el propio origen.
    ["default-src", ["'self'"]],
    // Scripts: el bundle propio, y el script en línea por su hash exacto.
    ["script-src", ["'self'", ...hashesDeScript]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    // Las fotos de evidencia llegan por URL firmada de Supabase. `blob:` y
    // `data:` cubren vistas previas locales antes de subir.
    ["img-src", ["'self'", 'data:', 'blob:', supabase.http]],
    ["font-src", ["'self'"]],
    // REST, Auth, Storage y Realtime. El WebSocket necesita su propio esquema.
    ["connect-src", ["'self'", supabase.http, supabase.ws]],
    // Nada de plugins ni de incrustar la app en un iframe ajeno.
    ["object-src", ["'none'"]],
    ["frame-ancestors", ["'none'"]],
    // Un XSS no puede reescribir la base de las rutas relativas ni mandar un
    // formulario a otro sitio.
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
  ]
  return directivas.map(([nombre, valores]) => `${nombre} ${valores.join(' ')}`).join('; ')
}

/**
 * Contenido completo del archivo `_headers`.
 * Full contents of the `_headers` file.
 *
 * Sobre `Strict-Transport-Security`: faltaba, y se descubrió leyendo las
 * cabeceras que Cloudflare sirve DE VERDAD en producción, no este archivo.
 * Sin ella, la primera visita que alguien escribe a mano —`cafemintt…` sin
 * `https://`— sale por HTTP y admite que se la intercepten antes de que el
 * redirect ocurra. Un año de `max-age` es lo habitual.
 *
 * **No lleva `preload` a propósito.** Entrar a la lista de precarga de los
 * navegadores es fácil y salir tarda meses, y además afectaría al dominio
 * entero, no solo a esta demostración.
 *
 * HSTS was missing — found by reading the headers Cloudflare actually serves,
 * not this file. `preload` is deliberately omitted: getting on the browsers'
 * preload list is easy and getting off takes months.
 */
export function contenidoDeHeaders(csp) {
  return `# GENERADO AL CONSTRUIR — no editar a mano.
# Fuente: build/cabeceras.js, aplicado por el plugin de vite.config.js.
# GENERATED AT BUILD TIME — edit build/cabeceras.js instead.

/*
  Content-Security-Policy: ${csp}
  X-Robots-Tag: noindex, nofollow
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains

# Los assets llevan hash en el nombre: se pueden cachear indefinidamente.
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`
}
