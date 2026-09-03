# AGENTS.md

## Project Overview

CAFEMIN Task Tracker is a Vite + React SPA with Tailwind CSS and Supabase for backend persistence, authentication, and file storage. It manages operational tasks across three user roles: Administrador, Gestor, and Asignado.

## Key project files

- `package.json` — package metadata, dependencies, and scripts
- `vite.config.js` — Vite config for React
- `src/main.jsx` — app bootstrap
- `src/App.jsx` — main shell; handles session, profile fetch, and role-guarded state-based routing
- `src/supabaseClient.js` — **the only module that reads the Supabase env vars.** Exports the shared `supabase` client and `createTransientClient()`. Accepts `VITE_SUPABASE_PUBLISHABLE_KEY` (preferred) or the legacy `VITE_SUPABASE_ANON_KEY`. An ESLint `no-restricted-imports` rule blocks importing `@supabase/supabase-js` anywhere else — a second module-level `createClient` reading a stale variable name is exactly how the app once shipped broken.
- `src/config.js` — environment flags (`VITE_DEMO_MODE`)
- `src/utils/validation.js` — shared validation helpers: email, password, task payload, image file
- `src/lib/` — **pure logic: no React, no Supabase import at module level.** Each file has its `.test.js` beside it.
  - `reportes.js` — aggregations, metrics, filtering and sorting for the reports module
  - `enlaceReporte.js` — report state ⇄ URL query string (`leerEnlace`, `escribirEnlace`, `sanearFiltros`)
  - `errores.js` — `mensajeDeError(error, respaldo)` and `mensajeDeLogin(error)`. **Allowlist**: only text this module defines is ever shown; anything unrecognized becomes the caller's fallback
  - `csv.js` — CSV construction and download (`;` separator + UTF-8 BOM for Spanish Excel)
  - `flujoTareas.js` — the task state flow: `siguienteEstado`, `avanceDisponible`, `puedeMover`. Mirrors the database's `PT002`/`PT003` so the UI never offers a move the database will refuse
  - `evidencias.js` — evidence paths and signed URLs; imports the client lazily so the helpers stay testable without credentials
  - `plantillas.js` — pure logic for routine task templates and profile preparation: ordering, payload mapping and validation
  - `gamificacion.js` — volunteer progress metrics, shift milestone calculation and positive impact victory messages
  - `confeti.js` — accessible, zero-dependency canvas confetti burst respecting `prefers-reduced-motion`
