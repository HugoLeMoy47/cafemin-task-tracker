# CAFEMIN Task Tracker

A task tracker SPA built with React, Vite, Tailwind CSS, and Supabase. Designed for task management, user roles, catalog maintenance, and evidence-based status updates.

## Setup / Configuración

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file from `.env.example`.
3. Fill in Supabase values in `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Start the app:
   ```bash
   npm run dev
   ```

## Project structure

- `src/main.jsx` — application bootstrapping
- `src/App.jsx` — main app container and navigation
- `src/supabaseClient.js` — central Supabase client configuration
- `src/utils/validation.js` — shared input validation logic
- `src/components/` — feature UI modules

## Environment variables

This project relies on Vite environment variables stored in `.env`.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not commit sensitive keys to source control.

## Development commands

- `npm run dev` — start development server
- `npm run build` — build production assets
- `npm run preview` — preview production build

## Security and resilience

- Validate all form input before sending it to Supabase.
- Handle Supabase errors explicitly and display clear messages.
- Keep credentials in `.env` and avoid hardcoding secrets.

## Notes

There is no dedicated test suite yet. Consider adding Vitest or React Testing Library for component and helper coverage.
