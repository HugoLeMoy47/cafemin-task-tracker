/**
 * Prueba de regresión en pantalla chica.
 * Small-screen regression test.
 *
 *   npm run test:movil
 *
 * Falla —con código de salida distinto de cero— si alguna vista rompe alguna
 * de las seis comprobaciones de `medir()` en cualquiera de los escenarios de
 * `EQUIPOS`. No es un test de estilo: cada umbral corresponde a un defecto real
 * que ya ocurrió en este proyecto y que solo se descubrió midiendo.
 *
 * Fails if any view breaks one of the six checks in `medir()`. Every threshold
 * corresponds to a defect that actually happened here.
 *
 * ── Por qué existe ──
 *
 * Tres rondas de trabajo en móvil se hicieron midiendo a mano y las tres
 * dejaron algo fuera: la pantalla de login no se midió nunca, las etiquetas de
 * los SVG se midieron sin contar su escala, y subir los campos a 44 px empujó
 * los datos fuera de la pantalla sin que nada avisara. Una medición que no se
 * repite sola no protege de nada: protege una vez.
 *
 * Three rounds of manual measurement each missed something. A measurement that
 * does not repeat itself protects you once.
 *
 * ── El umbral que importa ──
 *
 * `texto < 12 px` se mide en PÍXELES REALES, no en las unidades del `viewBox`.
 * Un `<text>` de 13 unidades dentro de un `viewBox` de 600 que se pinta a 294
 * son 6.4 px en la pantalla. Ese error —creer que el número del código es el
 * número de la pantalla— es el que hizo ilegibles las gráficas durante meses,
 * y es invisible para cualquier revisión que lea el código en vez de medirlo.
 *
 * Text is measured in REAL pixels, not viewBox units: a 13-unit label inside a
 * 600-wide viewBox painted at 294 px is 6.4 px on screen. Believing the number
 * in the code is the number on screen is what made the charts unreadable.
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

const RAIZ = resolve(import.meta.dirname, '..')
const DIST = join(RAIZ, 'dist-movil')
const PUERTO = 8911

/**
 * Anchos reales de equipos de gama básica, no del teléfono del diseñador.
 *
 * El último no es un ancho distinto sino el MISMO teléfono con la letra del
 * sistema más grande. En un refugio, con gente de todas las edades, subirla es
 * un ajuste corriente y no un caso extremo — y rompe cosas que ningún ancho
 * rompe: la primera vez que se probó, tres cifras que caben de sobra a tamaño
 * normal empujaban 76 px fuera de la pantalla.
 *
 * ── Por qué 130% y no 200% ──
 *
 * 130% es el ajuste «texto grande» de uso corriente, y la aplicación lo pasa
 * entera. 200% es el máximo de accesibilidad de Android, y AHÍ NO PASA: está
 * medido y documentado en el README, y no se arregló. La razón es que las
 * gráficas colocan sus etiquetas con desplazamientos fijos en píxeles —18, 20,
 * 42— mientras el texto crece con la letra del sistema, así que al 200% se
 * montan. Arreglarlo de verdad es pasar toda la maquetación de las gráficas a
 * unidades relativas, que es un trabajo aparte y no un ajuste.
 *
 * Fijar aquí 130% es una decisión sobre qué se garantiza, no un arreglo del
 * 200%. Si alguien sube este número, que sea después de arreglar aquello.
 *
 * 130% is the everyday "large text" setting and the app passes it whole. 200%
 * is Android's accessibility maximum and the app does NOT pass it: measured,
 * documented in the README, not fixed. Setting 130% here is a decision about
 * what is guaranteed, not a fix for 200%.
 */
const EQUIPOS = [
  { nombre: '320 px (gama muy básica)', w: 320, h: 568 },
  { nombre: '360 px (Android de entrada)', w: 360, h: 640 },
  { nombre: '412 px (gama media)', w: 412, h: 892 },
  { nombre: '360 px con la letra del sistema al 130%', w: 360, h: 640, letra: 1.3 },
]

