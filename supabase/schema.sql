-- ============================================================
-- CAFEMIN Task Tracker - Schema v1.0
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. TABLAS
-- ============================================================

create table categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz default now()
);

create table areas_trabajo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz default now()
);

create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null,
  correo text not null unique,
  rol text not null default 'Asignado' check (rol in ('Administrador', 'Gestor', 'Asignado')),
  created_at timestamptz default now()
);

create table tareas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  detalles text,
  foto_requerida boolean default false,
  evidencia_url text,
  asignado_id uuid references usuarios(id) on delete set null,
  estado text not null default 'Pendiente' check (estado in ('Pendiente', 'En curso', 'Hecho')),
  fecha_creacion timestamptz default now(),
  fecha_hecho timestamptz,
  categoria_id uuid references categorias(id) on delete set null,
  area_trabajo_id uuid references areas_trabajo(id) on delete set null,
  creado_por uuid references usuarios(id) on delete set null
);

-- 2. TRIGGER: fecha_hecho automática
-- ============================================================

create or replace function set_fecha_hecho()
returns trigger as $$
begin
  if new.estado = 'Hecho' and (old.estado is distinct from 'Hecho') then
    new.fecha_hecho = now();
  elsif new.estado != 'Hecho' then
    new.fecha_hecho = null;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_fecha_hecho
  before update on tareas
  for each row execute function set_fecha_hecho();

-- 3. TRIGGER: crear perfil al registrarse
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.usuarios (id, nombre_completo, correo, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre_completo', 'Usuario'),
    new.email,
    'Asignado'  -- rol default; el Admin lo cambia después
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 4. ROW LEVEL SECURITY
-- ============================================================

alter table categorias enable row level security;
alter table areas_trabajo enable row level security;
alter table usuarios enable row level security;
alter table tareas enable row level security;

-- Helper: obtener rol del usuario actual
create or replace function get_my_role()
returns text as $$
  select rol from usuarios where id = auth.uid()
$$ language sql security definer stable;

-- Categorías: todos leen, solo Admin escribe
create policy "All read categorias"    on categorias for select using (auth.uid() is not null);
create policy "Admin insert categorias" on categorias for insert with check (get_my_role() = 'Administrador');
create policy "Admin update categorias" on categorias for update using (get_my_role() = 'Administrador');
create policy "Admin delete categorias" on categorias for delete using (get_my_role() = 'Administrador');

-- Áreas: todos leen, solo Admin escribe
create policy "All read areas"    on areas_trabajo for select using (auth.uid() is not null);
create policy "Admin insert areas" on areas_trabajo for insert with check (get_my_role() = 'Administrador');
create policy "Admin update areas" on areas_trabajo for update using (get_my_role() = 'Administrador');
create policy "Admin delete areas" on areas_trabajo for delete using (get_my_role() = 'Administrador');

-- Usuarios: todos leen, solo Admin modifica
create policy "All read usuarios"    on usuarios for select using (auth.uid() is not null);
create policy "Admin update usuarios" on usuarios for update using (get_my_role() = 'Administrador');
create policy "Admin delete usuarios" on usuarios for delete using (get_my_role() = 'Administrador');

-- Tareas: Admin/Gestor ven todo; Asignado solo las suyas
create policy "Admin Gestor see all tasks" on tareas for select using (
  get_my_role() in ('Administrador', 'Gestor')
);
create policy "Asignado see own tasks" on tareas for select using (
  get_my_role() = 'Asignado' and asignado_id = auth.uid()
);
create policy "Admin Gestor create tasks" on tareas for insert with check (
  get_my_role() in ('Administrador', 'Gestor')
);
create policy "Admin Gestor update tasks" on tareas for update using (
  get_my_role() in ('Administrador', 'Gestor')
);
create policy "Asignado update own task" on tareas for update using (
  get_my_role() = 'Asignado' and asignado_id = auth.uid()
);
create policy "Admin delete tasks" on tareas for delete using (
  get_my_role() = 'Administrador'
);

-- 5. DATOS INICIALES
-- ============================================================

insert into categorias (nombre) values
  ('Limpieza'), ('Educación'), ('Legal'), ('Acompañamiento');

insert into areas_trabajo (nombre) values
  ('Cocina'), ('Baños'), ('Dormitorios'), ('Oficinas');

-- ============================================================
-- DESPUÉS DE EJECUTAR ESTE SCRIPT:
--
-- 1. Regístrate en la app con tu correo de administrador.
-- 2. Ejecuta el siguiente UPDATE para convertirte en Admin:
--
--    UPDATE usuarios SET rol = 'Administrador'
--    WHERE correo = 'TU_CORREO@AQUI.COM';
--
-- 3. Cierra sesión y vuelve a entrar. Ya tendrás acceso completo.
-- ============================================================
