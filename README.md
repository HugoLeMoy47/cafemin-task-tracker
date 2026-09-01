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
npm run dev           # Servidor de desarrollo en localhost:5173
npm run build         # Build de producción en /dist
npm run preview       # Vista previa del build de producción

npm test              # Pruebas unitarias (Vitest)
npm run test:watch    # Pruebas en modo observador
npm run lint          # ESLint
npm run lint:fix      # ESLint con correcciones automáticas
npm run format        # Formatea con Prettier
npm run format:check  # Verifica formato sin escribir
```

### 🔒 Seguridad

- **RLS en todas las tablas**: los permisos se aplican en la base de datos (Supabase RLS), no solo en el cliente.
- **WITH CHECK en políticas UPDATE**: la política de Asignado tiene cláusula `WITH CHECK` para impedir auto-reasignación de tareas.
- **Trigger de columnas**: el trigger `trg_restrict_asignado_update` restringe al Asignado a solo modificar `estado` y `evidencia_url`, bloqueando cambios a cualquier otro campo a nivel DB.
- **Guards de rol en cliente**: `App.jsx` y `KanbanBoard.jsx` verifican el rol antes de permitir acciones, como capa adicional de defensa.
- **Bucket de Storage con políticas explícitas**: el bucket `evidencias` define políticas de INSERT, SELECT y DELETE.
  > ⚠️ **Pendiente antes de exponer la app en internet.** La política de SELECT concede lectura al rol `public` y el bucket está marcado como público, porque el cliente usa `getPublicUrl()`. Las fotos de evidencia son legibles por cualquiera que conozca su URL, sin sesión. Para un despliegue público hay que pasar el bucket a privado, guardar la ruta en lugar de la URL y migrar a `createSignedUrl()`.
- **Credenciales en `.env`**: nunca se commitean al repositorio.
- **Creación de usuarios sin reemplazar sesión**: la función de alta de usuarios usa un cliente Supabase con `persistSession: false` para que el Admin no pierda su sesión activa.

---

### 🌐 Despliegue (Cloudflare Workers · static assets)

La demostración pública vive en `https://cafemintt.freejolitos.consulting` como proyecto independiente de Cloudflare Workers con dominio personalizado. No hay código de Worker: solo se sirven los archivos estáticos que Vite construye en `dist/`. Al servirse desde la raíz del subdominio **no se requiere `base` en `vite.config.js`**.

**`wrangler.jsonc` es obligatorio.** Sin él, `wrangler deploy` intenta autodetectar el framework y falla con:

```
✘ [ERROR] The version of Vite used in the project ("5.4.21") cannot be
  automatically configured. Please update the Vite version to at least "6.0.0"
```

Ese camino automático usa el plugin de Cloudflare para Vite, que exige Vite ≥ 6. La presencia de `wrangler.jsonc` desactiva la autodetección y deja el despliegue como una simple subida de archivos, compatible con Vite 5.

**Configuración del proyecto en Cloudflare**

| Ajuste | Valor |
|--------|-------|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node version | 20 o superior |

El directorio de salida lo define `assets.directory` en `wrangler.jsonc`, no la interfaz de Cloudflare.

**Variables de entorno del build**

| Variable | Valor en la demo |
|----------|------------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública (`sb_publishable_…`) |
| `VITE_DEMO_MODE` | `true` |

La clave pública admite dos nombres: `VITE_SUPABASE_PUBLISHABLE_KEY` (clave nueva) o `VITE_SUPABASE_ANON_KEY` (clave heredada, JWT `eyJ…`). Si están las dos, gana la primera. Ambas tienen privilegios bajos y quedan sujetas a RLS.

> ⚠️ **Nunca** uses aquí `service_role`, `sb_secret_…` ni una cadena de conexión a Postgres. Vite hornea estas variables en el bundle público: quien abra las herramientas de desarrollo las leería, y esas credenciales saltan RLS por completo.

`VITE_DEMO_MODE=true` muestra el aviso de ambiente de demostración y oculta el formulario de registro. Se resuelve **al construir**: cambiarla exige un nuevo despliegue.

**En Supabase, antes de publicar**

1. Authentication → Providers → apagar *Allow new users to sign up*.
2. Authentication → URL Configuration → *Site URL* y *Redirect URLs* apuntando a `https://cafemintt.freejolitos.consulting`.
3. Crear las cuentas de demostración, una por rol, y sembrar datos ficticios.

### 🔑 Restablecimiento de contraseña

Con el registro público apagado, el alta la hace el Administrador — pero quien olvida su contraseña necesita recuperarla por su cuenta. El flujo está implementado:

1. En el login, *¿Olvidaste tu contraseña?* pide el correo y llama a `resetPasswordForEmail` con `redirectTo` al origen del sitio.
2. Supabase envía un enlace. Al seguirlo, la persona llega con una sesión temporal.
3. `index.html` marca la llegada (`window.__cafeminRecuperacion`) **antes** de que cargue el bundle, porque el cliente de Supabase consume y limpia el fragmento de la URL al inicializarse. `App.jsx` intercepta y muestra `UpdatePassword.jsx` en vez de la aplicación: sin esa guarda, quien sigue el enlace entraría sin haber cambiado nada.
4. Al guardar, se cierra la sesión para forzar un inicio con la contraseña nueva.

El mensaje de confirmación es el mismo exista o no la cuenta, para no convertir la pantalla en un detector de correos registrados.

**Longitud mínima de contraseña: 8 caracteres.** El valor vive en una sola constante, `MIN_PASSWORD_LENGTH` en `src/utils/validation.js`, de donde salen la validación, los `minLength` y los textos de ayuda.

