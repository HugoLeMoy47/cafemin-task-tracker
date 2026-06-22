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
  - `KanbanBoard.jsx` — drag-and-drop Kanban board for all roles (uses `@dnd-kit/core`); Admin/Gestor get edit/delete/reopen buttons and a drag handle per card; Asignado gets full-card drag, forward-only transitions
  - `TaskCard.jsx` — individual task card with status transitions, photo upload, overdue indicator, edit/delete (used in TaskList only, kept for reference)
  - `TaskForm.jsx` — create/edit form with fields: nombre, detalles, asignado, categoría, área, fecha_limite, foto_requerida
  - `UserManagement.jsx` — user creation and role management (Admin only)
  - `CatalogManagement.jsx` — CRUD for categorías and áreas de trabajo with inline editing (Admin only)
  - `Reports.jsx` — task reports grouped by estado, asignado, or fecha (Admin/Gestor only)
- `supabase/schema.sql` — full database schema: tables, triggers, RLS policies, seed data
- `supabase/migrations/add_fecha_limite.sql` — adds `fecha_limite date` column to `tareas`
- `supabase/migrations/storage_evidencias_policies.sql` — RLS policies for the `evidencias` Storage bucket
- `supabase/migrations/security_rls_and_stability.sql` — adds `WITH CHECK` to Asignado update policy and `trg_restrict_asignado_update` trigger

## Database schema

Tables: `usuarios`, `tareas`, `categorias`, `areas_trabajo`

Key behaviors:
- `fecha_hecho` is set/cleared automatically by trigger `trg_fecha_hecho` when `estado` transitions to/from `'Hecho'`
- New auth users get a profile row in `usuarios` via the `on_auth_user_created` trigger with role `'Asignado'`
- `get_my_role()` is a security-definer SQL function used in all RLS policies
- RLS policies enforce: Admin/Gestor see all tasks; Asignado sees only tasks where `asignado_id = auth.uid()`
- The `"Asignado update own task"` policy has both `USING` and `WITH CHECK` to prevent self-reassignment
- Trigger `trg_restrict_asignado_update` enforces at DB level that Asignado can only modify `estado` and `evidencia_url`

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
| Administrador | Full access to all views and data; can create users with any role; can create/edit/delete/reopen any task on the Kanban |
| Gestor | Create/edit/reopen tasks, view reports; sees all tasks on the Kanban |
| Asignado | Sees only their own tasks on the Kanban; can drag cards forward only (Pendiente→En curso→Hecho); cannot reopen from Hecho |

Role guards exist at three levels:
1. **Supabase RLS** (authoritative — database enforces access)
2. **DB trigger `trg_restrict_asignado_update`** (column-level enforcement for Asignado updates)
3. **Client guards in `App.jsx` and `KanbanBoard.jsx`** (UI layer — prevents rendering and invoking unauthorized actions)

## View routing

Navigation is state-based (`currentView` in `App.jsx`). There is no React Router.

| `currentView` | Component | Roles |
|---------------|-----------|-------|
| `tasks` | `KanbanBoard` | Todos (comportamiento varía según rol) |
| `form` | `TaskForm` | Administrador, Gestor |
| `reports` | `Reports` | Administrador, Gestor |
| `users` | `UserManagement` | Administrador |
| `catalogs` | `CatalogManagement` | Administrador |

`KanbanBoard` adapts its behavior based on props: when `onEdit`/`onNew` are passed (Admin/Gestor), cards show a drag handle + action buttons; when omitted (Asignado), the full card is draggable with no action buttons.

## Dark mode

- Strategy: Tailwind `darkMode: 'class'` — the `dark` class is toggled on `<html>` by `App.jsx`.
- State is read from `localStorage` on first render (lazy initializer in `useState`). If no preference is stored, falls back to `window.matchMedia('(prefers-color-scheme: dark)')`.
- DOM sync is handled in a `useEffect` watching `darkMode` state — **not** inside the state setter. This is the correct React pattern.
- An anti-flash `<script>` in `index.html` applies the `dark` class before React hydrates, preventing a white flash on page load.
- Toggle button lives in `Navbar.jsx` and calls `onToggleDark` prop from `App.jsx`.
- All components use `dark:` Tailwind variants for backgrounds, text, borders, and badges.

