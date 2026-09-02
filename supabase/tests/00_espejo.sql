-- ============================================================================
-- Espejo local de la base para probar RLS de verdad
-- Local mirror of the database, to exercise RLS for real
--
-- No se conecta a Supabase. Levanta en un PostgreSQL cualquiera lo que hay
-- después de aplicar todas las migraciones, y lo hace EJECUTANDO LOS ARCHIVOS
-- REALES, no una copia. Una copia se desincroniza y entonces la suite pasa
-- mientras el sistema falla — que es peor que no tener suite.
--
-- Runs the REAL migration files rather than a copy: a copy drifts, and then
-- the suite passes while the system fails.
--
-- Lo único simulado es lo que Supabase pone y aquí no existe: `auth.uid()`,
-- que se resuelve desde una variable de sesión para poder hacerse pasar por
-- cada rol, y los objetos mínimos de `storage` para que las migraciones del
-- bucket corran sin error.
--
-- Uso / Usage:
--   psql -X -f supabase/tests/00_espejo.sql -f supabase/tests/01_reglas_asignado.sql
--
-- Requiere un PostgreSQL 15+ local y un rol con permiso de crear esquemas.
-- No toca el proyecto de Supabase.
-- ============================================================================

\set ON_ERROR_STOP on

drop schema if exists auth cascade;
drop schema if exists storage cascade;
drop table if exists tareas, usuarios, categorias, areas_trabajo cascade;
drop function if exists get_my_role() cascade;
drop function if exists handle_new_user() cascade;
drop function if exists restrict_asignado_update() cascade;
drop function if exists set_marcas_de_tiempo() cascade;
drop function if exists set_fecha_hecho() cascade;


-- ---------------------------------------------------------------------------
-- 1. Lo que Supabase aporta y aquí hay que simular
-- ---------------------------------------------------------------------------

create schema auth;
create schema storage;

create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb
);

-- Supabase resuelve auth.uid() desde el JWT. Aquí sale de un GUC de sesión,
-- que es lo que permite hacerse pasar por cada rol dentro de psql.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('demo.uid', true), '')::uuid
$$;

-- Objetos mínimos de Storage: solo lo que tocan las dos migraciones del bucket.
create table storage.buckets (
  id text primary key,
  name text,
  public boolean default false
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text
);
alter table storage.objects enable row level security;

-- El rol al que las políticas de Storage conceden permisos.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 2. Los archivos reales, en el orden documentado en el README
-- ---------------------------------------------------------------------------

\ir ../schema.sql
\ir ../migrations/add_fecha_limite.sql
\ir ../migrations/storage_evidencias_policies.sql
\ir ../migrations/security_rls_and_stability.sql
\ir ../migrations/add_fecha_inicio.sql
\ir ../migrations/hardening_rls_demo_publica.sql
\ir ../migrations/storage_evidencias_privado.sql
\ir ../migrations/reglas_cierre_asignado.sql
\ir ../migrations/search_path_handle_new_user.sql


-- ---------------------------------------------------------------------------
-- 3. Datos de prueba. Personas ficticias, igual que en las semillas.
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@ejemplo.test'),
  ('22222222-2222-2222-2222-222222222222', 'asignado@ejemplo.test'),
  ('33333333-3333-3333-3333-333333333333', 'otro@ejemplo.test');

-- El trigger on_auth_user_created ya creó los perfiles con rol 'Asignado';
-- aquí solo se corrigen nombre y rol, igual que hace 01_cuentas_demo.sql.
update usuarios set nombre_completo = 'Admin de Prueba', rol = 'Administrador'
 where correo = 'admin@ejemplo.test';
update usuarios set nombre_completo = 'Asignado de Prueba'
 where correo = 'asignado@ejemplo.test';
update usuarios set nombre_completo = 'Otro Asignado'
 where correo = 'otro@ejemplo.test';


-- ---------------------------------------------------------------------------
-- 4. Rol de aplicación SIN BYPASSRLS: el equivalente de 'authenticated'.
--    Sin esto las políticas no se evalúan y la suite no probaría nada — el
--    dueño de una tabla se salta RLS por omisión.
--    Without this, RLS is bypassed and the suite would test nothing.
-- ---------------------------------------------------------------------------

-- `drop role` falla si el rol conserva permisos de una corrida anterior, así
-- que primero se retiran. Deja la suite re-ejecutable sin limpiar a mano.
-- Privileges from a previous run must be revoked before the role can be dropped.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'app_user') then
    execute 'reassign owned by app_user to ' || quote_ident(current_user);
    execute 'drop owned by app_user';
    drop role app_user;
  end if;
end $$;

create role app_user nologin;
grant usage on schema public, auth, storage to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant select on all tables in schema storage to app_user;
grant execute on all functions in schema public, auth to app_user;