> ⚠️ **La validación del cliente no es un control de seguridad.** Corre en el navegador y se puede saltar llamando a la API directamente. El límite que de verdad manda se configura en **Supabase → Authentication → Providers → Email → Minimum password length**, y hay que dejarlo en 8 para que coincida. La documentación de Supabase advierte que menos de 8 no es recomendable.
>
> Ahí mismo se pueden exigir clases de caracteres (dígitos, mayúsculas, símbolos). No se activaron: si se activan en Supabase sin reflejarlo en el cliente, el usuario recibe un rechazo del servidor que la interfaz no supo anticipar.
>
> En plan Pro, Supabase además puede rechazar contraseñas filtradas consultando HaveIBeenPwned. Vale la pena si el proyecto sube de plan.

> ⚠️ **Requiere SMTP propio.** El servicio de correo por defecto de Supabase solo entrega a direcciones del equipo del proyecto y permite ~2 mensajes por hora; el resto recibe *Email address not authorized*. La documentación de Supabase indica que no es para producción. **Sin SMTP configurado en Authentication → Emails → SMTP Settings, esta pantalla existe pero los correos no llegan al personal.**

> El `redirectTo` usa `window.location.origin`, así que la URL del despliegue debe estar en *Redirect URLs*.

`public/_headers` aplica `X-Robots-Tag: noindex`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y cacheo permanente para los assets con hash en el nombre.

> El plan gratuito de Supabase pausa proyectos con baja actividad durante 7 días. Si la demo estará dormida entre presentaciones, verifica que el proyecto siga arriba antes de compartir la URL.

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
npm run dev           # Development server at localhost:5173
npm run build         # Production build in /dist
npm run preview       # Preview the production build

npm test              # Unit tests (Vitest)
npm run test:watch    # Tests in watch mode
npm run lint          # ESLint
npm run lint:fix      # ESLint with autofix
npm run format        # Format with Prettier
npm run format:check  # Check formatting without writing
```

### 🔒 Security

- **RLS on all tables**: permissions are enforced at the database level (Supabase RLS), not just the client.
- **WITH CHECK on UPDATE policies**: the Asignado policy includes a `WITH CHECK` clause to prevent self-reassignment of tasks.
- **Column-lock trigger**: `trg_restrict_asignado_update` ensures Asignado can only modify `estado` and `evidencia_url` at the DB level, blocking all other field changes.
- **Client-side role guards**: `App.jsx` and `KanbanBoard.jsx` verify the role before allowing actions, as an additional defense-in-depth layer.
- **Storage bucket with explicit policies**: the `evidencias` bucket defines INSERT, SELECT and DELETE policies.
  > ⚠️ **Outstanding before exposing the app on the internet.** The SELECT policy grants read access to the `public` role and the bucket is marked public, because the client uses `getPublicUrl()`. Evidence photos are readable by anyone who knows the URL, with no session. A public deployment requires making the bucket private, storing the path instead of the URL, and migrating to `createSignedUrl()`.
- **Credentials in `.env`**: never committed to the repository.
- **User creation without session replacement**: the user creation feature uses a Supabase client with `persistSession: false` so the Admin's active session is not overwritten.

---

### 🌐 Deployment (Cloudflare Workers · static assets)

The public demo lives at `https://cafemintt.freejolitos.consulting` as a standalone Cloudflare Workers project with a custom domain. There is no Worker code — it only serves the static files Vite builds into `dist/`. Because it is served from the subdomain root, **no `base` is needed in `vite.config.js`**.

**`wrangler.jsonc` is required.** Without it, `wrangler deploy` attempts framework auto-detection, which uses the Cloudflare Vite plugin and fails on Vite 5 (`Please update the Vite version to at least "6.0.0"`). The config file disables auto-detection and reduces the deploy to a plain asset upload.

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node version | 20 or higher |

The output directory is set by `assets.directory` in `wrangler.jsonc`, not in the Cloudflare UI.

Build environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (or the legacy `VITE_SUPABASE_ANON_KEY`) and `VITE_DEMO_MODE=true`. **Never** use `service_role`, `sb_secret_…` or a Postgres connection string — these variables are baked into the public bundle and those credentials bypass RLS entirely. The demo flag shows the demo-environment notice and hides the sign-up form; it is resolved **at build time**, so changing it requires a new deployment.

Before publishing, in Supabase: turn off *Allow new users to sign up*, set *Site URL* and *Redirect URLs* to the deployment URL, and create the demo accounts.

### 🔑 Password reset

Public sign-up is off, so accounts are created by an Administrator — but users still need to recover forgotten passwords. The flow is implemented: *Forgot your password?* on the login screen calls `resetPasswordForEmail`; `index.html` flags the recovery arrival before the bundle loads (the Supabase client consumes and clears the URL fragment on init), and `App.jsx` intercepts to render `UpdatePassword.jsx` instead of the app. The confirmation message is identical whether or not the account exists, to avoid user enumeration.

**Minimum password length: 8 characters**, defined once as `MIN_PASSWORD_LENGTH` in `src/utils/validation.js`. Client-side validation is a convenience, not a security control — set the same minimum under Supabase → Authentication → Providers → Email → Minimum password length, which is where it is actually enforced.

> ⚠️ **Requires custom SMTP.** Supabase's built-in email service only delivers to project team addresses and allows about 2 messages per hour; everyone else gets *Email address not authorized*. Without SMTP configured under Authentication → Emails, the screen exists but no mail reaches staff.

> Supabase pauses free-plan projects after 7 days of low activity. Check the project is awake before sharing the URL.

