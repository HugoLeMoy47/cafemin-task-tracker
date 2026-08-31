import { DEMO_MODE } from '../config'

/**
 * Aviso permanente de ambiente de demostración.
 * Permanent demo-environment notice.
 *
 * No es descartable a propósito: quien vea la aplicación debe saber en todo
 * momento que los datos son ficticios y que no debe capturar información real.
 * Deliberately not dismissible: viewers must know at all times that the data
 * is fictitious and that no real information should be entered.
 */
export default function DemoBanner() {
  if (!DEMO_MODE) return null

  return (
    <div
      role="status"
      className="bg-amber-100 dark:bg-amber-950 border-b border-amber-300 dark:border-amber-800 px-4 py-2"
    >
      <p className="text-center text-xs sm:text-sm text-amber-900 dark:text-amber-200 max-w-4xl mx-auto">
        <span className="font-semibold">Ambiente de demostración.</span>{' '}
        Los datos son ficticios y pueden reiniciarse sin aviso. No captures información real de
        personas.
      </p>
    </div>
  )
}
