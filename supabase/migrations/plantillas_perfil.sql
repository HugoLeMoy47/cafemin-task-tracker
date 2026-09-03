-- ============================================================================
-- Migración 11: Plantillas de Perfiles de Voluntariado y Tareas Rutinarias
-- Routine Task Templates & Volunteer Role Profiles
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requisitos previos: Todas las migraciones 1 a 10
--
-- ----------------------------------------------------------------------------
-- PROPÓSITO:
-- Permite a la Subdirección, Administradores y Gestores crear perfiles
-- operativos (ej. "Asistente de Cocina", "Clasificación de Ropero") con un
-- conjunto de tareas predefinidas para asignarlas en bloque a los voluntarios
-- al inicio de su turno en lugar de capturarlas una por una.
-- ============================================================================

-- 1. Tabla de Perfiles / Plantillas
create table if not exists plantillas_perfil (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  area_trabajo_id uuid references areas_trabajo(id) on delete set null,
  categoria_id uuid references categorias(id) on delete set null,
  activo boolean not null default true,
  creado_por uuid references usuarios(id) on delete set null,
  created_at timestamptz default now()
);

-- 2. Tareas de cada Perfil / Plantilla
create table if not exists plantilla_tareas (
  id uuid primary key default gen_random_uuid(),
  plantilla_id uuid not null references plantillas_perfil(id) on delete cascade,
  nombre text not null,
  detalles text,
  orden int not null default 0,
  foto_requerida boolean not null default false,
  area_trabajo_id uuid references areas_trabajo(id) on delete set null,
  categoria_id uuid references categorias(id) on delete set null,
  created_at timestamptz default now()
);

-- Índices para búsqueda eficiente
create index if not exists idx_plantilla_tareas_plantilla_id on plantilla_tareas(plantilla_id);
create index if not exists idx_plantillas_perfil_activo on plantillas_perfil(activo);

-- 3. Habilitar RLS
alter table plantillas_perfil enable row level security;
alter table plantilla_tareas enable row level security;

-- 4. Políticas RLS para plantillas_perfil (Admin y Gestor)
create policy "Admin y Gestor read plantillas_perfil"
  on plantillas_perfil for select
  using (get_my_role() in ('Administrador', 'Gestor'));

create policy "Admin y Gestor insert plantillas_perfil"
  on plantillas_perfil for insert
  with check (get_my_role() in ('Administrador', 'Gestor'));

create policy "Admin y Gestor update plantillas_perfil"
  on plantillas_perfil for update
  using (get_my_role() in ('Administrador', 'Gestor'))
  with check (get_my_role() in ('Administrador', 'Gestor'));

create policy "Admin y Gestor delete plantillas_perfil"
  on plantillas_perfil for delete
  using (get_my_role() in ('Administrador', 'Gestor'));

-- 5. Políticas RLS para plantilla_tareas (Admin y Gestor)
create policy "Admin y Gestor read plantilla_tareas"
  on plantilla_tareas for select
  using (get_my_role() in ('Administrador', 'Gestor'));

create policy "Admin y Gestor insert plantilla_tareas"
  on plantilla_tareas for insert
  with check (get_my_role() in ('Administrador', 'Gestor'));

create policy "Admin y Gestor update plantilla_tareas"
  on plantilla_tareas for update
  using (get_my_role() in ('Administrador', 'Gestor'))
  with check (get_my_role() in ('Administrador', 'Gestor'));

create policy "Admin y Gestor delete plantilla_tareas"
  on plantilla_tareas for delete
  using (get_my_role() in ('Administrador', 'Gestor'));

-- Permisos sobre las tablas a usuarios autenticados (restringidos por RLS)
grant select, insert, update, delete on plantillas_perfil to authenticated;
grant select, insert, update, delete on plantilla_tareas to authenticated;
