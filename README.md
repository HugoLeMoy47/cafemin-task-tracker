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
| 📋 **Tablero Kanban** | Vista drag-and-drop para el rol Asignado (Pendiente → En curso → Hecho) |
| 📝 **Lista de tareas** | Vista filtrada con paginación y actualización en tiempo real (Admin/Gestor) |
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
| **Administrador** | Acceso completo: tareas, usuarios, catálogos y reportes. Crea usuarios con cualquier rol. |
| **Gestor** | Crea y edita tareas, ve reportes. No administra usuarios ni catálogos. |
| **Asignado** | Ve sus propias tareas en un tablero Kanban. Cambia el estado arrastrando tarjetas. |

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
│   ├── KanbanBoard.jsx        # Tablero drag-and-drop (rol Asignado, usa @dnd-kit)
│   ├── TaskList.jsx           # Lista con filtros, paginación y realtime (Admin/Gestor)
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
    └── storage_evidencias_policies.sql    # Políticas RLS del bucket de evidencias
```

### ⚙️ Comandos

```bash
npm run dev      # Servidor de desarrollo en localhost:5173
npm run build    # Build de producción en /dist
npm run preview  # Vista previa del build de producción
```

### 🔒 Seguridad

- **RLS en todas las tablas**: los permisos se aplican en la base de datos (Supabase RLS), no solo en el cliente.
- **Guards de rol en cliente**: `App.jsx` también verifica el rol antes de renderizar cada vista, como capa adicional de defensa.
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
| 📋 **Kanban board** | Drag-and-drop view for Assigned users (Pending → In progress → Done) |
| 📝 **Task list** | Filtered list with pagination and real-time updates (Admin/Manager) |
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
| **Administrador** | Full access: tasks, users, catalogs, and reports. Creates users with any role. |
| **Gestor** | Creates and edits tasks, views reports. Cannot manage users or catalogs. |
| **Asignado** | Views their own tasks on a Kanban board. Changes status by dragging cards. |

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
│   ├── KanbanBoard.jsx        # Drag-and-drop board (Asignado role, uses @dnd-kit)
│   ├── TaskList.jsx           # List with filters, pagination and realtime (Admin/Gestor)
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
    └── storage_evidencias_policies.sql    # RLS policies for the evidence bucket
```

### ⚙️ Commands

```bash
npm run dev      # Development server at localhost:5173
npm run build    # Production build in /dist
npm run preview  # Preview the production build
```

### 🔒 Security

- **RLS on all tables**: permissions are enforced at the database level (Supabase RLS), not just the client.
- **Client-side role guards**: `App.jsx` also checks the role before rendering each view as an additional defense layer.
- **Storage bucket with RLS**: the `evidencias` bucket has explicit INSERT, SELECT and DELETE policies.
- **Credentials in `.env`**: never committed to the repository.
- **User creation without session replacement**: the user creation feature uses a Supabase client with `persistSession: false` so the Admin's active session is not overwritten.