const VISTAS = [
  { clave: 'login', titulo: 'Login (sin sesión)' },
  { clave: 'kanban', titulo: 'Tablero (rol Asignado)' },
  { clave: 'reportes', titulo: 'Reportes · Resumen' },
  { clave: 'reportes', titulo: 'Reportes · Por Estado', pestana: 'Por Estado' },
  { clave: 'reportes', titulo: 'Reportes · Por Asignado', pestana: 'Por Asignado' },
  { clave: 'reportes', titulo: 'Reportes · Por Fecha', pestana: 'Por Fecha' },
]

const MIN_TACTIL = 44
const MIN_TEXTO = 12

/* ------------------------------------------------------------------ */
/* Servidor estático mínimo: evita depender de python o de un paquete. */
/* ------------------------------------------------------------------ */

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }

function servidor() {
  return createServer(async (req, res) => {
    try {
      const ruta = join(DIST, decodeURIComponent(req.url.split('?')[0]))
      const cuerpo = await readFile(ruta)
      res.writeHead(200, { 'Content-Type': TIPOS[extname(ruta)] || 'application/octet-stream' })
      res.end(cuerpo)
    } catch {
      res.writeHead(404).end('no')
    }
  })
}

/* ------------------------------------------------------------------ */
/* Lo que se mide dentro de la página.                                 */
/* ------------------------------------------------------------------ */

