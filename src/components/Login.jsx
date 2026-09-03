import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { DEMO_MODE } from '../config'
import { MIN_PASSWORD_LENGTH } from '../utils/validation'
import { mensajeDeError, mensajeDeLogin } from '../lib/errores'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    // `mensajeDeLogin` colapsa cualquier distinción entre estados de cuenta.
    // Es el único punto donde el servidor le responde a alguien que todavía no
    // se identificó, así que una diferencia de texto entre "no existe" y
    // "contraseña incorrecta" convierte la pantalla en un detector de correos.
    // Collapses account-state distinctions: the only anonymous entry point.
    if (error) setError(mensajeDeLogin(error))
    setLoading(false)
  }

  /**
   * Envía el correo de recuperación.
   *
   * El mensaje de confirmación es DELIBERADAMENTE el mismo exista o no la
   * cuenta: responder distinto convertiría esta pantalla en un detector de
   * correos registrados (enumeración de usuarios).
   *
   * The confirmation message is deliberately identical whether or not the
   * account exists: differing responses would turn this screen into a user
   * enumeration oracle.
   */
  async function handleReset(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })

    // Solo se muestran fallos de transporte (red, límite de envío), nunca si la
    // cuenta existe. Show transport failures only, never account existence.
    if (error) setError(mensajeDeError(error, 'No se pudo enviar el correo. Intenta de nuevo.'))
    else {
      setMessage(
        'Si ese correo tiene una cuenta, te enviamos un enlace para restablecer la contraseña. Revisa también la carpeta de correo no deseado.'
      )
    }
    setLoading(false)
  }

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre_completo: fullName } },
    })
    if (error) setError(mensajeDeError(error, 'No se pudo crear la cuenta. Intenta de nuevo.'))
    else setMessage('Revisa tu correo para confirmar tu cuenta y luego inicia sesión.')
    setLoading(false)
  }

  /**
   * `min-h-[44px]`: medido EN PRODUCCIÓN, no en el arnés. Los campos salían a
   * 42 px. Faltaban dos, pero el piso es el piso, y esta es la única pantalla
   * que toca el 100% de la gente — y la única que se toca antes de saber si la
   * aplicación sirve.
   *
   * Measured in production, not in the harness: the fields were 42 px. Two
   * pixels short, but this is the one screen every single user touches.
   */
  const inputClass =
    'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 min-h-[44px] text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'

  /** El enlace de «olvidé mi contraseña» medía 20 px de alto: solo el texto. */
  const claseEnlace =
    'text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center justify-center min-h-[44px] px-3 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex-1 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3">
            <span className="text-white text-xl font-bold">C</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CAFEMIN</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Seguidor de Tareas</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg mb-4 text-sm">
            {message}
          </div>
        )}

        <form
          onSubmit={
            mode === 'login' ? handleLogin : mode === 'reset' ? handleReset : handleSignup
          }
          className="space-y-4"
        >
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className={inputClass}
                placeholder="Tu nombre completo"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
              placeholder="correo@ejemplo.com"
            />
          </div>
          {mode !== 'reset' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              className={inputClass}
              placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
            />
          </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading
              ? 'Cargando...'
              : mode === 'login'
                ? 'Iniciar sesión'
                : mode === 'reset'
                  ? 'Enviar enlace'
                  : 'Registrarse'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          {mode === 'reset' ? (
            <button
              onClick={() => { setMode('login'); setError(''); setMessage('') }}
              className={claseEnlace}
            >
              Volver a iniciar sesión
            </button>
          ) : (
            <button
              onClick={() => { setMode('reset'); setError(''); setMessage('') }}
              className={claseEnlace}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </p>

        {DEMO_MODE ? (
          <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
            El alta de usuarios la realiza el administrador. Si necesitas una cuenta de prueba,
            solicítala a quien te compartió esta demostración.
          </p>
        ) : (
        <p className="mt-5 text-center text-sm text-gray-600 dark:text-gray-400">
          {mode === 'login' ? (
            <>
              ¿No tienes cuenta?{' '}
              <button
                onClick={() => { setMode('signup'); setError(''); setMessage('') }}
                className={`${claseEnlace} font-medium`}
              >
                Regístrate
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <button
                onClick={() => { setMode('login'); setError(''); setMessage('') }}
                className={`${claseEnlace} font-medium`}
              >
                Inicia sesión
              </button>
            </>
          )}
        </p>
        )}
      </div>
      </div>
      <footer className="border-t border-gray-200/60 dark:border-gray-700/60 bg-white/40 dark:bg-gray-900/40 py-3">
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          © 2026 Freejolitos Consultores. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  )
}
