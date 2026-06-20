# Copilot Instructions

This repository is a Vite + React SPA using Supabase for auth, database, and storage.

## Stack
- React 18 + Vite 5, Tailwind CSS 3
- Supabase (Auth, Postgres with RLS, Storage)
- No router — navigation is state-based in `App.jsx`
- No global state manager — component-local state with Supabase subscriptions for realtime

## Commands
- `npm install`, `npm run dev`, `npm run build`, `npm run preview`

## Key conventions
- Keep Supabase credentials out of source code. Use `.env` and `.env.example`.
- Import the Supabase client exclusively from `src/supabaseClient.js`.
- Use validation helpers from `src/utils/validation.js` for forms and file uploads; avoid inlining validation logic.
- Schema changes go in `supabase/migrations/` as individual `.sql` files.
- Role guards live in both Supabase RLS policies (authoritative) and `App.jsx` render conditions. Keep both in sync.
- New views wire into `App.jsx` with a `currentView` check and a role guard; add the nav item in `Navbar.jsx`.
- Realtime subscriptions must be cleaned up in a `useEffect` return function — see `TaskList.jsx` for the pattern.
- Preserve the Tailwind utility-based styling; do not introduce CSS modules or styled-components.
- Validate and sanitize user input before sending it to Supabase.
- Handle Supabase errors explicitly and show user-friendly messages instead of crashing.
- Document technical decisions in Spanish and English when adding comments or docs.
