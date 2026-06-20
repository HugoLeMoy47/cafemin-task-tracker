# CAFEMIN Task Tracker

SPA de gestión de tareas construida con React, Vite, Tailwind CSS y Supabase. Diseñada para registrar tareas, asignarlas por rol, requerir evidencia fotográfica y generar reportes.

## Stack

- **Frontend:** React 18 + Vite 5
- **Estilos:** Tailwind CSS 3
- **Backend/Auth/Storage:** Supabase

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Configurar Supabase

En el SQL Editor del dashboard de Supabase, ejecuta en orden:

1. **Schema inicial** — `supabase/schema.sql`
2. **Migración fecha límite** — `supabase/migrations/add_fecha_limite.sql`

Después de ejecutar el schema, regístrate con tu correo de administrador y ejecuta:

```sql
UPDATE usuarios SET rol = 'Administrador' WHERE correo = 'TU_CORREO@AQUI.COM';
```

Para que la suscripción en tiempo real funcione, habilita **Realtime** en la tabla `tareas` desde el dashboard de Supabase (`Database → Replication → tareas`).

### 4. Iniciar en desarrollo

```bash
npm run dev
```

## Sistema de roles

| Rol | Acceso |
|-----|--------|
| **Administrador** | Todo: tareas, usuarios, catálogos, reportes |
| **Gestor** | Crear/editar tareas, ver reportes |
| **Asignado** | Ver y cambiar estado de sus propias tareas |

Los nuevos usuarios quedan en estado `Asignado` hasta que el Administrador les cambie el rol desde la vista de Usuarios.

## Funcionalidades

- **Autenticación** — registro y login con correo/contraseña via Supabase Auth
- **Tareas** — crear, editar, eliminar, asignar, cambiar estado (Pendiente → En curso → Hecho)
- **Fecha límite** — campo opcional; las tareas vencidas se marcan en rojo
- **Evidencia fotográfica** — si `foto_requerida = true`, el usuario debe subir una imagen antes de marcar la tarea como Hecha (almacenada en Supabase Storage, bucket `evidencias`)
- **Tiempo real** — la lista de tareas se actualiza automáticamente cuando otro usuario realiza cambios
- **Paginación** — se muestran 20 tareas por carga; botón "Cargar más" para el resto
- **Reportes** — agrupados por estado, por asignado y por fecha (solo Admin/Gestor)
- **Gestión de usuarios** — el Admin puede cambiar roles o eliminar perfiles
- **Catálogos** — el Admin puede crear, editar y eliminar categorías y áreas de trabajo

## Estructura del proyecto

```
src/
├── App.jsx                  # Shell principal y navegación por estado
├── supabaseClient.js        # Cliente Supabase centralizado
├── index.css                # Estilos globales (Tailwind)
├── main.jsx                 # Bootstrap de React
├── components/
│   ├── Login.jsx            # Formulario de login y registro
│   ├── Navbar.jsx           # Barra de navegación con control por rol
│   ├── TaskList.jsx         # Lista de tareas con filtros, paginación y realtime
│   ├── TaskCard.jsx         # Tarjeta de tarea con acciones y alerta de vencimiento
│   ├── TaskForm.jsx         # Formulario de creación/edición de tareas
│   ├── UserManagement.jsx   # Gestión de usuarios (solo Admin)
│   ├── CatalogManagement.jsx # CRUD de categorías y áreas (solo Admin)
│   └── Reports.jsx          # Reportes por estado, asignado y fecha (Admin/Gestor)
└── utils/
    └── validation.js        # Helpers de validación de formularios e imágenes
supabase/
├── schema.sql               # Schema completo: tablas, triggers, RLS
└── migrations/
    └── add_fecha_limite.sql # Columna fecha_limite en tareas
```

## Comandos

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Vista previa del build
```

## Seguridad

- Row Level Security (RLS) habilitada en todas las tablas: los permisos se aplican en la base de datos, no solo en el cliente
- Los guards de rol en `App.jsx` evitan que se rendericen vistas no autorizadas aunque el usuario manipule el estado del navegador
- Las credenciales de Supabase van en `.env` y no deben commitearse

## Notas

No existe suite de tests. Se recomienda agregar Vitest + React Testing Library para cubrir componentes y los helpers de `src/utils/validation.js`.
