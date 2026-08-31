/**
 * Configuración derivada del entorno de build (Vite).
 * Build-time configuration derived from the environment (Vite).
 *
 * Estas banderas se resuelven al construir, no en tiempo de ejecución:
 * cambiarlas exige un nuevo build y despliegue.
 * These flags are resolved at build time, not at runtime: changing them
 * requires a fresh build and deploy.
 */

/**
 * Modo demostración. Cuando está activo:
 * - se muestra el aviso permanente de ambiente de demostración
 * - se oculta el formulario de registro (el alta la hace el administrador)
 *
 * Demo mode. When enabled, shows the demo-environment notice and hides
 * the sign-up form.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'
