# AGENTS.md

## Project Overview

CAFEMIN Task Tracker is a Vite + React SPA with Tailwind CSS and Supabase for backend persistence, authentication, and file storage. It manages tasks across three user roles: Administrador, Gestor, and Asignado.

## Key project files

- `package.json` — package metadata, dependencies, and scripts
- `vite.config.js` — Vite config for React
- `src/main.jsx` — app bootstrap
- `src/App.jsx` — main application shell; handles session, profile fetch, role-guarded view routing
- `src/supabaseClient.js` — Supabase client factory using environment variables
- `src/utils/validation.js` — shared input validation helpers (email, password, task payload, image file)
- `src/components/` — feature components:
  - `Login.jsx` — email/password login and self-registration
  - `Navbar.jsx` — sticky header with role-filtered navigation
  - `TaskList.jsx` — task list with state filters, realtime subscription, and load-more pagination (20/page)
  - `TaskCard.jsx` — individual task card with status transitions, photo upload, overdue indicator, edit/delete
  - `TaskForm.jsx` — create/edit form including fecha_limite and foto_requerida
  - `UserManagement.jsx` — role assignment and profile deletion (Admin only)
  - `CatalogManagement.jsx` — CRUD for categorías and áreas de trabajo with inline editing (Admin only)
  - `Reports.jsx` — task reports grouped by estado, asignado, or fecha (Admin/Gestor only)
- `supabase/schema.sql` — full database schema: tables, triggers, RLS policies, seed data
- `supabase/migrations/add_fecha_limite.sql` — adds `fecha_limite date` column to `tareas`

## Database schema

Tables: `usuarios`, `tareas`, `categorias`, `areas_trabajo`

Key behaviors:
- `fecha_hecho` is set automatically by a trigger when `estado` changes to `'Hecho'`
- New auth users get a profile row created via trigger `on_auth_user_created` with role `'Asignado'`
- `get_my_role()` is a security-definer helper function used in all RLS policies
- RLS policies enforce: Admin/Gestor see all tasks; Asignado sees only their own tasks

## Role system

| Role | Permissions |
|------|-------------|
| Administrador | Full access to all views and data |
| Gestor | Create/edit tasks, view reports |
| Asignado | View and update status of their own tasks only |

Role guards exist both in Supabase RLS (data layer) and in `App.jsx` (render layer).

## Environment and configuration

- `.env.example` contains the expected variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Enable Realtime for the `tareas` table in Supabase Dashboard (`Database → Replication`) for live updates to work.
- Do not hardcode credentials or environment-specific values into source files.

## Run and build commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Coding guidance for AI agents

- Use ES modules and React functional components with hooks.
- Preserve the existing Tailwind CSS utility-based styling pattern.
- Role-based access is enforced in two places: Supabase RLS policies (authoritative) and `App.jsx` render guards (UI layer). Keep both in sync when adding new views.
- State-based navigation is intentional — there is no React Router. New views go in `App.jsx` as new `currentView` values with a corresponding role guard.
- Supabase access stays in components directly (no service layer). Keep the client import from `src/supabaseClient.js`.
- Use `src/utils/validation.js` helpers for form and file validation instead of inlining logic.
- When adding new columns to `tareas`, create a migration file under `supabase/migrations/`.

## Security & resilience guidance

- Validate user input using helpers in `src/utils/validation.js` before sending to Supabase.
- Handle Supabase errors explicitly and show fallback UI or error messages.
- Trust RLS as the authoritative security boundary; client-side role checks are defense-in-depth only.
- Do not expose environment secrets in committed source files.
- Photo uploads go to the `evidencias` bucket in Supabase Storage; the public URL is stored in `tareas.evidencia_url`.

## Notes for future agents

- No dedicated test suite exists yet. Adding Vitest + React Testing Library is the recommended next step.
- `TaskList` uses a Supabase Realtime channel (`tareas-realtime`) that must be cleaned up on unmount — the pattern is already in place.
- Pagination is client-side: all tasks are fetched, then sliced at `visibleCount`. This is intentional for simplicity; revisit if the task count grows significantly.
- `CatalogManagement` uses `fetchItems` (not `fetch`) to avoid shadowing the browser global.
- If adding new features, place components in `src/components/` and wire them into `App.jsx` with a role guard.
- Avoid modifying `node_modules`.

---

## Instrucciones para agentes / Agent instructions

- Este repositorio es una SPA con React + Vite y Supabase. Usa `npm install`, `npm run dev`, `npm run build`.
- No codifiques valores sensibles en el código. Usa `.env` y `.env.example`.
- Los cambios de esquema van en `supabase/migrations/` como archivos SQL individuales.
- Prioriza seguridad, validación de entrada y manejo robusto de errores de Supabase.
- Documenta en español e inglés si agregas comentarios técnicos o documentación de proyecto.
- Sugiere pruebas unitarias con Vitest y casos límite cuando propongas cambios.
