# Graph Report - .  (2026-07-09)

## Corpus Check
- Corpus is ~11,713 words - fits in a single context window. You may not need a graph.

## Summary
- 112 nodes · 153 edges · 14 communities (12 shown, 2 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.9)
- Token cost: 55,226 input · 0 output

## Community Hubs (Navigation)
- Core App & UI Shell
- Roles & Security Model
- Package Dependencies
- Feature Documentation
- User Management & Validation
- Task List & Cards
- Kanban Board
- Dev Dependencies & Build
- Dark Mode
- Realtime Updates
- Fetch Naming Convention

## God Nodes (most connected - your core abstractions)
1. `supabase` - 11 edges
2. `CAFEMIN Task Tracker (Project)` - 6 edges
3. `Kanban Board (Drag-and-Drop, All Roles)` - 6 edges
4. `Three-Role System (Administrador/Gestor/Asignado)` - 5 edges
5. `Asignado Role` - 5 edges
6. `Security Model (RLS, WITH CHECK, Column Trigger)` - 5 edges
7. `scripts` - 4 edges
8. `validateImageFile()` - 4 edges
9. `Three-Level Role Guards (RLS + DB Trigger + Client)` - 4 edges
10. `trg_restrict_asignado_update Trigger` - 4 edges

## Surprising Connections (you probably didn't know these)
- `CAFEMIN Task Tracker README` --semantically_similar_to--> `CAFEMIN Task Tracker (Project)`  [INFERRED] [semantically similar]
  README.md → AGENTS.md
- `Roles Feature (Administrador/Gestor/Asignado)` --semantically_similar_to--> `Three-Role System (Administrador/Gestor/Asignado)`  [INFERRED] [semantically similar]
  README.md → AGENTS.md
- `Kanban Board Feature (Pendiente/En curso/Hecho)` --semantically_similar_to--> `Kanban Board (Drag-and-Drop, All Roles)`  [INFERRED] [semantically similar]
  README.md → AGENTS.md
- `State-Based Navigation (currentView)` --semantically_similar_to--> `State-Based View Routing (No React Router)`  [INFERRED] [semantically similar]
  .github/copilot-instructions.md → AGENTS.md
- `Two-Level Role Guard Convention (RLS + App.jsx)` --semantically_similar_to--> `Three-Level Role Guards (RLS + DB Trigger + Client)`  [INFERRED] [semantically similar]
  .github/copilot-instructions.md → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Role-Based Access Control Stack** — agents_role_system, agents_three_level_role_guards, agents_asignado_update_own_task_policy, agents_trg_restrict_asignado_update, agents_get_my_role_function, readme_security_model [EXTRACTED 1.00]
- **Dark Mode Persistence and Anti-Flash Flow** — agents_dark_mode_strategy, agents_anti_flash_script, index_anti_flash_dark_mode_script, readme_dark_mode_feature [EXTRACTED 1.00]
- **Photo Evidence Completion Flow** — agents_photo_evidence_gate, agents_kanban_board, agents_evidencias_bucket, readme_photo_evidence_feature [EXTRACTED 1.00]

## Communities (14 total, 2 thin omitted)

### Community 0 - "Core App & UI Shell"
Cohesion: 0.19
Nodes (11): App(), CatalogManagement(), Login(), Navbar(), ROL_BADGE, ESTADO_STYLE, formatDate(), Reports() (+3 more)

### Community 1 - "Roles & Security Model"
Cohesion: 0.13
Nodes (19): SQL Migrations Convention, Two-Level Role Guard Convention (RLS + App.jsx), Transient Supabase Client for Admin signUp, Administrador Role, Asignado Role, Asignado Update Own Task RLS Policy, evidencias Storage Bucket, Forward-Only Status Transitions for Asignado (+11 more)

### Community 2 - "Package Dependencies"
Cohesion: 0.13
Nodes (14): dependencies, @dnd-kit/core, @dnd-kit/utilities, react, react-dom, @supabase/supabase-js, name, private (+6 more)

### Community 3 - "Feature Documentation"
Cohesion: 0.18
Nodes (12): Photo Evidence Gate on Hecho Drop, State-Based Navigation (currentView), Vite + React + Supabase Tech Stack, Auth Init via onAuthStateChange Only, CAFEMIN Task Tracker (Project), Kanban Board (Drag-and-Drop, All Roles), Photo Evidence Gate (PhotoModal before Hecho), State-Based View Routing (No React Router) (+4 more)

### Community 4 - "User Management & Validation"
Cohesion: 0.25
Nodes (9): EMPTY_FORM, ROL_STYLE, ROLES, transientClient, UserManagement(), normalizeText(), validateEmail(), validatePassword() (+1 more)

### Community 5 - "Task List & Cards"
Cohesion: 0.24
Nodes (7): ESTADO_STYLE, formatDate(), NEXT_STATUS, PREV_STATUS, TaskCard(), ESTADO_COUNT_STYLE, ESTADOS

### Community 6 - "Kanban Board"
Cohesion: 0.28
Nodes (6): CardContent(), COLUMNS, formatDate(), KanbanBoard(), PhotoModal(), validateImageFile()

### Community 7 - "Dev Dependencies & Build"
Cohesion: 0.33
Nodes (6): devDependencies, autoprefixer, postcss, tailwindcss, vite, @vitejs/plugin-react

### Community 8 - "Dark Mode"
Cohesion: 0.67
Nodes (4): Anti-Flash Dark Mode Script, Dark Mode Strategy (Tailwind class + localStorage), Inline Anti-Flash Dark Mode Script, Dark Mode Feature

## Knowledge Gaps
- **39 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+34 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase` connect `Core App & UI Shell` to `User Management & Validation`, `Task List & Cards`, `Kanban Board`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `CAFEMIN Task Tracker (Project)` connect `Feature Documentation` to `Roles & Security Model`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `Kanban Board (Drag-and-Drop, All Roles)` connect `Feature Documentation` to `Roles & Security Model`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `CAFEMIN Task Tracker (Project)` (e.g. with `Vite + React + Supabase Tech Stack` and `CAFEMIN Task Tracker README`) actually correct?**
  _`CAFEMIN Task Tracker (Project)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Kanban Board (Drag-and-Drop, All Roles)` (e.g. with `trg_fecha_hecho Trigger` and `Kanban Board Feature (Pendiente/En curso/Hecho)`) actually correct?**
  _`Kanban Board (Drag-and-Drop, All Roles)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _46 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Roles & Security Model` be split into smaller, more focused modules?**
  _Cohesion score 0.1286549707602339 - nodes in this community are weakly interconnected._