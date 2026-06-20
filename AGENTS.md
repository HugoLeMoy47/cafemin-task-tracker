# AGENTS.md

## Project Overview

CAFEMIN Task Tracker is a Vite + React SPA with Tailwind CSS and Supabase for backend persistence, authentication, and file storage. It manages operational tasks across three user roles: Administrador, Gestor, and Asignado.

## Key project files

- `package.json` — package metadata, dependencies, and scripts
- `vite.config.js` — Vite config for React
- `src/main.jsx` — app bootstrap
- `src/App.jsx` — main shell; handles session, profile fetch, and role-guarded state-based routing
- `src/supabaseClient.js` — Supabase client factory using environment variables (anon key only)
- `src/utils/validation.js` — shared validation helpers: email, password, task payload, image file
- `src/components/` — feature components:
  - `Login.jsx` — email/password login and self-registration
  - `Navbar.jsx` — sticky header with role-filtered navigation items
  - `KanbanBoard.jsx` — drag-and-drop Kanban board shown to Asignado role (uses `@dnd-kit/core`)
  - `TaskList.jsx` — task list with state filters, realtime subscription, and load-more pagination (Admin/Gestor)
  - `TaskCard.jsx` — individual task card with status transitions, photo upload, overdue indicator, edit/delete
  - `TaskForm.jsx` — create/edit form with fields: nombre, detalles, asignado, categoría, área, fecha_limite, foto_requerida
  - `UserManagement.jsx` — user creation and role management (Admin only)
  - `CatalogManagement.jsx` — CRUD for categorías and áreas de trabajo with inline editing (Admin only)
  - `Reports.jsx` — task reports grouped by estado, asignado, or fecha (Admin/Gestor only)
- `supabase/schema.sql` — full database schema: tables, triggers, RLS policies, seed data
- `supabase/migrations/add_fecha_limite.sql` — adds `fecha_limite date` column to `tareas`
- `supabase/migrations/storage_evidencias_policies.sql` — RLS policies for the `evidencias` Storage bucket

## Database schema

Tables: `usuarios`, `tareas`, `categorias`, `areas_trabajo`

Key behaviors:
- `fecha_hecho` is set automatically by a trigger when `estado` changes to `'Hecho'`
- New auth users get a profile row in `usuarios` via the `on_auth_user_created` trigger with role `'Asignado'`
- `get_my_role()` is a security-definer SQL function used in all RLS policies
- RLS policies enforce: Admin/Gestor see all tasks; Asignado sees only tasks where `asignado_id = auth.uid()`

## Storage

- Bucket: `evidencias` (public bucket — required for `getPublicUrl` to work)
- RLS policies defined in `supabase/migrations/storage_evidencias_policies.sql`:
  - INSERT: authenticated users can upload
  - SELECT: public read
  - DELETE: authenticated users can delete
- Public URL stored in `tareas.evidencia_url` after upload

## Role system

| Role | Permissions |
|------|-------------|
| Administrador | Full access to all views and data; can create users with any role |
| Gestor | Create/edit tasks, view reports |
| Asignado | Sees only their own tasks via a Kanban drag-and-drop board |

Role guards exist at two levels:
1. **Supabase RLS** (authoritative — database enforces access)
2. **`App.jsx` render guards** (UI layer — prevents rendering unauthorized views)

## View routing

Navigation is state-based (`currentView` in `App.jsx`). There is no React Router.

| `currentView` | Component | Roles |
|---------------|-----------|-------|
| `tasks` | `KanbanBoard` | Asignado |
| `tasks` | `TaskList` | Administrador, Gestor |
| `form` | `TaskForm` | Administrador, Gestor |
| `reports` | `Reports` | Administrador, Gestor |
| `users` | `UserManagement` | Administrador |
| `catalogs` | `CatalogManagement` | Administrador |

## Kanban board

`KanbanBoard.jsx` uses `@dnd-kit/core` and `@dnd-kit/utilities`:
- Three droppable columns: Pendiente, En curso, Hecho
- Each task card is a draggable element with optimistic state update on drop
- If a task requires photo evidence (`foto_requerida = true`), dropping it on "Hecho" opens a photo upload modal before persisting the status change
- Realtime channel `kanban-tareas` refreshes data on any change to `tareas`

## User creation

`UserManagement.jsx` creates users using a **transient Supabase client** (`persistSession: false`, `autoRefreshToken: false`). This prevents `signUp` from overwriting the Admin's active session in localStorage. After creation, the profile row created by the `on_auth_user_created` trigger is immediately updated with the selected role.

## Environment and configuration

- `.env.example` contains expected variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Enable Realtime for the `tareas` table in Supabase Dashboard (`Database → Replication`)
- Never hardcode credentials in source files

## Run and build commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Coding guidance for AI agents

- Use ES modules and React functional components with hooks.
- Preserve the existing Tailwind CSS utility-based styling — no CSS modules or styled-components.
- Role guards must be kept in sync between Supabase RLS and `App.jsx`. Adding a new view requires both a role check in `App.jsx` and, if applicable, RLS policies.
- State-based navigation is intentional. New views: add a `currentView` value in `App.jsx`, a role guard, and a nav item in `Navbar.jsx`.
- Supabase access lives directly in components; import the client from `src/supabaseClient.js`.
- Use helpers from `src/utils/validation.js` for form and file validation — do not inline logic.
- Schema changes go in `supabase/migrations/` as individual `.sql` files.
- Storage bucket changes (policies, new buckets) also go in `supabase/migrations/`.
- When adding realtime subscriptions, always return a cleanup function: `return () => supabase.removeChannel(channel)`.
- Never name a function `fetch` inside a component — it shadows the browser global. Use descriptive names like `fetchItems`, `fetchTasks`.

## Security & resilience guidance

- Trust Supabase RLS as the authoritative security boundary.
- Client-side role checks in `App.jsx` are defense-in-depth only.
- Validate user input using `src/utils/validation.js` helpers before sending to Supabase.
- Handle Supabase errors explicitly and surface them to the user — never silently swallow errors.
- For admin operations that call `supabase.auth.signUp`, use a transient client with `persistSession: false` to avoid overwriting the current admin session.
- Keep credentials in `.env` and out of source code.

## Notes for future agents

- No test suite exists. Adding Vitest + React Testing Library is the recommended next step, starting with `src/utils/validation.js`.
- Pagination in `TaskList` is client-side (all tasks fetched, then sliced by `visibleCount`). This is intentional for the current scale; revisit if the task volume grows significantly.
- `KanbanBoard` applies an optimistic update to `tasks` state immediately on drag-end for a responsive feel, then persists to Supabase. Realtime fires afterward and confirms the state.
- Avoid modifying `node_modules`.

---

## Instrucciones para agentes / Agent instructions

- Repositorio: SPA con React + Vite, Tailwind y Supabase. Comandos: `npm install`, `npm run dev`, `npm run build`.
- No codifiques valores sensibles. Usa `.env` y `.env.example`.
- Cambios de esquema o políticas de Storage → archivos SQL en `supabase/migrations/`.
- Los guards de rol existen en dos capas (RLS + `App.jsx`). Mantén ambas sincronizadas.
- Para crear usuarios desde el Admin, usa un cliente Supabase con `persistSession: false`.
- Documenta en español e inglés cuando agregues comentarios técnicos o documentación de proyecto.
- Sugiere pruebas unitarias con Vitest al proponer cambios en lógica de negocio.