## Mobile responsiveness

- Tailwind breakpoints: `sm:` (640 px) is the primary mobile/desktop split.
- `Navbar.jsx`: hamburger icon (`flex sm:hidden`) toggles a dropdown menu; desktop nav items are `hidden sm:flex`.
- Tables in `UserManagement`, `Reports`, and `TaskList`: wrapped in `overflow-x-auto` div; tables have `min-w-[480px]` to prevent collapsing.
- `KanbanBoard`: the three-column layout is wrapped in `overflow-x-auto` with `min-w-[480px]` so it scrolls horizontally on narrow screens.
- Forms use `grid-cols-1 sm:grid-cols-2` for two-column layout on wider screens.
- Action buttons stack vertically on mobile using `flex-col sm:flex-row`.

## Footer

- A `<footer>` element lives inside `App.jsx`, after `<main>`, inside the root wrapper div.
- Root wrapper uses `flex flex-col min-h-screen`; `<main>` has `flex-1` so content pushes the footer to the bottom.
- Footer displays: `© 2026 Freejolitos Consultores. Todos los derechos reservados.`
- Styled with `border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900`.

## Kanban board

`KanbanBoard.jsx` uses `@dnd-kit/core` and `@dnd-kit/utilities`:
- Three droppable columns: Pendiente, En curso, Hecho
- Each task card is a draggable element with optimistic state update on drop
- **Admin/Gestor cards**: drag handle (`⠿⠿`) initiates drag; remaining card area is clickable for Edit/Delete/Reopen buttons. `onPointerDown` stopPropagation on buttons prevents drag capture.
- **Asignado cards**: full card is the drag surface; no action buttons rendered
- Asignado can only drag cards **forward** (Pendiente→En curso→Hecho). Dragging backward from `'Hecho'` is blocked in `handleDragEnd`
- Admin/Gestor bypass the photo-evidence gate when dragging to `'Hecho'` (gate still applies to Asignado)
- If a task requires photo evidence (`foto_requerida = true`) and the user is Asignado, dropping on "Hecho" opens a `PhotoModal` before persisting
- Realtime channel name is unique per component instance (`kanban-tareas-${useId()}`) to prevent duplicate subscriptions on rapid unmount/remount

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
- The `"Asignado update own task"` policy requires both `USING` and `WITH CHECK` — never remove the `WITH CHECK` or it allows self-reassignment.
- The `trg_restrict_asignado_update` trigger locks Asignado to only `estado`/`evidencia_url` — if adding new updatable columns for Asignado, update the trigger's exclusion list.
- Client-side role checks in `App.jsx` and `KanbanBoard.jsx` are defense-in-depth only.
- Validate user input using `src/utils/validation.js` helpers before sending to Supabase.
- Handle Supabase errors explicitly and surface them to the user — never silently swallow errors. `fetchProfile`, `loadOptions`, and all async handlers must show user-facing messages on failure.
- Auth initialization uses `onAuthStateChange` only (no `getSession` — it fires `INITIAL_SESSION` synchronously and avoids a concurrent double-fetch race).
- For admin operations that call `supabase.auth.signUp`, use a transient client with `persistSession: false` to avoid overwriting the current admin session.
- Keep credentials in `.env` and out of source code.

## Notes for future agents

- No test suite exists. Adding Vitest + React Testing Library is the recommended next step, starting with `src/utils/validation.js`.
- `TaskList.jsx` is no longer used in the main navigation flow (all roles now use `KanbanBoard`). It is kept for reference but can be removed if the codebase is cleaned up.
- `KanbanBoard` applies an optimistic update to `tasks` state immediately on drag-end for a responsive feel, then persists to Supabase. Realtime fires afterward and confirms the state.
- `KanbanBoard` fetches `asignado:usuarios!asignado_id(id, nombre_completo)` to show the assignee name on admin cards. It does not fetch `creado_por` — do not reference `task.creador` inside `KanbanBoard` components.
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
