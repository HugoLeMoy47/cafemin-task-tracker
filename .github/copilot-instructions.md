# Copilot Instructions

This repository is a Vite + React SPA using Supabase for auth, database, and file storage.

## Stack
- React 18 + Vite 5, Tailwind CSS 3
- Supabase (Auth, Postgres with RLS, Storage)
- `@dnd-kit/core` + `@dnd-kit/utilities` for Kanban drag-and-drop
- No router — navigation is state-based via `currentView` in `App.jsx`
- No global state manager — component-local state with Supabase Realtime subscriptions

## Commands
```bash
npm install
npm run dev
npm run build
npm run preview
```

## Key conventions

**Credentials & environment**
- Keep Supabase credentials in `.env` only. Never commit them.
- Import the Supabase client exclusively from `src/supabaseClient.js`.

**Schema & migrations**
- New columns → create a `.sql` file in `supabase/migrations/`.
- New Storage bucket policies → also go in `supabase/migrations/`.

**Role guards**
- Role-based access is enforced at two levels: Supabase RLS (authoritative) and `App.jsx` render conditions.
- Adding a new view requires: a `currentView` value, a role guard in `App.jsx`, and a nav entry in `Navbar.jsx`.

**Components & styling**
- All feature components live in `src/components/`. Use Tailwind utilities only — no CSS modules or styled-components.
- Use helpers from `src/utils/validation.js` for forms and file uploads. Do not inline validation logic.

**Realtime**
- Supabase Realtime channels must be cleaned up on unmount: `return () => supabase.removeChannel(channel)`.
- See `TaskList.jsx` and `KanbanBoard.jsx` for the established pattern.

**Kanban board**
- `KanbanBoard.jsx` uses `@dnd-kit/core`. Keep draggable/droppable logic inside this file.
- Applies optimistic state updates on drag-end; Realtime then confirms the persisted state.
- Photo evidence modal blocks the drop into "Hecho" if `foto_requerida = true` and no photo is uploaded yet.

**User creation (Admin)**
- `UserManagement.jsx` uses a second Supabase client with `persistSession: false` to call `signUp` without overwriting the Admin's active session. Do not change this pattern.

**Naming**
- Never name a function `fetch` inside a component — it shadows the browser global. Use `fetchItems`, `fetchTasks`, etc.

**Error handling**
- Handle all Supabase errors explicitly and surface them to the user. Never silently ignore them.

**Documentation**
- Document technical decisions in both Spanish and English when adding comments or docs.