function medir() {
  const doc = document.documentElement
  const visible = (e) => {
    const s = getComputedStyle(e)
    return s.display !== 'none' && s.visibility !== 'hidden' && e.getClientRects().length > 0
  }
  const nombrar = (e) =>
    (e.innerText || e.getAttribute('aria-label') || e.getAttribute('title') || e.type || e.tagName)
      .toString().replace(/\s+/g, ' ').trim().slice(0, 40)

  /* 1. La página no debe salirse de la pantalla. */
  const desborde = Math.max(0, doc.scrollWidth - doc.clientWidth)

  /* 2. Nada interactivo por debajo de 44 px.
        Lo que se mide es el blanco REAL, no la caja del control: una casilla
        o un radio de 16 px envueltos en una <label> de 44 px son un patrón
        correcto y accesible —se toca la etiqueta entera—, y contarlos como
        defecto haría que la prueba gritara en falso. Una prueba que grita en
        falso se deja de leer, y entonces deja de servir para lo que sí es.
        The effective target is the wrapping <label>, not the 16 px control. */
  const cajaEfectiva = (e) => {
    const propia = e.getBoundingClientRect()
    const etiqueta = e.closest('label')
    if (!etiqueta) return propia
    const caja = etiqueta.getBoundingClientRect()
    return caja.height >= propia.height ? caja : propia
  }

  const tactiles = [...document.querySelectorAll('button, a, select, input, textarea, [role="button"], summary')]
    .filter(visible)
    .map((e) => { const c = cajaEfectiva(e); return { que: nombrar(e), w: Math.round(c.width), h: Math.round(c.height) } })
    .filter((x) => x.w > 0 && x.h > 0 && (x.h < 44 || x.w < 44))

  /* 3. Texto HTML por debajo de 12 px.
        Se excluye lo que vive dentro de un <svg>: ahí el tamaño de la hoja de
        estilos NO es el tamaño en pantalla, y contarlo aquí lo reportaría dos
        veces con la cifra equivocada. De eso se encarga el punto 4.
        SVG text is excluded: there the stylesheet size is not the screen size. */
  const textoHtml = [...document.querySelectorAll('*')]
    .filter(
      (e) =>
        e.children.length === 0 &&
        (e.textContent || '').trim().length > 2 &&
        !e.closest('svg') &&
        visible(e)
    )
    .map((e) => ({ que: nombrar(e), px: +parseFloat(getComputedStyle(e).fontSize).toFixed(1) }))
    .filter((x) => x.px < 12)

  /* 4. Texto DENTRO DE UN SVG, en píxeles reales: tamaño × escala del viewBox.
        Éste es el chequeo que ninguna revisión de código puede hacer. */
  const textoSvg = []
  for (const svg of document.querySelectorAll('svg')) {
    if (!visible(svg)) continue
    const caja = svg.getBoundingClientRect()
    const vb = svg.getAttribute('viewBox')
    if (!vb || !caja.width) continue
    const anchoVb = parseFloat(vb.split(/[\s,]+/)[2])
    const escala = caja.width / anchoVb
    for (const t of svg.querySelectorAll('text')) {
      const real = +(parseFloat(getComputedStyle(t).fontSize) * escala).toFixed(1)
      if (real < 12) {
        textoSvg.push({
          que: (t.textContent || '').trim().slice(0, 28),
          px: real,
          detalle: `viewBox ${anchoVb} → ${Math.round(caja.width)}px (escala ${escala.toFixed(2)})`,
        })
      }
    }
  }

  /* 5. Contenido escondido tras un scroll lateral interno.
        `overflow-x-auto` no produce desborde del documento, así que el punto 1
        no lo ve: la página se ve perfecta y una columna entera está fuera, sin
        ninguna señal de que exista. Es exactamente cómo una de las cuatro
        pestañas estuvo invisible durante meses.
        An inner overflow-x-auto never trips check 1: the page looks perfect
        while a whole column sits off-screen with no cue it is there. */
  const escondido = [...document.querySelectorAll('*')]
    .filter((e) => e.clientWidth > 120 && e.scrollWidth > e.clientWidth + 4 && visible(e))
    .map((e) => ({
      que: (e.className || e.tagName).toString().slice(0, 40),
      oculto: e.scrollWidth - e.clientWidth,
      ve: e.clientWidth,
      de: e.scrollWidth,
    }))

  /* 6. Etiquetas de gráfica sin aire respecto a una barra.
        Un texto del tamaño correcto, pegado a una barra de color, sigue siendo
        ilegible — y ninguna de las cinco comprobaciones anteriores lo ve: el
        tamaño está bien, no hay desborde y nada está escondido.
        Text at the right size, touching a colored bar, is still unreadable.

        Se midió el caso real que lo motivó: «Acompañamiento» terminaba en
        x=138.6 y su barra empezaba en x=137. Un solape de 1.6 px — o sea que
        una comprobación de «¿se encima?» con cualquier umbral razonable lo
        habría dejado pasar, que es exactamente lo que pasó en el primer
        intento. El defecto no es el solape: es que no hay separación. Por eso
        se exige un hueco mínimo en vez de castigar la intersección.
        The real case overlapped by 1.6 px, so an "do they intersect?" check
        with any sane threshold let it through. The defect is the missing gap. */
  const HUECO_MINIMO = 4
  const encimados = []
  for (const svg of document.querySelectorAll('svg')) {
    if (!visible(svg)) continue
    const barras = [...svg.querySelectorAll('rect')].filter((r) => {
      const f = (r.getAttribute('fill') || '').trim()
      // Solo barras de datos: los rieles y fondos son recesivos a propósito y
      // sí llevan texto encima por diseño.
      return f && !/rejilla|superficie|none|transparent/.test(f)
    })
    for (const t of svg.querySelectorAll('text')) {
      const a = t.getBoundingClientRect()
      if (!a.width) continue
      for (const r of barras) {
        const b = r.getBoundingClientRect()
        // Solo importan las que comparten renglón.
        if (Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) <= 2) continue
        // Hueco horizontal: negativo si se enciman.
        const hueco = a.left < b.left ? b.left - a.right : a.left - b.right
        if (hueco < HUECO_MINIMO) {
          encimados.push({
            que: (t.textContent || '').trim().slice(0, 28),
            px: `hueco ${hueco.toFixed(1)}px`,
          })
          break
        }
      }
    }
  }

  return { desborde, tactiles, textoHtml, textoSvg, escondido, encimados }
}

/* ------------------------------------------------------------------ */

function agrupar(lista, clave) {
  const m = new Map()
  for (const x of lista) {
    const k = clave(x)
    m.set(k, (m.get(k) || 0) + 1)
  }
  return [...m.entries()].map(([k, n]) => (n > 1 ? `${k} ×${n}` : k))
}

