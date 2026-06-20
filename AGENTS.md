# AGENTS.md

## Project Overview

CAFEMIN Task Tracker is a Vite + React single-page application with Tailwind CSS and Supabase for backend persistence and authentication.

## Key project files

- `package.json` - package metadata, dependencies, and scripts
- `vite.config.js` - Vite config for React
- `src/main.jsx` - app bootstrap
- `src/App.jsx` - main application shell
- `src/supabaseClient.js` - Supabase client factory using environment variables
- `src/components/` - feature components:
  - `CatalogManagement.jsx`
  - `Login.jsx`
  - `Navbar.jsx`
  - `Reports.jsx`
  - `TaskCard.jsx`
  - `TaskForm.jsx`
  - `TaskList.jsx`
  - `UserManagement.jsx`

## Environment and configuration

This project uses Vite environment variables for configuration.

- `.env.example` contains the expected variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

Do not hardcode credentials or environment-specific values into source files. Keep secrets in `.env` and avoid committing them.

## Run and build commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`

## Coding guidance for AI agents

- Use ES modules and React functional components.
- Preserve the existing Tailwind CSS utility-based styling pattern.
- Maintain separation of concerns: UI logic stays in components; Supabase access should remain centralized in `src/supabaseClient.js`.
- Avoid introducing duplicate state management patterns; follow the existing component-driven approach.

## Security & resilience guidance

- Validate and sanitize user input in forms before sending it to Supabase.
- Handle Supabase errors explicitly and show fallback UI or error messages instead of crashing.
- Treat every external API call as potentially failing: use try/catch and defensive null checking.
- Do not expose environment secrets in committed source files.
- Keep auth and public data access rules aligned with Supabase best practices.

## Suggested improvements for maintainability

- Add a root `README.md` with project setup, environment vars, and feature overview.
- Introduce unit tests for UI components and Supabase helpers using a lightweight test runner such as Vitest.
- Keep environment-specific config out of source and use `.env.example` as the template.

## Notes for future agents

- This repository currently has no dedicated test suite or documentation file beyond `.env.example`.
- If adding new features, place them in `src/components` and keep global configuration in `src/supabaseClient.js`.
- Avoid modifying `node_modules`.

---

## Instrucciones para agentes / Agent instructions

- Este repositorio es una app SPA con React + Vite y Supabase. Usa `npm install`, `npm run dev`, `npm run build`.
- No codifiques valores sensibles en el código. Usa `.env` y `.env.example`.
- Prioriza seguridad, validación de entrada y manejo robusto de errores.
- Documenta en español e inglés si agregas comentarios técnicos o documentación de proyecto.
- Sugiere pruebas unitarias, mocks de Supabase y casos límite cuando propongas cambios.
