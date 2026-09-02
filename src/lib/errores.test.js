import { describe, it, expect } from 'vitest'
import {
  mensajeDeError,
  mensajeDeLogin,
  REGLAS_DEL_PROYECTO,
  RESPALDO_GENERAL,
} from './errores'

/**
 * El caso que de verdad importa: un mensaje que nadie anticipó no llega a
 * pantalla. Si estas pruebas se rompen porque alguien cambió a lista negra,
 * la ruptura es el punto.
 */
describe('nada crudo llega al usuario / nothing raw reaches the user', () => {
  const filtraciones = [
    { code: '42P01', message: 'relation "public.tareas" does not exist' },
    { code: '42703', message: 'column usuarios.rol does not exist' },
    {
      code: 'PGRST301',
      message: 'new row violates row-level security policy for table "tareas"',
    },
    { message: 'duplicate key value violates unique constraint "categorias_nombre_key"' },
    { message: 'permission denied for function get_my_role' },
    { code: 'XX000', message: 'stack depth limit exceeded' },
  ]

  for (const error of filtraciones) {
    it(`descarta: ${String(error.message).slice(0, 42)}…`, () => {
      const salida = mensajeDeError(error, 'No se pudo guardar.')
      expect(salida).toBe('No se pudo guardar.')
      // Ni el nombre de la tabla, ni el de la columna, ni el de la política.
      expect(salida).not.toContain('tareas')
      expect(salida).not.toContain('usuarios')
      expect(salida).not.toContain('constraint')
      expect(salida).not.toContain('policy')
      expect(salida).not.toContain('get_my_role')
    })
  }

  it('sin respaldo explícito usa el general / falls back to the general text', () => {
    expect(mensajeDeError({ code: 'XX000', message: 'boom' })).toBe(RESPALDO_GENERAL)
  })

  it('un error nulo devuelve el respaldo / a null error yields the fallback', () => {
    expect(mensajeDeError(null, 'respaldo')).toBe('respaldo')
  })
})

describe('reglas del proyecto / project rules', () => {
  it('el código PT viaja en `code` / code carried in `code`', () => {
    expect(mensajeDeError({ code: 'PT003' })).toBe(REGLAS_DEL_PROYECTO.PT003)
  })

  it('el código PT viaja dentro del mensaje / code embedded in the message', () => {
    const error = {
      message: 'Esta tarea requiere foto de evidencia para marcarse como Hecha.',
    }
    expect(mensajeDeError(error, 'respaldo')).toBe(REGLAS_DEL_PROYECTO.PT003)
  })

  it('todas las reglas tienen texto / every rule has text', () => {
    // Si una migración define un código nuevo y nadie lo agrega aquí, el
    // Administrador ve el respaldo genérico en vez de la razón real.
    for (const pt of ['PT001', 'PT002', 'PT003', 'PT004', 'PT005', 'PT006', 'PT007', 'PT008', 'PT009']) {
      expect(mensajeDeError({ code: pt })).toBe(REGLAS_DEL_PROYECTO[pt])
      expect(REGLAS_DEL_PROYECTO[pt].length).toBeGreaterThan(20)
    }
  })
})

describe('reglas de gestión de accesos / access-management rules', () => {
  it('explica por qué no se puede dejar el sistema sin Administrador', () => {
    expect(mensajeDeError({ code: 'PT006' }, 'respaldo')).toMatch(/Administrador/)
  })

  it('explica que no puedes desactivarte a ti mismo', () => {
    expect(mensajeDeError({ code: 'PT008' }, 'respaldo')).toMatch(/tu propio acceso/i)
  })
})

describe('códigos de Postgres / Postgres codes', () => {
  it('llave duplicada dice qué pasó, no dónde / says what, not where', () => {
    const salida = mensajeDeError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "categorias_nombre_key"',
    })
    expect(salida).toBe('Ya existe un registro con ese nombre.')
    expect(salida).not.toContain('categorias')
  })

  it('permiso denegado no nombra la política / does not name the policy', () => {
    expect(mensajeDeError({ code: '42501', message: 'permission denied for table tareas' })).toBe(
      'No tienes permiso para hacer esto.'
    )
  })
})

describe('fallos de red / network failures', () => {
  it('un TypeError de fetch se explica como conexión', () => {
    const error = new TypeError('Failed to fetch')
    expect(mensajeDeError(error, 'respaldo')).toMatch(/conexión/i)
  })
})

/* ---------------------------------------------------------------- */
/* El login no debe delatar qué correos existen                     */
/* ---------------------------------------------------------------- */

describe('mensajeDeLogin / no user enumeration', () => {
  it('credenciales inválidas y correo sin confirmar dan EL MISMO texto', () => {
    const a = mensajeDeLogin({ code: 'invalid_credentials', message: 'Invalid login credentials' })
    const b = mensajeDeLogin({ code: 'email_not_confirmed', message: 'Email not confirmed' })
    expect(a).toBe(b)
  })

  it('también cuando el cliente viejo solo manda `message`', () => {
    const a = mensajeDeLogin({ message: 'Invalid login credentials' })
    const b = mensajeDeLogin({ message: 'Email not confirmed' })
    expect(a).toBe(b)
  })

  it('un error inesperado tampoco distingue / an unexpected error stays mute', () => {
    // El respaldo del login es mudo a propósito: un error que nadie anticipó
    // es justo el que podría delatar el estado de una cuenta.
    const a = mensajeDeLogin({ code: 'user_banned', message: 'User is banned' })
    const b = mensajeDeLogin({ code: 'invalid_credentials' })
    expect(a).toBe(b)
  })

  it('el límite de intentos sí se distingue / rate limiting is told apart', () => {
    const limite = mensajeDeLogin({ code: 'over_request_rate_limit' })
    expect(limite).toMatch(/intentos/i)
    expect(limite).not.toBe(mensajeDeLogin({ code: 'invalid_credentials' }))
  })

  it('un fallo de red se distingue de una credencial mala', () => {
    const red = mensajeDeLogin(new TypeError('Failed to fetch'))
    expect(red).toMatch(/conexión/i)
    expect(red).not.toBe(mensajeDeLogin({ code: 'invalid_credentials' }))
  })

  it('ningún mensaje del login menciona la cuenta / never mentions the account', () => {
    const entradas = [
      { code: 'invalid_credentials' },
      { code: 'email_not_confirmed' },
      { code: 'user_already_exists' },
      { code: 'user_banned', message: 'User account is banned until 2027' },
      { message: 'Email address not authorized' },
    ]
    for (const e of entradas) {
      const salida = mensajeDeLogin(e)
      expect(salida.toLowerCase()).not.toContain('confirm')
      expect(salida.toLowerCase()).not.toContain('existe')
      expect(salida.toLowerCase()).not.toContain('banned')
      expect(salida.toLowerCase()).not.toContain('authorized')
    }
  })
})

/* ---------------------------------------------------------------- */
/* Autenticación fuera del login                                     */
/* ---------------------------------------------------------------- */

describe('autenticación ya identificada / authenticated auth errors', () => {
  it('una contraseña débil sí se explica: ahí ya no hay enumeración que proteger', () => {
    expect(mensajeDeError({ code: 'weak_password' }, 'respaldo')).toMatch(/débil/i)
  })

  it('repetir la contraseña anterior se explica', () => {
    expect(mensajeDeError({ code: 'same_password' }, 'respaldo')).toMatch(/distinta/i)
  })

  it('sesión expirada pide volver a entrar', () => {
    expect(mensajeDeError({ code: 'session_expired' }, 'respaldo')).toMatch(/sesión/i)
  })
})