async function principal() {
  try {
    await stat(join(DIST, 'harnessMovil.html'))
  } catch {
    console.error('Falta el arnés. Constrúyelo primero:\n\n  npm run build:movil\n')
    process.exit(2)
  }

  let chromium
  try {
    ({ chromium } = await import('playwright'))
  } catch {
    console.error(
      'Esta prueba necesita Playwright, que no es dependencia de la aplicación:\n\n' +
        '  npm i -D playwright && npx playwright install chromium\n'
    )
    process.exit(2)
  }

  const srv = servidor()
  await new Promise((r) => srv.listen(PUERTO, '127.0.0.1', r))
  const base = `http://127.0.0.1:${PUERTO}/harnessMovil.html`

  const navegador = await chromium.launch()
  const fallos = []
  let comprobaciones = 0

  for (const eq of EQUIPOS) {
    console.log(`\n━━━ ${eq.nombre}`)
    for (const vista of VISTAS) {
      const ctx = await navegador.newContext({
        viewport: { width: eq.w, height: eq.h },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      })
      const pag = await ctx.newPage()
      const errores = []
      pag.on('pageerror', (e) => errores.push(String(e)))

      await pag.goto(`${base}?v=${vista.clave}`, { waitUntil: 'networkidle' })
      if (eq.letra) {
        // Así es como llega el ajuste del sistema a una página web: cambiando
        // el tamaño de letra base del documento, del que cuelgan `rem` y `em`.
        await pag.evaluate((f) => {
          document.documentElement.style.fontSize = `${16 * f}px`
        }, eq.letra)
        await pag.waitForTimeout(250)
      }
      if (vista.pestana) {
        await pag.getByRole('button', { name: vista.pestana, exact: true }).click()
        await pag.waitForTimeout(250)
      }
      await pag.waitForTimeout(350)

      const m = await pag.evaluate(medir)
      comprobaciones++

      const problemas = []
      if (m.desborde > 0) problemas.push(`la página se sale ${m.desborde} px de la pantalla`)
      if (m.tactiles.length)
        problemas.push(
          `${m.tactiles.length} objetivo(s) por debajo de ${MIN_TACTIL} px: ` +
            agrupar(m.tactiles, (x) => `«${x.que}» ${x.w}×${x.h}`).slice(0, 4).join(' · ')
        )
      if (m.textoHtml.length)
        problemas.push(
          `${m.textoHtml.length} texto(s) por debajo de ${MIN_TEXTO} px: ` +
            agrupar(m.textoHtml, (x) => `«${x.que}» ${x.px}px`).slice(0, 4).join(' · ')
        )
      if (m.textoSvg.length)
        problemas.push(
          `${m.textoSvg.length} texto(s) de gráfica por debajo de ${MIN_TEXTO} px REALES: ` +
            agrupar(m.textoSvg, (x) => `«${x.que}» ${x.px}px [${x.detalle}]`).slice(0, 3).join(' · ')
        )
      if (m.escondido.length)
        problemas.push(
          `${m.escondido.length} bloque(s) esconden contenido tras scroll lateral: ` +
            m.escondido.slice(0, 3).map((x) => `«${x.que}» oculta ${x.oculto} px (ve ${x.ve} de ${x.de})`).join(' · ')
        )
      if (m.encimados.length)
        problemas.push(
          `${m.encimados.length} etiqueta(s) sin separación de su barra ` +
            `(mínimo ${4} px): ` +
            agrupar(m.encimados, (x) => `«${x.que}» ${x.px}`).slice(0, 4).join(' · ')
        )
      if (errores.length) problemas.push(`error de JavaScript: ${errores[0]}`)

      if (problemas.length) {
        console.log(`  ✗ ${vista.titulo}`)
        for (const p of problemas) console.log(`      ${p}`)
        fallos.push({ equipo: eq.nombre, vista: vista.titulo, problemas })
      } else {
        console.log(`  ✓ ${vista.titulo}`)
      }
      await ctx.close()
    }
  }

  await navegador.close()
  srv.close()

  console.log(
    `\n${comprobaciones} comprobaciones · ${comprobaciones - fallos.length} en verde · ${fallos.length} en rojo`
  )
  if (fallos.length) {
    console.log('\nLa pantalla chica es un escenario de uso real de este sistema, no un extra.')
    process.exit(1)
  }
  console.log('Sin desbordes, sin objetivos chicos y sin texto ilegible.')
}

await principal()
