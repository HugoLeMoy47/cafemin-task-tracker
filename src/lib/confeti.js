/**
 * Efecto visual ligero de confeti para celebrar la conclusión de tareas.
 *
 * Características:
 * - Cero dependencias npm externas (usa Canvas nativo).
 * - Respeta `prefers-reduced-motion`: si el usuario prefiere no ver animaciones,
 *   se desactiva silenciosamente para no marear ni gastar batería.
 * - Limpieza automática: el canvas se remueve del DOM al terminar la ráfaga (1.5 s).
 */

const COLORES = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4']

export function lanzarConfeti() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  // Si el usuario tiene activada la preferencia de accesibilidad, abortar
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
    return
  }

  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '9999'

  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }

  const ancho = (canvas.width = window.innerWidth)
  const alto = (canvas.height = window.innerHeight)

  const PARTICULAS = 45
  const particulas = []

  for (let i = 0; i < PARTICULAS; i++) {
    particulas.push({
      x: ancho * 0.5 + (Math.random() - 0.5) * (ancho * 0.4),
      y: alto * 0.35 + (Math.random() - 0.5) * 50,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 6 - 2,
      tamano: Math.random() * 6 + 4,
      color: COLORES[Math.floor(Math.random() * COLORES.length)],
      rotacion: Math.random() * 360,
      velocidadRotacion: (Math.random() - 0.5) * 10,
      gravedad: 0.25,
      opacidad: 1,
    })
  }

  let cuadroId
  const tiempoInicio = performance.now()
  const DURACION_MS = 1500

  function animar(ahora) {
    const transcurrido = ahora - tiempoInicio
    if (transcurrido > DURACION_MS) {
      canvas.remove()
      return
    }

    ctx.clearRect(0, 0, ancho, alto)
    const factorDesvanecer = Math.max(0, 1 - transcurrido / DURACION_MS)

    for (const p of particulas) {
      p.x += p.vx
      p.y += p.vy
      p.vy += p.gravedad
      p.rotacion += p.velocidadRotacion
      p.opacidad = factorDesvanecer

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotacion * Math.PI) / 180)
      ctx.globalAlpha = p.opacidad
      ctx.fillStyle = p.color
      ctx.fillRect(-p.tamano / 2, -p.tamano / 2, p.tamano, p.tamano * 0.6)
      ctx.restore()
    }

    cuadroId = requestAnimationFrame(animar)
  }

  cuadroId = requestAnimationFrame(animar)

  // Seguro de limpieza por si la pestaña pasa a segundo plano
  setTimeout(() => {
    cancelAnimationFrame(cuadroId)
    if (canvas.parentNode) canvas.remove()
  }, DURACION_MS + 200)
}
