import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { validatePasswordChange, MIN_PASSWORD_LENGTH } from '../utils/validation'
import { mensajeDeError } from '../lib/errores'

/**
 * Pantalla para definir una contraseña nueva tras seguir el enlace de
 * recuperación enviado por correo.
 * Screen to set a new password after following the emailed recovery link.
 *
 * Al llegar por ese enlace, Supabase ya estableció una sesión temporal: por eso
 * `updateUser` funciona sin pedir la contraseña anterior. Y por eso mismo esta
 * pantalla tiene que interceptar el flujo — si no, quien sigue el enlace entra
 * a la aplicación sin haber cambiado nada.
 *
 * Following that link, Supabase has already established a temporary session, so
 * `updateUser` works without the old password — and that is exactly why this
 * screen must intercept: otherwise the user lands in the app without changing it.
 */
export default function UpdatePassword({ onListo }) {
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  /* Mismo piso de 44 px que en Login: es la otra pantalla sin sesión, y se
     llega a ella desde un correo, casi siempre abierto en el teléfono.
     Same 44 px floor as Login: reached from an email, usually on a phone. */
  const inputClass =
    'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 min-h-[44px] text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'

  async function handleSubmit(e) {
    e.preventDefault()
    const fallo = validatePasswordChange({ password, confirmacion })
    if (fallo) {
      setError(fallo)
      return
    }

    setGuardando(true)
    setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(mensajeDeError(updateError, 'No se pudo guardar la contraseña. Intenta de nuevo.'))
      setGuardando(false)
      return
    }

    // Se cierra la sesión a propósito: obliga a entrar con la contraseña nueva,
    // lo que confirma que quedó guardada y deja el estado limpio.
    // Signing out on purpose: it forces a login with the new password, proving
    // it was stored and leaving no half-recovered session behind.
    await supabase.auth.signOut()
    onListo()
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3">
              <span className="text-white text-xl font-bold">C</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Define tu contraseña</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Escríbela dos veces para confirmar que quedó como querías.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contraseña nueva
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                className={inputClass}
                placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Repite la contraseña
              </label>
              <input
                type="password"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                className={inputClass}
                placeholder="La misma de arriba"
              />
            </div>
            <button
              type="submit"
              disabled={guardando}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
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