- `src/hooks/useAnchoDeCaja.js` — an element's real pixel width via `ResizeObserver`; returns `null` before the first measurement, and callers must not guess a default (a guessed width renders one frame with the wrong layout and visibly jumps)
- `src/hooks/usePantallaChica.js` — `matchMedia` at Tailwind's `sm:` breakdown (639 px) via `useSyncExternalStore`, so the value is right on the first render and a phone never flashes the desktop board
- `src/components/` — feature components:
  - `Login.jsx` — email/password login and password-reset request (self-registration is hidden when `VITE_DEMO_MODE` is on)
  - `UpdatePassword.jsx` — new-password screen reached through the recovery link
  - `EvidenceLink.jsx` — opens an evidence photo by minting a fresh signed URL
  - `Navbar.jsx` — sticky header with role-filtered navigation items
  - `KanbanBoard.jsx` — drag-and-drop Kanban board for all roles (uses `@dnd-kit/core`); Admin/Gestor get edit/delete/reopen buttons and a drag handle per card; Asignado gets full-card drag, forward-only transitions
  - `TaskCard.jsx` — individual task card with status transitions, photo upload, overdue indicator, edit/delete (used in TaskList only, kept for reference)
  - `TaskForm.jsx` — create/edit form with fields: nombre, detalles, asignado, categoría, área, fecha_limite, foto_requerida
  - `UserManagement.jsx` — user creation and role management (Admin only)
  - `CatalogManagement.jsx` — CRUD for categorías and áreas de trabajo with inline editing (Admin only)
  - `TemplateManagement.jsx` — CRUD for volunteer profiles and routine task templates (Admin and Gestor)
  - `ModalAsignarPlantilla.jsx` — modal for batch-assigning routine task profiles to volunteers (Admin and Gestor)
  - `ModalIniciarTurno.jsx` — volunteer self-check-in modal to pick a daily routine profile (Asignado)
  - `PoolTareasAbiertas.jsx` — collapsible drawer showing unassigned tasks available for volunteers to claim (Asignado)
  - `BitacoraTurno.jsx` — shift handover notes and observations panel/modal for all roles
  - `ProgresoVoluntario.jsx` — daily shift progress bar and victory milestones for volunteers (Asignado)
  - `CelebracionVictoria.jsx` — congratulatory modal with positive social impact messaging upon completing tasks
  - `ListaMovil.jsx` — the board below 640 px: one column at a time, tap-to-advance instead of drag. **Not a degraded mode** — see the README section on why the board's interaction model cannot survive a 360 px screen
  - `Reports.jsx` — reports container (Admin/Gestor only): four tabs, the global filter bar, per-tab sort, CSV export, and the URL state. **The only module that touches `window.history`.**
  - `components/reports/` — `Dashboard.jsx` (summary: KPIs, flow board, wait vs. work, recurring tasks, load), `graficas.jsx` (per-tab charts — components only, so React fast-refresh works), `base.jsx` (drawing primitives **and `fmtDias`**, which lives here so the desktop SVG and the mobile HTML cannot format a duration differently), `FlujoVertical.jsx` (the flow in HTML below 640 px — the SVG's labels land at 4 real px), `BarraFiltros.jsx` (collapses below 640 px), `EncabezadoOrdenable.jsx`, `CollapsibleGroup.jsx`
- `supabase/schema.sql` — full database schema: tables, triggers, RLS policies, seed data
- `supabase/migrations/` — run in this order; the README lists it too:
  1. `add_fecha_limite.sql` — adds `fecha_limite date` to `tareas`
  2. `storage_evidencias_policies.sql` — initial policies for the `evidencias` bucket
  3. `security_rls_and_stability.sql` — `WITH CHECK` on the Asignado update policy + `trg_restrict_asignado_update`
  4. `add_fecha_inicio.sql` — adds `fecha_inicio` and replaces `trg_fecha_hecho` with `trg_marcas_de_tiempo`
  5. `hardening_rls_demo_publica.sql` — policy hardening for public exposure
  6. `storage_evidencias_privado.sql` — private bucket + ownership-scoped access
  7. `reglas_cierre_asignado.sql` — moves the task-closing rules out of the client (see below)
  8. `search_path_handle_new_user.sql` — pins the last mutable `search_path`
  9. `proteger_ultimo_administrador.sql` — refuses to demote or delete the last admin (`PT006`)
  10. `desactivacion_de_usuarios.sql` — `activo` flag, `desactivar_usuario()` / `reactivar_usuario()`, and removal of the DELETE policy on `usuarios`
  11. `plantillas_perfil.sql` — routine task templates (`plantillas_perfil`, `plantilla_tareas`) and RLS policies for Admin/Gestor
  12. `autonomia_y_bitacora_turno.sql` — volunteer self-check-in (`iniciar_rutina_voluntario`), open task pool claiming (`reclamar_tarea_abierta`), and shift handover notes table (`bitacora_turnos`)
- `build/cabeceras.js` — **the only source of the published `_headers`.** A Vite plugin in `vite.config.js` runs it in `writeBundle` and writes `dist/_headers`, overwriting the copy of `public/_headers` (which is kept only as a documented fallback). It hashes the inline `<script>` from the built `index.html` so `script-src` never needs `unsafe-inline`, and derives `connect-src`/`img-src` from `VITE_SUPABASE_URL`. **The plugin throws on anything unexpected** — a deploy with no security headers looks exactly like a healthy one, and that silence is what makes such a failure last for months.
- `pruebas/movil.mjs` — the small-screen regression test (`npm run test:movil`). Needs `npm run build:movil` first.
- `supabase/tests/` — **run this before proposing any change to a policy, trigger or migration.** It mounts a throwaway PostgreSQL mirror by executing the real migration files in order, then replays 21 cases as a role without `BYPASSRLS`. See its README.
- `supabase/seeds/01_cuentas_demo.sql`, `02_datos_demo.sql`, `03_plantillas_demo.sql` — demo data; re-runnable, dates relative to `now()`, seeded task ids prefixed `cafede00-` and profile ids prefixed `cafepro0-` so a reset never touches live data

## Database schema

Tables: `usuarios`, `tareas`, `categorias`, `areas_trabajo`, `plantillas_perfil`, `plantilla_tareas`, `bitacora_turnos`

Key behaviors:
- `trg_marcas_de_tiempo` (from `add_fecha_inicio.sql`, replacing the older `trg_fecha_hecho`) stamps `fecha_hecho` on transitions to/from `'Hecho'` **and** `fecha_inicio` when a task first enters `'En curso'`. Without the start stamp only total elapsed time is measurable, which conflates waiting with working — the summary tab depends on this.
- New auth users get a profile row in `usuarios` via the `on_auth_user_created` trigger with role `'Asignado'`
- `get_my_role()` is a security-definer SQL function used in all RLS policies
- RLS policies enforce: Admin/Gestor see all tasks; Asignado sees only tasks where `asignado_id = auth.uid()`
- The `"Asignado update own task"` policy has both `USING` and `WITH CHECK` to prevent self-reassignment
- Trigger `trg_restrict_asignado_update` enforces at DB level that Asignado can only modify `estado` and `evidencia_url`, **and since `reglas_cierre_asignado.sql` also enforces the closing rules**: no closing a `foto_requerida` task without evidence (`PT003`), no reopening from `'Hecho'` (`PT002`), evidence must belong to the task (`PT004`), and evidence cannot be stripped from a closed task (`PT005`). Admin and Gestor bypass the first two by design.
- That function must **never mention the start-stamp column by name**: `add_fecha_inicio.sql` has a guard that inspects `prosrc` and aborts if it appears, because listing it would stop an Asignado from starting a task.
- It also normalizes blank `evidencia_url` to `null` on write, so `is null` is reliable everywhere else.

## Storage

- Bucket: `evidencias` — **private.** `storage_evidencias_privado.sql` sets `public = false` and replaces the original public-read policy.
- `tareas.evidencia_url` stores the file **path**, not a URL: `{task_id}/{timestamp}.{ext}`. Signed URLs expire, so persisting one is meaningless. `toStoragePath()` in `src/lib/evidencias.js` still accepts the legacy full public URL so pre-migration rows keep opening.
- Reads go through `createSignedUrl()` with a 60-second lifetime, minted at open time by `EvidenceLink.jsx`.
- Policies scope access by task ownership: the path's first segment is the task id, compared against the task's `asignado_id`, so an Asignado reaches only their own evidence.
- ⚠️ The migration and the signing code ship **together**. Running the SQL against a deployment that still calls `getPublicUrl()` makes every photo unreachable.

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
| `templates` | `TemplateManagement` | Administrador, Gestor |
| `form` | `TaskForm` | Administrador, Gestor |
| `reports` | `Reports` | Administrador, Gestor |
| `users` | `UserManagement` | Administrador |
| `catalogs` | `CatalogManagement` | Administrador |

`UpdatePassword` is not a `currentView`. `index.html` flags the recovery arrival on `window.__cafeminRecuperacion` **before** the bundle loads, because the Supabase client consumes and clears the URL fragment on init; `App.jsx` reads that flag and renders `UpdatePassword` instead of the app. Without the guard, following a recovery link would sign the person in without changing anything.

Inside `reports`, the active tab, the filters and the sort are held in `Reports.jsx` state and mirrored into the query string. That is the app's only use of the URL — the rest of the navigation is still state-based.

`KanbanBoard` adapts its behavior based on props: when `onEdit`/`onNew` are passed (Admin/Gestor), cards show a drag handle + action buttons; when omitted (Asignado), the full card is draggable with no action buttons.

## Dark mode

- Strategy: Tailwind `darkMode: 'class'` — the `dark` class is toggled on `<html>` by `App.jsx`.
- State is read from `localStorage` on first render (lazy initializer in `useState`). If no preference is stored, falls back to `window.matchMedia('(prefers-color-scheme: dark)')`.
- DOM sync is handled in a `useEffect` watching `darkMode` state — **not** inside the state setter. This is the correct React pattern.
- An anti-flash `<script>` in `index.html` applies the `dark` class before React hydrates, preventing a white flash on page load.
- Toggle button lives in `Navbar.jsx` and calls `onToggleDark` prop from `App.jsx`.
- All components use `dark:` Tailwind variants for backgrounds, text, borders, and badges.

## Mobile responsiveness

**The target device is an entry-level Android at 360 px, not a designer's phone.** Measure before claiming a layout works: render the real component with long, accented task names at 320, 360 and 412 px and check horizontal overflow, touch-target size (44 px floor), font size (12 px floor), and whether every interactive target is fully on screen. Short demo strings hide every overflow there is.

- **`KanbanBoard` renders one of two trees**, chosen in JS by `usePantallaChica`, not hidden with CSS: hiding one with `hidden sm:flex` would keep the `DndContext` and its sensors mounted on the device least able to afford it.
- Drag-and-drop exists **only above 640 px**. Below it, `ListaMovil` moves tasks by button. Any new way to move a task must go through `moverTarea`, never straight to `supabase.update`.
- Tailwind breakpoints: `sm:` (640 px) is the primary mobile/desktop split.
- `Navbar.jsx`: hamburger icon (`flex sm:hidden`) toggles a dropdown menu; desktop nav items are `hidden sm:flex`.
- Tables in `UserManagement`, `Reports`, and `TaskList`: wrapped in `overflow-x-auto` div; tables have `min-w-[480px]` to prevent collapsing. **This is the weakest part of the phone story** — a `min-w` inside `overflow-x-auto` hides content with no cue that it exists. Measured: "Tareas que se repiten" hides 166 px at 320 px, including its last column. Do not add another table this way without an affordance.
- The `overflow-x-auto` in `KanbanBoard` wraps the **desktop** tree only; below 640 px that tree is not rendered at all.
- Forms use `grid-cols-1 sm:grid-cols-2` for two-column layout on wider screens.

**Charts are the trap.** An SVG with a `viewBox` scales its text along with everything else, so a font size that reads fine on a desktop is not a font size on a phone — it is that number times the scale factor. `viewBox="0 0 600 …"` at 360 px renders at scale 0.49, so its 12 px labels are **5.9 real px**. Before adding or resizing chart text, compute `clientWidth / viewBox-width` and multiply. Where the labels carry the meaning, render HTML instead of SVG — that is why `reports/FlujoVertical.jsx` exists — which has the added benefit of honoring the reader's system font size. `GraficaEstado`, `GraficaAsignado` and `GraficaSemanal` have **not** been fixed and still measure 5.1–6.9 real px.

**There is a regression test — run it.** `npm run build:movil && npm run test:movil` measures six things across login, the board and all four report tabs, at 320/360/412 px and at 360 px with the system font at 130%: document overflow, touch targets under 44 px, HTML text under 12 px, **SVG text under 12 REAL px**, content hidden behind an inner `overflow-x-auto`, and chart labels with no gap from their bar. It needs Playwright, which is deliberately not an app dependency; the script says so and exits cleanly if it is missing. Every one of those six checks exists because that exact defect shipped here at least once.

**Charts must draw at their real width.** A `viewBox` with `w-full` scales its text down — that is check 4, and it is the one no code review can perform, because the number in the source (`13`) is correct and the factor it gets multiplied by is nowhere in the file. Use `useAnchoDeCaja` and build the `viewBox` from the measured width, then re-lay-out below `ANGOSTO` (420 px) by moving labels onto their own line. Do not widen a gutter to fit a label: area and category names are edited by admins from the Catalogs screen, so any fixed width is a bet that eventually loses — that is exactly how «Acompañamiento» ended up on top of its own bar.

**Known and unfixed: the app breaks at 200% system font.** Reports overflow, the login heading escapes its box, chart labels collide — because chart labels are positioned with hardcoded pixel offsets (18, 20, 42) while text grows with the system setting. The test pins 130%, the everyday "large text" setting, which passes whole. Raising that number is a project (moving chart layout to relative units), not a tweak.

**The harness cannot see the login screen.** `harnessMovil.jsx` stubs Supabase and starts already signed in, so `Login.jsx` and `UpdatePassword.jsx` — the two screens with no session, and the only ones *every* user touches — were never in any measurement. They were found at 42 px by reading the deployed site. Measure those two against `npm run build` output, not the harness. And build with `VITE_DEMO_MODE` unset when you do: the demo flag hides the sign-up links, so a production check cannot see them (that is how the two 20 px links there survived).

**Raising touch targets makes things taller; check what got pushed off screen.** Taking the six report filters to 44 px made the filter bar consume the whole 640 px viewport, so "Reportes" opened on controls and no data. `BarraFiltros` now collapses below 640 px, and defaults to open when `hayFiltrosActivos` is true so a shared filtered link still explains itself. Any control block that grows on mobile needs the same second measurement.
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

- Expected variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (or legacy `VITE_SUPABASE_ANON_KEY`), `VITE_DEMO_MODE`
- All of them are read in `src/supabaseClient.js` and `src/config.js` — nowhere else. **When renaming an env var, run `grep -rn "import.meta.env" src/` before declaring it done**; a second module-level reader is how this app once shipped a blank screen.
- `VITE_*` values are baked in **at build time**. Changing one in Cloudflare requires a rebuild, not a redeploy.
- Never use `service_role`, an `sb_secret_…` key or a Postgres connection string as a `VITE_*` variable: they land in the public bundle and bypass RLS entirely.
- Enable Realtime for the `tareas` table in Supabase Dashboard (`Database → Replication`)
- Never hardcode credentials in source files

## Run and build commands

```bash
npm install
npm run dev
npm run build
npm run preview

npm test              # Vitest — must stay green
npm run lint          # ESLint — 0 errors; 3 known warnings are tracked, not new ones
npm run format        # Prettier
```

## Coding guidance for AI agents

- Use ES modules and React functional components with hooks.
- Preserve the existing Tailwind CSS utility-based styling — no CSS modules or styled-components.
- Role guards must be kept in sync between Supabase RLS and `App.jsx`. Adding a new view requires both a role check in `App.jsx` and, if applicable, RLS policies.
- State-based navigation is intentional. New views: add a `currentView` value in `App.jsx`, a role guard, and a nav item in `Navbar.jsx`.
- Supabase access lives directly in components; import the client from `src/supabaseClient.js` — **never** `createClient` from `@supabase/supabase-js` (ESLint blocks it).
- Business logic that can be quietly wrong — averages, time windows, ordering, serialization — goes in `src/lib/` as pure functions with a `.test.js` beside it, not inline in a component. Components render; `lib/` decides.
- Use helpers from `src/utils/validation.js` for form and file validation — do not inline logic.
- Schema changes go in `supabase/migrations/` as individual `.sql` files, and the README's ordered list is updated in the same commit — `supabase/tests/00_espejo.sql` executes that order, so a file missing from it is a file nobody tests.
- Storage bucket changes (policies, new buckets) also go in `supabase/migrations/`.
- **A change to a policy or trigger ships with its case in `supabase/tests/01_reglas_asignado.sql`** — and, when the change is a new restriction, with the normal-use case it could break. A security rule that gets in the way of daily work gets switched off, and then it protects nothing.
- Adding an external host (a CDN, a font, an API) means adding it to the CSP in `build/cabeceras.js` in the same commit — otherwise it is blocked at runtime and only in production. Never add `unsafe-inline` to `script-src`; hash the script instead, the way the `index.html` one is handled.
- Editing `index.html`'s inline script is fine — the hash is recomputed on every build. Removing it is not, without updating `build/cabeceras.js`.
- Do not put free-text user input into the URL. `src/lib/enlaceReporte.js` deliberately omits the search field: catalog values are bounded, free text is not, and a URL outlives the reason it was shared.
- When adding realtime subscriptions, always return a cleanup function: `return () => supabase.removeChannel(channel)`.
- Never name a function `fetch` inside a component — it shadows the browser global. Use descriptive names like `fetchItems`, `fetchTasks`.

## Security & resilience guidance

- Trust Supabase RLS as the authoritative security boundary.
- The `"Asignado update own task"` policy requires both `USING` and `WITH CHECK` — never remove the `WITH CHECK` or it allows self-reassignment.
- The `trg_restrict_asignado_update` trigger locks Asignado to only `estado`/`evidencia_url` — if adding new updatable columns for Asignado, update the trigger's exclusion list.
- Client-side role checks in `App.jsx` and `KanbanBoard.jsx` are defense-in-depth only.
- Validate user input using `src/utils/validation.js` helpers before sending to Supabase.
- Handle Supabase errors explicitly and surface them to the user — never silently swallow errors. `fetchProfile`, `loadOptions`, and all async handlers must show user-facing messages on failure.
- **Never render `error.message` directly.** Always `setError(mensajeDeError(error, '<what failed, in this screen's words>'))` from `src/lib/errores.js`. A raw Postgres or Supabase error names the table, column or policy that rejected the write, and the app is on a public URL with shared demo accounts. On the login screen use `mensajeDeLogin`, which is deliberately mute about account state even for errors it does not recognize.
- Adding a new user-facing message means adding it to `errores.js`, not inlining it — the allowlist only works if it is the single gate.
- Auth initialization uses `onAuthStateChange` only (no `getSession` — it fires `INITIAL_SESSION` synchronously and avoids a concurrent double-fetch race).
- For admin operations that call `supabase.auth.signUp`, use a transient client with `persistSession: false` to avoid overwriting the current admin session.
- Keep credentials in `.env` and out of source code.

## Notes for future agents

- **A test suite exists**: Vitest, currently 190 tests, plus 48 cases in the SQL suite across `src/lib/*.test.js` and `src/utils/validation.test.js`, plus the SQL suite in `supabase/tests/`. Run `npm test` before proposing a change; add cases for any logic you touch. There is no component-rendering suite — React Testing Library would be the next addition.
- Three ESLint warnings are known and deliberate for now (`useEffect` deps in `CatalogManagement.jsx` and `KanbanBoard.jsx`, unused `userProfile` in `Reports.jsx`). Do not add new ones; treat any fourth warning as a regression.
- Prettier has not been run across the whole repo yet. When it is, it goes in its own commit so it never hides a real change in the diff.
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
- Sugiere pruebas unitarias con Vitest al proponer cambios en lógica de negocio. El proyecto ya tiene suite: corre `npm test` antes de dar un cambio por terminado.
- La lógica que se puede equivocar en silencio va en `src/lib/` como funciones puras con su `.test.js` al lado, no dentro de un componente.
- Al renombrar una variable de entorno, corre `grep -rn "import.meta.env" src/` antes de darla por migrada.
