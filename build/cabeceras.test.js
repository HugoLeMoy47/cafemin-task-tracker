import { describe, it, expect } from 'vitest'
import {
  construirCsp,
  contenidoDeHeaders,
  hashDeScript,
  origenesDeSupabase,
  scriptsEnLinea,
} from './cabeceras.js'

describe('scriptsEnLinea', () => {
  it('encuentra el script sin src y omite el del bundle / finds inline, skips src', () => {
    const html = `<head><script>window.a = 1</script></head>
      <body><script type="module" src="/assets/x.js"></script></body>`
    expect(scriptsEnLinea(html)).toEqual(['window.a = 1'])
  })

  it('no recorta el contenido / does not trim', () => {
    // El navegador calcula el hash sobre el texto EXACTO. Recortar aquí
    // produciría un hash que no coincide y bloquearía el script en silencio.
    expect(scriptsEnLinea('<script>\n  a\n</script>')).toEqual(['\n  a\n'])
  })

  it('encuentra varios / finds several', () => {
    expect(scriptsEnLinea('<script>a</script><script>b</script>')).toEqual(['a', 'b'])
  })

  it('devuelve vacío cuando no hay ninguno / empty when there are none', () => {
    expect(scriptsEnLinea('<script src="/x.js"></script>')).toEqual([])
  })
})

describe('hashDeScript', () => {
  it('produce el formato que espera CSP / produces the CSP format', () => {
    expect(hashDeScript('window.a = 1')).toMatch(/^'sha256-[A-Za-z0-9+/]+=*'$/)
  })

  it('un cambio mínimo cambia el hash / a tiny change changes the hash', () => {
    expect(hashDeScript('a')).not.toBe(hashDeScript('a '))
  })
})

describe('origenesDeSupabase', () => {
  it('deriva el origen http y el websocket / derives http and websocket origins', () => {
    const r = origenesDeSupabase('https://abcd1234.supabase.co')
    expect(r).toEqual({
      http: 'https://abcd1234.supabase.co',
      ws: 'wss://abcd1234.supabase.co',
      exacto: true,
    })
  })

  it('descarta la ruta si la URL trae una / drops any path', () => {
    expect(origenesDeSupabase('https://x.supabase.co/rest/v1').http).toBe('https://x.supabase.co')
  })

  it('sin variable cae a comodín en vez de romper el build', () => {
    // Un despliegue con la CSP algo más laxa es mejor que un build fallido a
    // media ventana de demostración. El aviso queda en el log.
    const r = origenesDeSupabase(undefined)
    expect(r.exacto).toBe(false)
    expect(r.http).toBe('https://*.supabase.co')
    expect(r.ws).toBe('wss://*.supabase.co')
  })
})

describe('construirCsp', () => {
  const supabase = origenesDeSupabase('https://proy.supabase.co')
  const csp = construirCsp({ supabase, hashesDeScript: ["'sha256-AAA='"] })

  it('el hash del script en línea entra en script-src', () => {
    expect(csp).toContain("script-src 'self' 'sha256-AAA='")
  })

  it('script-src NO lleva unsafe-inline / no unsafe-inline for scripts', () => {
    // Es la directiva que de verdad importa: si esto se afloja, la política
    // deja de servir para lo único que tiene que servir.
    const linea = csp.split('; ').find((d) => d.startsWith('script-src'))
    expect(linea).not.toContain('unsafe-inline')
  })

  it('connect-src permite REST y el WebSocket de Realtime', () => {
    expect(csp).toContain('connect-src')
    expect(csp).toContain('https://proy.supabase.co')
    expect(csp).toContain('wss://proy.supabase.co')
  })

  it('img-src acepta las URLs firmadas de Storage', () => {
    const linea = csp.split('; ').find((d) => d.startsWith('img-src'))
    expect(linea).toContain('https://proy.supabase.co')
  })

  it('cierra los vectores clásicos / closes the classic vectors', () => {
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain("default-src 'self'")
  })

  it('no deja ningún host que no sea el propio o Supabase', () => {
    const hosts = csp.match(/https?:\/\/[^\s;]+|wss:\/\/[^\s;]+/g) || []
    for (const h of hosts) expect(h).toContain('supabase.co')
  })
})

describe('contenidoDeHeaders', () => {
  const texto = contenidoDeHeaders('default-src \'self\'')

  it('avisa de que es generado / says it is generated', () => {
    expect(texto).toMatch(/GENERADO AL CONSTRUIR/)
  })

  it('conserva las cabeceras que ya existían / keeps the pre-existing headers', () => {
    for (const c of [
      'X-Robots-Tag',
      'X-Frame-Options: DENY',
      'X-Content-Type-Options: nosniff',
      'Referrer-Policy',
      'Permissions-Policy',
    ]) {
      expect(texto).toContain(c)
    }
  })

  it('exige HTTPS por un año / pins HTTPS for a year', () => {
    expect(texto).toContain('Strict-Transport-Security: max-age=31536000; includeSubDomains')
  })

  it('no entra a la lista de precarga / does not opt into preload', () => {
    // Salir de la lista de precarga tarda meses. Si alguien la agrega, que sea
    // una decisión y no un descuido copiando una receta de internet.
    // Getting off the preload list takes months: make it a decision, not a paste.
    expect(texto).not.toContain('preload')
  })

  it('mantiene el cacheo de assets / keeps asset caching', () => {
    expect(texto).toContain('/assets/*')
    expect(texto).toContain('immutable')
  })

  it('las cabeceras van indentadas bajo su ruta / headers indented under their path', () => {
    // Cloudflare exige la indentación; sin ella el archivo se ignora en silencio.
    const lineas = texto.split('\n')
    const i = lineas.indexOf('/*')
    expect(lineas[i + 1].startsWith('  ')).toBe(true)
  })
})
