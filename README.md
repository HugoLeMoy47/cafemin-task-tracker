# CAFEMIN · Task Tracker

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase&logoColor=white)

> Aplicación web de seguimiento de tareas para equipos pequeños, con roles, evidencia fotográfica y tablero Kanban.
> Web task-tracking application for small teams, with roles, photo evidence, and a Kanban board.

---

## 🇲🇽 Español

### ¿Qué es?

CAFEMIN Task Tracker es una SPA (Single Page Application) que permite a un equipo crear, asignar y dar seguimiento a tareas operativas. Está diseñada para tres tipos de usuario con diferentes niveles de acceso, y soporta evidencia fotográfica como requisito para completar tareas.

### ✨ Funcionalidades

| Funcionalidad | Descripción |
|---------------|-------------|
| 🔐 **Autenticación** | Registro e inicio de sesión por correo/contraseña |
| 👤 **Gestión de usuarios** | El Admin crea usuarios con rol predefinido o los modifica después |
| 📋 **Tablero Kanban** | Vista drag-and-drop para todos los roles (Pendiente → En curso → Hecho) |
| 📅 **Fecha límite** | Campo opcional con alerta visual cuando la tarea está vencida |
| 📷 **Evidencia fotográfica** | Si se requiere foto, el usuario debe subirla antes de marcar la tarea como Hecha |
| 📊 **Reportes** | Agrupados por estado, por asignado o por fecha de creación |
| 🗂 **Catálogos** | CRUD de categorías y áreas de trabajo con edición inline |
| ⚡ **Tiempo real** | Los cambios de otros usuarios se reflejan automáticamente |
| 📱 **Diseño responsivo** | Interfaz optimizada para móvil y escritorio; menú hamburguesa en pantallas pequeñas |
| 🌙 **Modo oscuro** | Alterna entre tema claro y oscuro; persiste entre sesiones y respeta la preferencia del sistema |

### 🎭 Roles

| Rol | Qué puede hacer |
|-----|-----------------|
| **Administrador** | Acceso completo: tareas, usuarios, catálogos y reportes. En el Kanban: crea, edita, elimina y reabre tareas. Ve todas las tareas. |
| **Gestor** | Crea y edita tareas, ve reportes. En el Kanban: crea y edita tareas, puede reabrirlas. Ve todas las tareas. |
| **Asignado** | Ve sus propias tareas en el Kanban. Arrastra para cambiar estado (solo avanzar; reabrir requiere admin). |

> Los nuevos usuarios quedan con rol `Asignado` hasta que un Administrador lo cambie desde la vista de Usuarios.

---

### 🚀 Configuración inicial

**1. Instalar dependencias**

```bash
npm install
```

**2. Variables de entorno**

Copia `.env.example` a `.env` y completa los valores de tu proyecto en Supabase:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**3. Configurar Supabase**

En el **SQL Editor** de tu dashboard de Supabase, ejecuta los siguientes archivos en orden:

```
1. supabase/schema.sql
2. supabase/migrations/add_fecha_limite.sql
3. supabase/migrations/storage_evidencias_policies.sql
4. supabase/migrations/security_rls_and_stability.sql
```

Después de ejecutar el schema, regístrate en la app con tu correo de administrador y luego ejecuta este SQL para asignarte el rol:

```sql
UPDATE usuarios SET rol = 'Administrador' WHERE correo = 'TU_CORREO@AQUI.COM';
```

**4. Habilitar Realtime**

En el dashboard de Supabase: `Database → Replication → tareas` → activa la tabla para recibir actualizaciones en vivo.

**5. Iniciar en desarrollo**

```bash
npm run dev
```

---

### 🗂 Estructura del proyecto

```
src/
├── App.jsx                    # Shell principal, rutas por estado y guards de rol
├── supabaseClient.js          # Cliente Supabase (anon key)
├── main.jsx                   # Bootstrap de React
├── index.css                  # Estilos base (Tailwind)
├── components/
│   ├── Login.jsx              # Login y registro por correo/contraseña
│   ├── Navbar.jsx             # Barra de navegación con menú filtrado por rol
│   ├── KanbanBoard.jsx        # Tablero drag-and-drop para todos los roles (usa @dnd-kit)
│   ├── TaskCard.jsx           # Tarjeta de tarea con acciones, foto y alerta de vencimiento
│   ├── TaskForm.jsx           # Formulario de creación/edición de tareas
│   ├── UserManagement.jsx     # Alta y gestión de usuarios (solo Admin)
│   ├── CatalogManagement.jsx  # CRUD de catálogos con edición inline (solo Admin)
│   └── Reports.jsx            # Reportes por estado, asignado y fecha (Admin/Gestor)
└── utils/
    └── validation.js          # Helpers: validación de email, contraseña, tarea e imagen

supabase/
├── schema.sql                 # Tablas, triggers, RLS y datos iniciales
└── migrations/
    ├── add_fecha_limite.sql               # Columna fecha_limite en tareas
    ├── storage_evidencias_policies.sql    # Políticas RLS del bucket de evidencias
    └── security_rls_and_stability.sql    # WITH CHECK Asignado + trigger de columnas
```

### ⚙️ Comandos

```bash
npm run dev      # Servidor de desarrollo en localhost:5173
npm run build    # Build de producción en /dist
npm run preview  # Vista previa del build de producción
```

### 🔒 Seguridad

