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
  { ignores: ['dist/**', 'node_modules/**', 'graphify-out/**', 'coverage/**'] },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
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

  // Prettier al final: desactiva reglas de formato en conflicto.
  // Prettier last: turns off conflicting formatting rules.
  prettier,
]
