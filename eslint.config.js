import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'

/**
 * Configuración de ESLint (flat config) para el Task Tracker de CAFEMIN.
 * ESLint flat config for the CAFEMIN Task Tracker.
 *
 * Objetivo: detectar errores reales (hooks mal usados, variables sin declarar,
 * dependencias faltantes) sin pelear con el formato — eso lo resuelve Prettier.
 * Goal: catch real defects without fighting formatting — Prettier owns that.
 */
export default [
  // `dist-*` cubre las salidas de los arneses de verificación
  // (`dist-movil`, etc.). Sin ellas, `npm run lint` reporta miles de errores
  // sobre código minificado y deja de servir para nada.
  // Without dist-*, `npm run lint` drowns in minified build output.
  { ignores: ['dist/**', 'dist-*/**', 'node_modules/**', 'graphify-out/**', 'coverage/**'] },

  js.configs.recommended,

  /**
   * `pruebas/` corre en Node, pero las funciones que le pasa a Playwright
   * —`medir()`— se serializan y se ejecutan DENTRO del navegador. Por eso
   * necesita los dos juegos de globales a la vez: `console` y `process` por un
   * lado, `document` y `getComputedStyle` por el otro.
   *
   * Test scripts run in Node, but the functions handed to Playwright execute
   * inside the browser, so both global sets apply.
   */
  {
    files: ['pruebas/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
  },

  /**
   * Configuración y herramientas de build: corren en Node, no en el navegador.
   * Sin esto, `process` y `fs` se reportan como variables sin declarar.
   * Build tooling runs in Node, not the browser.
   */
  {
    files: ['vite.config.js', 'eslint.config.js', 'build/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  {
    files: ['**/*.{js,jsx}'],
    ignores: ['vite.config.js', 'eslint.config.js', 'build/**/*.js', 'pruebas/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,

      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // El proyecto no usa PropTypes ni TypeScript. Se apaga la regla para que
      // el lint senale defectos reales; migrar a TS es una decision pendiente.
      // The project uses neither PropTypes nor TypeScript. Disabled so lint
      // surfaces real defects; migrating to TS is a pending decision.
      'react/prop-types': 'off',

      // Las credenciales de Supabase se leen en UN solo archivo
      // (src/supabaseClient.js). Importar el SDK en otro lado invita a
      // duplicar la lectura del entorno, que es como se rompio un despliegue.
      // Supabase credentials are read in exactly ONE file. Importing the SDK
      // elsewhere invites duplicated env reads — how a deployment once broke.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message:
                'Importa el cliente desde src/supabaseClient.js (supabase o createTransientClient). / Import the client from src/supabaseClient.js instead.',
            },
          ],
        },
      ],

      // Higiene general / General hygiene
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',

      // Seguridad básica / Basic security (OWASP A03 — Injection / XSS)
      'react/no-danger': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },

  // Pruebas: entorno Node + globals de Vitest / Tests: Node env + Vitest globals
  {
    files: ['**/*.test.{js,jsx}', '**/__tests__/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Unico archivo autorizado a importar el SDK de Supabase.
  // The only file allowed to import the Supabase SDK.
  {
    files: ['src/supabaseClient.js'],
    rules: { 'no-restricted-imports': 'off' },
  },

  // Prettier al final: desactiva reglas de formato en conflicto.
  // Prettier last: turns off conflicting formatting rules.
  prettier,
]