- **RLS en todas las tablas**: los permisos se aplican en la base de datos (Supabase RLS), no solo en el cliente.
- **WITH CHECK en políticas UPDATE**: la política de Asignado tiene cláusula `WITH CHECK` para impedir auto-reasignación de tareas.
- **Trigger de columnas**: el trigger `trg_restrict_asignado_update` restringe al Asignado a solo modificar `estado` y `evidencia_url`, bloqueando cambios a cualquier otro campo a nivel DB.
- **Guards de rol en cliente**: `App.jsx` y `KanbanBoard.jsx` verifican el rol antes de permitir acciones, como capa adicional de defensa.
- **Bucket de Storage con RLS**: el bucket `evidencias` tiene políticas explícitas de INSERT, SELECT y DELETE.
- **Credenciales en `.env`**: nunca se commitean al repositorio.
- **Creación de usuarios sin reemplazar sesión**: la función de alta de usuarios usa un cliente Supabase con `persistSession: false` para que el Admin no pierda su sesión activa.

---

## 🇺🇸 English

### What is it?

CAFEMIN Task Tracker is a Single Page Application for managing operational tasks within a small team. It supports three user roles with different permission levels, photo evidence requirements, and a real-time Kanban board.

### ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Email/password sign-up and login via Supabase Auth |
| 👤 **User management** | Admin creates users with a preset role or modifies them later |
| 📋 **Kanban board** | Drag-and-drop view for all roles (Pending → In progress → Done) |
| 📅 **Due date** | Optional field with visual overdue alert |
| 📷 **Photo evidence** | If required, the user must upload a photo before marking a task as Done |
| 📊 **Reports** | Grouped by status, by assignee, or by creation date |
| 🗂 **Catalogs** | CRUD for categories and work areas with inline editing |
| ⚡ **Real-time** | Changes from other users appear automatically |
| 📱 **Responsive design** | Mobile-first layout; hamburger menu on small screens, scrollable tables |
| 🌙 **Dark mode** | Toggle between light and dark themes; persists across sessions and respects system preference |

### 🎭 Roles

| Role | What they can do |
|------|-----------------|
| **Administrador** | Full access: tasks, users, catalogs, and reports. On the Kanban: create, edit, delete, and reopen tasks. Sees all tasks. |
| **Gestor** | Creates and edits tasks, views reports. On the Kanban: create, edit, and reopen tasks. Sees all tasks. |
| **Asignado** | Views their own tasks on the Kanban board. Can drag cards forward only; reopening requires admin. |

> New users start with the `Asignado` role until an Administrator changes it from the Users view.

---

### 🚀 Initial setup

**1. Install dependencies**

```bash
npm install
```

**2. Environment variables**

Copy `.env.example` to `.env` and fill in your Supabase project values:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**3. Configure Supabase**

In the **SQL Editor** of your Supabase dashboard, run the following files in order:

```
1. supabase/schema.sql
2. supabase/migrations/add_fecha_limite.sql
3. supabase/migrations/storage_evidencias_policies.sql
4. supabase/migrations/security_rls_and_stability.sql
```

After running the schema, sign up in the app with your admin email, then run this SQL to grant yourself the Admin role:

```sql
UPDATE usuarios SET rol = 'Administrador' WHERE correo = 'YOUR_EMAIL@HERE.COM';
```

**4. Enable Realtime**

In the Supabase dashboard: `Database → Replication → tareas` → enable the table to receive live updates.

**5. Start development**

```bash
npm run dev
```

---

### 🗂 Project structure

```
src/
├── App.jsx                    # Main shell, state-based routing and role guards
├── supabaseClient.js          # Supabase client (anon key)
├── main.jsx                   # React bootstrap
├── index.css                  # Base styles (Tailwind)
├── components/
│   ├── Login.jsx              # Email/password login and sign-up
│   ├── Navbar.jsx             # Navigation bar with role-filtered menu
│   ├── KanbanBoard.jsx        # Drag-and-drop board for all roles (uses @dnd-kit)
│   ├── TaskCard.jsx           # Task card with actions, photo upload and overdue alert
│   ├── TaskForm.jsx           # Task create/edit form
│   ├── UserManagement.jsx     # User creation and management (Admin only)
│   ├── CatalogManagement.jsx  # Catalog CRUD with inline editing (Admin only)
│   └── Reports.jsx            # Reports by status, assignee and date (Admin/Gestor)
└── utils/
    └── validation.js          # Helpers: email, password, task and image validation

supabase/
├── schema.sql                 # Tables, triggers, RLS policies and seed data
└── migrations/
    ├── add_fecha_limite.sql               # fecha_limite column in tareas
    ├── storage_evidencias_policies.sql    # RLS policies for the evidence bucket
    └── security_rls_and_stability.sql    # WITH CHECK for Asignado + column-lock trigger
```

### ⚙️ Commands

```bash
npm run dev      # Development server at localhost:5173
npm run build    # Production build in /dist
npm run preview  # Preview the production build
```

### 🔒 Security

- **RLS on all tables**: permissions are enforced at the database level (Supabase RLS), not just the client.
- **WITH CHECK on UPDATE policies**: the Asignado policy includes a `WITH CHECK` clause to prevent self-reassignment of tasks.
- **Column-lock trigger**: `trg_restrict_asignado_update` ensures Asignado can only modify `estado` and `evidencia_url` at the DB level, blocking all other field changes.
- **Client-side role guards**: `App.jsx` and `KanbanBoard.jsx` verify the role before allowing actions, as an additional defense-in-depth layer.
- **Storage bucket with RLS**: the `evidencias` bucket has explicit INSERT, SELECT and DELETE policies.
- **Credentials in `.env`**: never committed to the repository.
- **User creation without session replacement**: the user creation feature uses a Supabase client with `persistSession: false` so the Admin's active session is not overwritten.
