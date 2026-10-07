-- ============================================================================
-- setup_completo.sql — GENERADO, no editar a mano. Regenerar: npm run db:setup
-- Para un proyecto de Supabase NUEVO y vacío: pega todo en el SQL Editor y ejecuta.
-- Orden: schema.sql → migrations/add_fecha_limite.sql → migrations/storage_evidencias_policies.sql → migrations/security_rls_and_stability.sql → migrations/add_fecha_inicio.sql → migrations/hardening_rls_demo_publica.sql → migrations/storage_evidencias_privado.sql → migrations/reglas_cierre_asignado.sql → migrations/search_path_handle_new_user.sql → migrations/proteger_ultimo_administrador.sql → migrations/desactivacion_de_usuarios.sql → migrations/plantillas_perfil.sql → migrations/autonomia_y_bitacora_turno.sql → migrations/configuracion_y_pool_reversible.sql
-- ============================================================================

-- ============================================================================
-- >>> schema.sql
-- ============================================================================

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
create policy "Asignado update own task" on tareas for update
  using     (get_my_role() = 'Asignado' and asignado_id = auth.uid())
  with check (get_my_role() = 'Asignado' and asignado_id = auth.uid());

-- Trigger: Asignado solo puede modificar estado y evidencia_url
create or replace function restrict_asignado_update()
returns trigger as $$
begin
  if get_my_role() = 'Asignado' then
    if new.nombre           is distinct from old.nombre           or
       new.detalles         is distinct from old.detalles         or
       new.foto_requerida   is distinct from old.foto_requerida   or
       new.asignado_id      is distinct from old.asignado_id      or
       new.categoria_id     is distinct from old.categoria_id     or
       new.area_trabajo_id  is distinct from old.area_trabajo_id  or
       new.creado_por       is distinct from old.creado_por       or
       new.fecha_limite     is distinct from old.fecha_limite
    then
      raise exception 'Asignado solo puede actualizar estado y evidencia_url';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_restrict_asignado_update
  before update on tareas
  for each row execute function restrict_asignado_update();
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

-- ============================================================================
-- >>> migrations/add_fecha_limite.sql
-- ============================================================================

-- Migración: agregar campo fecha_limite a la tabla tareas
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query

alter table tareas
  add column if not exists fecha_limite date;

-- ============================================================================
-- >>> migrations/storage_evidencias_policies.sql
-- ============================================================================

-- Migración: políticas de Storage para el bucket 'evidencias'
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requisito previo: el bucket 'evidencias' debe existir (Storage → New bucket → nombre: evidencias, Public: ON)

-- Asegura que el bucket existe y es público (getPublicUrl requiere bucket público)
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', true)
on conflict (id) do update set public = true;

-- Usuarios autenticados pueden subir fotos al bucket
create policy "Authenticated upload to evidencias"
on storage.objects for insert
to authenticated
with check (bucket_id = 'evidencias');

-- Lectura pública (necesario para que getPublicUrl funcione)
create policy "Public read from evidencias"
on storage.objects for select
to public
using (bucket_id = 'evidencias');

-- Usuarios autenticados pueden eliminar archivos (para limpieza)
create policy "Authenticated delete from evidencias"
on storage.objects for delete
to authenticated
using (bucket_id = 'evidencias');

-- ============================================================================
-- >>> migrations/security_rls_and_stability.sql
-- ============================================================================

-- Migración: seguridad RLS y restricción de columnas para Asignado
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requisito previo: schema.sql ya ejecutado

-- 1. Agregar WITH CHECK a la política de update del Asignado
--    Impide que un Asignado modifique asignado_id (auto-reasignación)
drop policy if exists "Asignado update own task" on tareas;
create policy "Asignado update own task" on tareas for update
  using     (get_my_role() = 'Asignado' and asignado_id = auth.uid())
  with check (get_my_role() = 'Asignado' and asignado_id = auth.uid());

-- 2. Trigger: restringe al Asignado a solo actualizar estado y evidencia_url
create or replace function restrict_asignado_update()
returns trigger as $$
begin
  if get_my_role() = 'Asignado' then
    if new.nombre           is distinct from old.nombre           or
       new.detalles         is distinct from old.detalles         or
       new.foto_requerida   is distinct from old.foto_requerida   or
       new.asignado_id      is distinct from old.asignado_id      or
       new.categoria_id     is distinct from old.categoria_id     or
       new.area_trabajo_id  is distinct from old.area_trabajo_id  or
       new.creado_por       is distinct from old.creado_por       or
       new.fecha_limite     is distinct from old.fecha_limite
    then
      raise exception 'Asignado solo puede actualizar estado y evidencia_url';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- El trigger ya lo crea schema.sql. Sin este drop, seguir el orden de
-- instalación documentado en el README aborta aquí con "trigger already
-- exists" en una base nueva. Lo detectó la suite de supabase/tests/ al
-- ejecutar los archivos reales en secuencia por primera vez.
-- schema.sql already creates it; without this drop, a fresh install following
-- the documented order aborts here.
drop trigger if exists trg_restrict_asignado_update on tareas;

create trigger trg_restrict_asignado_update
  before update on tareas
  for each row execute function restrict_asignado_update();

-- ============================================================================
-- >>> migrations/add_fecha_inicio.sql
-- ============================================================================

-- ============================================================================
-- Migración: marca de inicio de trabajo (fecha_inicio)
-- Work-start timestamp
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requisito previo: schema.sql y security_rls_and_stability.sql
--
-- Por qué: hasta ahora solo se guardaba `fecha_creacion` y `fecha_hecho`, así
-- que solo se podía medir el tiempo TOTAL. Eso mezcla dos cosas distintas:
--
--   espera  = fecha_inicio - fecha_creacion   (cuánto tardó en tomarse)
--   trabajo = fecha_hecho  - fecha_inicio     (cuánto costó hacerla)
--   total   = fecha_hecho  - fecha_creacion
--
-- Distinguirlas es lo que separa "el equipo es lento" de "las tareas tardan en
-- asignarse", que son problemas con soluciones opuestas.
--
-- Separating the two is what distinguishes "the team is slow" from "tasks sit
-- unassigned" — opposite problems with opposite fixes.
-- ============================================================================

alter table tareas
  add column if not exists fecha_inicio timestamptz;

comment on column tareas.fecha_inicio is
  'Momento en que la tarea pasó a En curso por primera vez. Null si nunca se inició. Se llena hacia adelante: las tareas anteriores a esta migración no la tienen.';


-- ----------------------------------------------------------------------------
-- Trigger unificado de marcas de tiempo
--
-- Reemplaza a set_fecha_hecho(). Se unifican en UNA función a propósito: con
-- dos triggers BEFORE UPDATE el orden de disparo depende del nombre, y esa es
-- una dependencia frágil de la que no conviene depender.
--
-- Replaces set_fecha_hecho(). Unified into ONE function on purpose: with two
-- BEFORE UPDATE triggers the firing order depends on their names, which is a
-- fragile thing to rely on.
-- ----------------------------------------------------------------------------

drop trigger if exists trg_fecha_hecho on tareas;

create or replace function set_marcas_de_tiempo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Inicio: se sella la PRIMERA vez que entra a En curso y nunca se pisa.
  -- Si la tarea se reabre, conserva su inicio original: reabrir no borra el
  -- hecho de que ya se había trabajado.
  -- Stamped the FIRST time it enters En curso and never overwritten: reopening
  -- does not erase that work had already happened.
  if new.estado = 'En curso' and new.fecha_inicio is null then
    new.fecha_inicio = now();
  end if;

  if new.estado = 'Hecho' and (old.estado is distinct from 'Hecho') then
    new.fecha_hecho = now();

    -- Salto directo de Pendiente a Hecho, sin pasar por En curso. Se sella el
    -- inicio junto con el cierre: el tiempo de trabajo queda en cero, que es
    -- lo honesto — nadie registró haber trabajado en ella.
    -- Straight from Pendiente to Hecho: work time becomes zero, which is the
    -- honest reading — nobody recorded working on it.
    if new.fecha_inicio is null then
      new.fecha_inicio = new.fecha_hecho;
    end if;

  elsif new.estado <> 'Hecho' then
    new.fecha_hecho = null;
  end if;

  return new;
end;
$$;

create trigger trg_marcas_de_tiempo
  before update on tareas
  for each row execute function set_marcas_de_tiempo();

drop function if exists set_fecha_hecho();


-- ----------------------------------------------------------------------------
-- El rol Asignado debe poder mover una tarea a En curso.
--
-- El trigger restrict_asignado_update lista las columnas que NO puede tocar.
-- fecha_inicio no está en esa lista, así que el sellado automático no se
-- bloquea. Se deja verificado aquí para que no se rompa si alguien edita esa
-- función más adelante.
-- Documented here so a future edit to that function does not silently break it.
-- ----------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from pg_proc
     where proname = 'restrict_asignado_update'
       and prosrc like '%fecha_inicio%'
  ) then
    raise exception 'restrict_asignado_update ahora bloquea fecha_inicio: el rol Asignado no podría iniciar tareas. Revisa esa función.';
  end if;
end $$;


-- ============================================================================
-- VERIFICACIÓN
--
--   select count(*) filter (where fecha_inicio is not null) as con_inicio,
--          count(*)                                          as total
--     from tareas;
--
-- Las tareas anteriores a esta migración quedan sin fecha_inicio y NO se
-- rellenan: inventar una marca de inicio para historia pasada sería fabricar
-- un dato que nadie registró. La métrica de tiempo de trabajo se irá llenando
-- conforme el equipo use el sistema.
--
-- Pre-existing tasks are left NULL on purpose: backfilling a start time nobody
-- recorded would be fabricating data.
--
-- ROLLBACK:
--   drop trigger if exists trg_marcas_de_tiempo on tareas;
--   create or replace function set_fecha_hecho() returns trigger as $f$
--   begin
--     if new.estado = 'Hecho' and (old.estado is distinct from 'Hecho') then
--       new.fecha_hecho = now();
--     elsif new.estado != 'Hecho' then new.fecha_hecho = null; end if;
--     return new;
--   end; $f$ language plpgsql security definer;
--   create trigger trg_fecha_hecho before update on tareas
--     for each row execute function set_fecha_hecho();
--   alter table tareas drop column if exists fecha_inicio;
-- ============================================================================

-- ============================================================================
-- >>> migrations/hardening_rls_demo_publica.sql
-- ============================================================================

-- ============================================================================
-- Migración: endurecimiento de RLS previo a la exposición pública
-- Hardening RLS before the app is exposed publicly
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requisito previo: schema.sql y security_rls_and_stability.sql ya ejecutados
--
-- Cubre 2 de los 3 hallazgos. El tercero (bucket 'evidencias' con lectura
-- anónima) NO va aquí porque exige cambios de código en paralelo.
-- Covers 2 of the 3 findings. The third one needs coupled code changes.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. get_my_role(): fijar search_path
--
-- La función es SECURITY DEFINER (corre con privilegios de su dueño) pero no
-- fija search_path. Es el patrón que el propio linter de Supabase marca como
-- "Function Search Path Mutable": permite que un objeto en un esquema
-- controlado por el atacante secuestre la resolución de nombres. Como TODA la
-- matriz de roles depende de esta función, comprometerla compromete los tres
-- roles a la vez.
--
-- 'create or replace' conserva el OID, así que las políticas existentes que la
-- invocan siguen funcionando sin recrearlas.
-- ----------------------------------------------------------------------------

create or replace function get_my_role()
returns text
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select rol from usuarios where id = auth.uid()
$$;


-- ----------------------------------------------------------------------------
-- 2. Tabla usuarios: dejar de exponer el directorio completo
--
-- Antes: "All read usuarios" usaba (auth.uid() is not null), así que CUALQUIER
-- usuario autenticado leía nombre y correo de TODOS. Con cuentas de demo
-- repartidas, eso expone los datos de todo el personal.
--
-- Después: cada quien lee su propia fila; Administrador y Gestor leen todas.
-- Las políticas SELECT permisivas se combinan con OR.
--
-- Verificado contra el código: App.jsx lee la fila propia; TaskForm.jsx lista
-- usuarios para el desplegable de asignación (solo Admin/Gestor lo abren);
-- Reports.jsx es Admin/Gestor; UserManagement.jsx es Admin. Los joins del
-- Kanban (asignado:usuarios!asignado_id) resuelven a la fila propia cuando el
-- que consulta es un Asignado, porque solo ve sus propias tareas.
-- ----------------------------------------------------------------------------

drop policy if exists "All read usuarios" on usuarios;

create policy "Read own usuario" on usuarios for select
  using (id = auth.uid());

create policy "Admin Gestor read usuarios" on usuarios for select
  using (get_my_role() in ('Administrador', 'Gestor'));


-- ============================================================================
-- CÓMO VERIFICAR
--
-- 1. Supabase → Advisors → Security Advisor: no debe quedar el hallazgo
--    "Function Search Path Mutable" sobre get_my_role.
-- 2. Entrar con una cuenta Asignado y abrir el Kanban: debe ver sus tareas y
--    su propio nombre. Ir a Reports o Usuarios no debe ser posible (la barra
--    de navegación ya los oculta por rol).
-- 3. Entrar con Administrador: la vista de Usuarios debe listar a todos y el
--    desplegable de asignación en una tarea nueva debe traer a todos.
--
-- Si algo se rompe, revertir con:
--
--   drop policy if exists "Read own usuario" on usuarios;
--   drop policy if exists "Admin Gestor read usuarios" on usuarios;
--   create policy "All read usuarios" on usuarios for select
--     using (auth.uid() is not null);
-- ============================================================================

-- ============================================================================
-- >>> migrations/storage_evidencias_privado.sql
-- ============================================================================

-- ============================================================================
-- Migración: bucket 'evidencias' privado, con acceso por propiedad de la tarea
-- Private 'evidencias' bucket, access scoped by task ownership
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requisitos previos: schema.sql, security_rls_and_stability.sql y
--                     hardening_rls_demo_publica.sql ya ejecutados
--
-- ⚠️ ESTA MIGRACIÓN VA ACOMPAÑADA DE CAMBIOS DE CÓDIGO. Ejecutarla sin
--    desplegar la versión que firma las URLs deja las fotos inaccesibles.
--    Run this together with the deploy that switches to signed URLs.
--
-- Antes: el bucket era público y la política de SELECT concedía lectura al rol
-- 'public'. Cualquiera en internet con la URL de un archivo lo veía, sin
-- sesión. En un refugio para personas migrantes, una foto de evidencia puede
-- identificar a alguien en situación de vulnerabilidad.
--
-- Después: bucket privado; el cliente pide una URL firmada de vigencia corta.
-- La ruta de cada archivo es '{id_de_tarea}/{timestamp}.{ext}', así que el
-- primer segmento permite comparar contra el asignado de la tarea.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Cerrar el bucket
-- ----------------------------------------------------------------------------

update storage.buckets set public = false where id = 'evidencias';


-- ----------------------------------------------------------------------------
-- 2. Reemplazar las políticas
--
-- Se califican con 'public.' a propósito: las políticas sobre storage.objects
-- no necesariamente evalúan con 'public' en el search_path.
-- ----------------------------------------------------------------------------

drop policy if exists "Authenticated upload to evidencias"   on storage.objects;
drop policy if exists "Public read from evidencias"          on storage.objects;
drop policy if exists "Authenticated delete from evidencias" on storage.objects;

-- Lectura: Admin y Gestor ven todo; el Asignado, solo la evidencia de las
-- tareas que tiene asignadas. Ni siquiera adivinando la ruta ve ajenas.
create policy "Evidencias: lectura autorizada"
on storage.objects for select to authenticated
using (
  bucket_id = 'evidencias'
  and (
    public.get_my_role() in ('Administrador', 'Gestor')
    or exists (
      select 1 from public.tareas t
      where t.id::text = split_part(storage.objects.name, '/', 1)
        and t.asignado_id = auth.uid()
    )
  )
);

-- Carga: mismo criterio. Impide que un Asignado suba archivos a la carpeta
-- de una tarea que no es suya.
create policy "Evidencias: carga autorizada"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'evidencias'
  and (
    public.get_my_role() in ('Administrador', 'Gestor')
    or exists (
      select 1 from public.tareas t
      where t.id::text = split_part(storage.objects.name, '/', 1)
        and t.asignado_id = auth.uid()
    )
  )
);

-- Borrado: solo Administrador. Antes lo podía hacer cualquier autenticado.
create policy "Evidencias: borrado solo Admin"
on storage.objects for delete to authenticated
using (
  bucket_id = 'evidencias'
  and public.get_my_role() = 'Administrador'
);


-- ----------------------------------------------------------------------------
-- 3. Convertir las filas existentes: de URL pública a ruta
--
-- El código nuevo guarda la ruta ('{id}/{ts}.{ext}'). Las filas viejas traen
-- la URL pública completa; se les recorta el prefijo. El ayudante del cliente
-- también tolera el formato viejo, así que el orden de despliegue no es
-- crítico, pero conviene dejar los datos limpios.
-- ----------------------------------------------------------------------------

update public.tareas
   set evidencia_url = regexp_replace(
         evidencia_url,
         '^.*/storage/v1/object/public/evidencias/',
         ''
       )
 where evidencia_url like '%/storage/v1/object/public/evidencias/%';


-- ============================================================================
-- CÓMO VERIFICAR
--
-- 1. Copiar la URL pública de una foto de ANTES y abrirla en una ventana de
--    incógnito: debe devolver error, no la imagen.
-- 2. Entrar como Asignado, abrir una tarea propia con evidencia y pulsar
--    "Ver evidencia": debe abrirse.
-- 3. Confirmar que quedan tres políticas sobre el bucket:
--      select policyname from pg_policies
--       where tablename = 'objects' and policyname like 'Evidencias%';
--
-- ROLLBACK (vuelve a dejar el bucket público — solo para emergencias):
--
--   update storage.buckets set public = true where id = 'evidencias';
--   drop policy if exists "Evidencias: lectura autorizada"  on storage.objects;
--   drop policy if exists "Evidencias: carga autorizada"    on storage.objects;
--   drop policy if exists "Evidencias: borrado solo Admin"  on storage.objects;
--   create policy "Public read from evidencias" on storage.objects
--     for select to public using (bucket_id = 'evidencias');
--   create policy "Authenticated upload to evidencias" on storage.objects
--     for insert to authenticated with check (bucket_id = 'evidencias');
-- ============================================================================

-- ============================================================================
-- >>> migrations/reglas_cierre_asignado.sql
-- ============================================================================

-- ============================================================================
-- Migración: las reglas de cierre dejan de vivir solo en el navegador
-- Task-closing rules move from the browser into the database
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requisitos previos: schema.sql, security_rls_and_stability.sql,
--                     add_fecha_inicio.sql y hardening_rls_demo_publica.sql
--
-- ⚠️ NO requiere cambios de código. El cliente ya se comporta así; esta
--    migración solo hace que la base exija lo mismo que la interfaz pedía.
--    Se puede aplicar antes o después de cualquier despliegue.
--    No coupled code changes: the client already behaves this way.
--
-- ----------------------------------------------------------------------------
-- POR QUÉ
--
-- Auditoría del 2 de septiembre de 2026. Reproducido contra PostgreSQL 16 con
-- las políticas reales y un rol sin BYPASSRLS, haciéndose pasar por un
-- Asignado. Los tres agujeros salen de lo mismo: el rol Asignado tiene
-- escritura incondicional sobre `estado` y `evidencia_url`, y todo el criterio
-- de qué valores son legítimos estaba en KanbanBoard.jsx.
--
--   H1  Cerró una tarea con foto_requerida = true y evidencia nula.
--       La promesa del producto —que un cierre deja rastro verificable— era
--       una cortesía de la interfaz.
--
--   H2  Movió una tarea de 'Hecho' a 'Pendiente'. El trigger de marcas de
--       tiempo puso la fecha de cierre en nulo al hacerlo, así que el efecto
--       no es solo saltarse una regla: BORRA el registro de que la tarea
--       estuvo cerrada, sin dejar huella, y de paso corrompe las métricas del
--       reporte.
--
--   H3  Apuntó `evidencia_url` a la carpeta de otra tarea —reciclando una
--       misma foto para cerrar varias— y la vació después de haber cerrado.
--       El bucket ya acotaba bien quién puede LEER un archivo; nadie acotaba
--       qué se puede ESCRIBIR en la columna que dice cuál es.
--
-- Lo que esta migración NO cambia, a propósito: Administrador y Gestor siguen
-- pudiendo reabrir tareas y cerrar sin foto. Es la decisión de producto que ya
-- estaba tomada (KanbanBoard.jsx:290-295) y una corrección de seguridad no es
-- el lugar para revertirla en silencio.
-- Admin and Gestor keep both bypasses on purpose: that product decision was
-- already made, and a security fix is not the place to quietly reverse it.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Las tres reglas, dentro de la función que ya gobierna al rol Asignado
--
-- Se amplía `restrict_asignado_update` en vez de agregar un cuarto trigger
-- BEFORE UPDATE. Con varios, el orden de disparo depende del nombre, que es la
-- dependencia frágil que `add_fecha_inicio.sql` se esforzó en quitar.
--
-- El nombre se queda como está aunque la función ya haga más que restringir
-- columnas: `add_fecha_inicio.sql` la busca por nombre en pg_proc para su
-- guarda de seguridad, y renombrarla dejaría esa guarda buscando un objeto que
-- no existe — es decir, callada para siempre.
--
-- ⚠️ ESA GUARDA TAMBIÉN PROHÍBE que el texto de esta función mencione la
--    columna de marca de inicio: si aparece, `add_fecha_inicio.sql` aborta al
--    re-ejecutarse. Por eso aquí no se nombra en ningún comentario.
--    That guard forbids this function's source from naming the start-stamp
--    column, so it is not mentioned anywhere below.
--
-- Sobre el orden con `trg_marcas_de_tiempo` (que dispara antes, por nombre):
-- esa función escribe `fecha_hecho`, y ninguna de las reglas de abajo la lee.
-- Las tres miran `estado`, `foto_requerida` y `evidencia_url`, que nadie más
-- toca. El orden es indiferente aquí, pero conviene saberlo antes de agregar
-- una regla que sí dependa de una marca de tiempo.
--
-- Sobre `get_my_role()` nula: devuelve null para service_role y para procesos
-- sin sesión, así que la comparación con 'Asignado' es falsa y las reglas se
-- saltan. Es lo que se quiere: las semillas y los scripts de administración no
-- deben chocar contra reglas pensadas para una persona usando la aplicación.
-- get_my_role() is null for service_role, so seeds and admin scripts skip
-- these rules — which is the intent.
--
-- Se fija `search_path`: la función es SECURITY DEFINER y estaba en la lista
-- de "Function Search Path Mutable" del Security Advisor. Como de todos modos
-- se reescribe, dejarla mutable sería enviar a sabiendas un hueco conocido.
-- Queda pendiente `handle_new_user()`, que se atiende aparte.
-- ----------------------------------------------------------------------------

create or replace function restrict_asignado_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- Una evidencia en blanco es una evidencia ausente. Normalizarlo aquí, una
  -- vez, evita que cada regla de abajo tenga que acordarse — y que un
  -- `is not null` ingenuo deje pasar tres espacios. Además se escribe de vuelta
  -- a la fila, para que la columna no guarde nunca una cadena vacía y el resto
  -- del sistema pueda confiar en `is null`.
  -- Blank evidence is absent evidence: normalized once, and written back so the
  -- column never stores an empty string.
  _evidencia text := nullif(trim(new.evidencia_url), '');
begin
  new.evidencia_url := _evidencia;

  -- `coalesce` y no `<>` a secas: `get_my_role()` devuelve NULL para
  -- service_role y para procesos sin sesión, y en SQL `NULL <> 'Asignado'` no
  -- es cierto sino NULL — sin el coalesce el `if` no se cumpliría y las reglas
  -- SÍ se aplicarían a esos procesos, al revés de lo que dice el comentario de
  -- arriba. La lógica de tres valores no perdona.
  -- Without coalesce, NULL <> 'Asignado' is NULL, not true, and the rules would
  -- apply to service_role — the opposite of what is documented above.
  if coalesce(get_my_role(), '') <> 'Asignado' then
    return new;
  end if;

  -- ---- Bloqueo de columnas (ya existía) --------------------------------
  if new.nombre           is distinct from old.nombre           or
     new.detalles         is distinct from old.detalles         or
     new.foto_requerida   is distinct from old.foto_requerida   or
     new.asignado_id      is distinct from old.asignado_id      or
     new.categoria_id     is distinct from old.categoria_id     or
     new.area_trabajo_id  is distinct from old.area_trabajo_id  or
     new.creado_por       is distinct from old.creado_por       or
     new.fecha_limite     is distinct from old.fecha_limite
  then
    raise exception 'Solo puedes cambiar el estado de la tarea y su evidencia.'
      using errcode = 'PT001';
  end if;

  -- ---- H2: una tarea cerrada no se reabre desde este rol ----------------
  -- Reabrir borra la fecha de cierre. Quien cierra no debe poder deshacer el
  -- registro de que cerró; para eso está el Administrador.
  if old.estado = 'Hecho' and new.estado <> 'Hecho' then
    raise exception 'Una tarea marcada como Hecha solo la puede reabrir un Administrador o Gestor.'
      using errcode = 'PT002';
  end if;

  -- ---- H1: sin evidencia no hay cierre ----------------------------------
  -- Se compara contra `new` porque el bloqueo de arriba ya garantiza que
  -- foto_requerida no cambió en esta misma actualización.
  if new.estado = 'Hecho'
     and old.estado is distinct from 'Hecho'
     and coalesce(new.foto_requerida, false)
     and _evidencia is null
  then
    raise exception 'Esta tarea requiere foto de evidencia para marcarse como Hecha.'
      using errcode = 'PT003';
  end if;

  -- ---- H3: la evidencia apunta a la propia tarea ------------------------
  -- La ruta es '{id_de_tarea}/{marca}.{ext}' y las políticas del bucket usan
  -- ese primer segmento para decidir quién lee el archivo. Si la columna puede
  -- apuntar a cualquier lado, esa comprobación deja de significar algo.
  --
  -- Solo se valida cuando el valor CAMBIA: las filas anteriores a la migración
  -- del bucket privado pueden traer una URL completa, y no hay por qué
  -- bloquear a alguien por historia que no escribió.
  -- Vaciarla no es asunto de esta regla, sino de la siguiente: quien manda tres
  -- espacios está borrando, no apuntando a otro lado, y merece ese mensaje.
  -- Clearing is the next rule's business, not this one's.
  if _evidencia is not null
     and _evidencia is distinct from old.evidencia_url
     and left(_evidencia, length(new.id::text) + 1) <> new.id::text || '/'
  then
    raise exception 'La evidencia debe pertenecer a esta tarea.'
      using errcode = 'PT004';
  end if;

  -- ---- H3 (segunda mitad): no se vacía la evidencia de una tarea cerrada -
  if old.estado = 'Hecho'
     and old.evidencia_url is not null
     and _evidencia is null
  then
    raise exception 'No se puede quitar la evidencia de una tarea ya cerrada.'
      using errcode = 'PT005';
  end if;

  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- El trigger ya existe desde security_rls_and_stability.sql y apunta a esta
-- misma función por nombre, así que `create or replace` basta. Se recrea solo
-- si falta, para que la migración también sirva en una base recién levantada.
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgname = 'trg_restrict_asignado_update'
       and tgrelid = 'public.tareas'::regclass
  ) then
    create trigger trg_restrict_asignado_update
      before update on tareas
      for each row execute function restrict_asignado_update();
  end if;
end $$;


-- ============================================================================
-- CÓMO VERIFICAR
--
-- Automático: `supabase/tests/` levanta un espejo de PostgreSQL con estas
-- mismas políticas y ejecuta los cuatro ataques más los cinco controles que
-- deben aguantar, con veredicto por caso. Ver `supabase/tests/README.md`.
--
-- A mano, entrando con una cuenta Asignado:
--
--   1. Arrastrar a Hecho una tarea con foto requerida: debe seguir pidiendo la
--      foto, y ahora también fallaría si alguien saltara la interfaz.
--   2. Arrastrar hacia atrás una tarea en Hecho: la interfaz ya lo impedía;
--      ahora la base también.
--   3. Con Administrador, reabrir una tarea: debe seguir funcionando.
--   4. Con Administrador, cerrar sin foto una tarea con foto requerida: debe
--      seguir funcionando (es la excepción documentada).
--
-- Los códigos PT001–PT005 son propios de este proyecto. Sirven para que la
-- capa de mensajes de error del cliente los traduzca sin adivinar por texto.
--
-- ROLLBACK — devuelve la función a su versión anterior (solo bloqueo de
-- columnas). Deja de nuevo abiertos H1, H2 y H3:
--
--   create or replace function restrict_asignado_update()
--   returns trigger as $f$
--   begin
--     if get_my_role() = 'Asignado' then
--       if new.nombre           is distinct from old.nombre           or
--          new.detalles         is distinct from old.detalles         or
--          new.foto_requerida   is distinct from old.foto_requerida   or
--          new.asignado_id      is distinct from old.asignado_id      or
--          new.categoria_id     is distinct from old.categoria_id     or
--          new.area_trabajo_id  is distinct from old.area_trabajo_id  or
--          new.creado_por       is distinct from old.creado_por       or
--          new.fecha_limite     is distinct from old.fecha_limite
--       then
--         raise exception 'Asignado solo puede actualizar estado y evidencia_url';
--       end if;
--     end if;
--     return new;
--   end; $f$ language plpgsql security definer;
-- ============================================================================

-- ============================================================================
-- >>> migrations/search_path_handle_new_user.sql
-- ============================================================================

-- ============================================================================
-- Migración: fijar search_path en handle_new_user()
-- Pin search_path on handle_new_user()
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requisito previo: schema.sql
--
-- `hardening_rls_demo_publica.sql` fijó el search_path de `get_my_role()` y ahí
-- se detuvo. Quedaban dos funciones SECURITY DEFINER con search_path mutable —
-- el hallazgo que el propio Security Advisor de Supabase marca como "Function
-- Search Path Mutable". `restrict_asignado_update()` se arregla en
-- `reglas_cierre_asignado.sql`, que la reescribe de todos modos. Esta es la
-- otra, y es la más delicada de las dos: corre con los privilegios de su dueño
-- en la ruta de alta de usuarios, disparada por un insert en `auth.users`.
--
-- Con el search_path abierto, un objeto en un esquema que el atacante controle
-- puede secuestrar la resolución de nombres dentro de una función que corre
-- elevada. Fijarlo cierra esa puerta sin cambiar el comportamiento.
--
-- With a mutable search_path, an object in an attacker-controlled schema can
-- hijack name resolution inside a function running elevated.
--
-- El cuerpo es idéntico al de schema.sql: aquí solo se añade la cláusula
-- `set search_path`. `create or replace` conserva el OID, así que el trigger
-- `on_auth_user_created` sigue apuntando a ella sin recrearlo.
-- The body is unchanged; only the search_path clause is added.
-- ============================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
$$;


-- ============================================================================
-- CÓMO VERIFICAR
--
--   select proname, proconfig from pg_proc p
--     join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.prosecdef;
--
-- Las cuatro funciones deben mostrar {search_path=public,\ pg_temp}. La suite
-- de `supabase/tests/` lo comprueba sola, en el grupo "Higiene".
--
-- Supabase → Advisors → Security Advisor no debe reportar ya ningún
-- "Function Search Path Mutable".
--
-- ROLLBACK: no tiene sentido revertirlo — devolvería un hueco conocido sin
-- ganar nada. Si hiciera falta por alguna razón, basta con volver a crear la
-- función sin la línea `set search_path`.
-- ============================================================================

-- ============================================================================
-- >>> migrations/proteger_ultimo_administrador.sql
-- ============================================================================

-- ============================================================================
-- Migración: no se puede quedar la organización sin Administrador
-- The organization cannot be left without an Administrador
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requisito previo: schema.sql
--
-- ⚠️ NO requiere cambios de código.
--
-- ----------------------------------------------------------------------------
-- POR QUÉ
--
-- Auditoría del 2 de septiembre de 2026, hallazgo H12. No es confidencialidad
-- sino disponibilidad, y por eso es fácil de pasar por alto: un Administrador
-- puede quitarse el rol a sí mismo desde la vista de Usuarios, o borrar el
-- perfil del otro, y nadie queda con permiso para crear usuarios, administrar
-- catálogos ni volver a repartir roles. La única salida es entrar al SQL
-- Editor de Supabase, que es exactamente el conocimiento que esta aplicación
-- existe para no exigirle a un refugio.
--
-- En una ONG donde una sola persona suele tener la cuenta de administración, el
-- escenario no es hipotético: basta con que esa persona pruebe qué pasa si
-- cambia su propio rol.
--
-- Availability, not confidentiality — which is why it is easy to miss. The way
-- out would be the Supabase SQL Editor, exactly the knowledge this app exists
-- so a shelter does not need.
--
-- ----------------------------------------------------------------------------
-- ALCANCE
--
-- Se cubren las dos formas de perder al último: degradarlo (UPDATE del rol) y
-- borrar su perfil (DELETE). No se cubre borrar la cuenta de `auth.users`
-- directamente desde el panel de Supabase, y no debe cubrirse: quien está en el
-- panel ya tiene privilegios por encima de la aplicación, y un trigger que
-- estorbe ahí solo conseguiría que alguien lo desactive.
--
-- Deliberately not covering deletion from the Supabase dashboard: whoever is
-- there already outranks the app, and a trigger in the way would just get
-- switched off.
-- ============================================================================

create or replace function proteger_ultimo_administrador()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _quedan int;
begin
  -- Solo interesa cuando la fila que se toca ES de un Administrador y deja de
  -- serlo. Un Gestor cambiando de rol, o el Administrador editando otra cosa,
  -- no tienen por qué pagar el costo de la consulta.
  -- Only when the touched row IS an admin and stops being one.
  if old.rol <> 'Administrador' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE' and new.rol = 'Administrador' then
    return new;
  end if;

  -- La función es SECURITY DEFINER, así que este conteo ve la tabla completa
  -- aunque quien dispara el trigger no pueda. Sin eso, un Administrador que
  -- por RLS solo viera su propia fila contaría 1 siempre.
  -- SECURITY DEFINER so the count sees every row, not just what RLS shows.
  select count(*) into _quedan
    from usuarios
   where rol = 'Administrador'
     and id <> old.id;

  if _quedan = 0 then
    raise exception 'No se puede dejar el sistema sin ningún Administrador. Asigna ese rol a otra persona primero.'
      using errcode = 'PT006';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


drop trigger if exists trg_proteger_ultimo_administrador on usuarios;

create trigger trg_proteger_ultimo_administrador
  before update or delete on usuarios
  for each row execute function proteger_ultimo_administrador();


-- ============================================================================
-- CÓMO VERIFICAR
--
-- Automático: `supabase/tests/` lo cubre — el caso comprueba tanto que el
-- último no se pueda degradar como que el penúltimo SÍ pueda, que es la mitad
-- que suele olvidarse y la que convierte la regla en un estorbo.
--
-- A mano, con dos cuentas Administrador:
--   1. Degradar a una: debe funcionar.
--   2. Degradar a la que queda: debe rechazarse con el mensaje de arriba.
--   3. Volver a subir a alguien y comprobar que la primera se puede degradar
--      otra vez.
--
-- Si el sistema YA se quedó sin administradores antes de aplicar esta
-- migración, este trigger no lo arregla — solo impide llegar ahí. La salida es
-- el SQL Editor:
--
--   update usuarios set rol = 'Administrador' where correo = 'TU_CORREO@AQUI';
--
-- ROLLBACK:
--   drop trigger if exists trg_proteger_ultimo_administrador on usuarios;
--   drop function if exists proteger_ultimo_administrador();
-- ============================================================================

-- ============================================================================
-- >>> migrations/desactivacion_de_usuarios.sql
-- ============================================================================

-- ============================================================================
-- Migración: desactivar el acceso de una persona, en serio
-- Actually revoking a person's access
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requisitos previos: schema.sql, hardening_rls_demo_publica.sql y
--                     proteger_ultimo_administrador.sql
--
-- ⚠️ VA ACOMPAÑADA DE CAMBIOS DE CÓDIGO. `UserManagement.jsx` deja de ofrecer
--    "Eliminar" y pasa a "Desactivar acceso", llamando a las funciones de aquí.
--    Aplicar la migración sin desplegar deja el botón viejo, que ya no existe
--    en la interfaz nueva; desplegar sin la migración deja el botón nuevo sin
--    función a la que llamar.
--    Ships together with the code change: neither half works alone.
--
-- ----------------------------------------------------------------------------
-- POR QUÉ — hallazgo H13, reportado por Hugo el 2 de septiembre de 2026
--
-- El botón "Eliminar" borraba la fila de `public.usuarios` y nada más. Dos
-- consecuencias, y la segunda es la que nadie había visto:
--
--   1. La cuenta de `auth.users` seguía viva. La credencial funcionaba: esa
--      persona podía iniciar sesión. Hoy RLS la contiene —`get_my_role()`
--      devuelve nulo y no ve ni una tarea ni una fila del directorio— pero eso
--      depende de que NINGUNA política use `auth.uid() is not null`. El esquema
--      original tenía exactamente esa: "All read usuarios". Bajo ella, una
--      cuenta huérfana habría leído el directorio completo del personal. No es
--      un riesgo teórico: es un patrón que ya estuvo mal una vez en este repo.
--
--   2. `tareas.asignado_id` tiene `on delete set null`, así que borrar el
--      perfil DESASIGNABA todas sus tareas en silencio. Reproducido: cinco
--      tareas, tres de ellas ya cerradas, quedaron sin asignado. Para un
--      sistema cuyo argumento es la trazabilidad, borrar quién cerró una tarea
--      es peor que el problema de acceso.
--
-- Deleting the profile silently unassigned every task the person had closed.
-- For a tracker whose whole argument is traceability, that is worse than the
-- access problem.
--
-- ----------------------------------------------------------------------------
-- QUÉ HACE EN VEZ
--
-- La fila se queda —la historia se conserva— y se marca `activo = false`. Eso
-- corta el acceso en dos capas independientes:
--
--   · `get_my_role()` devuelve nulo, así que TODAS las políticas deniegan.
--     Aplica de inmediato, incluso a una sesión ya abierta.
--   · `auth.users.banned_until` se pone en el futuro, así que GoTrue rechaza
--     el inicio de sesión. La credencial deja de servir.
--
-- Se cortan las dos porque cada una tapa el hueco de la otra: la primera no
-- impide autenticarse, la segunda no toca una sesión que ya está abierta.
--
-- Two independent layers, because each covers the other's gap.
--
-- El borrado desaparece de la interfaz. Si de verdad hay que eliminar a
-- alguien —una alta por error, un requerimiento legal— se hace desde el panel
-- de Supabase, donde quien lo haga ve lo que está borrando. Una aplicación no
-- debería ofrecer con un clic una operación que destruye historia en silencio.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. La marca
-- ----------------------------------------------------------------------------

alter table usuarios
  add column if not exists activo boolean not null default true;

comment on column usuarios.activo is
  'false = acceso revocado. La fila se conserva para no perder la autoría de las tareas. Va de la mano con auth.users.banned_until.';


-- ----------------------------------------------------------------------------
-- 2. get_my_role() ignora a quien está desactivado
--
-- Es el punto donde una sola línea revoca todo: cada política del sistema pasa
-- por esta función. Devolver nulo las hace fallar todas a la vez, sin tener que
-- tocar ninguna.
-- One line revokes everything: every policy goes through this function.
-- ----------------------------------------------------------------------------

create or replace function get_my_role()
returns text
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select rol from usuarios where id = auth.uid() and activo
$$;


-- ----------------------------------------------------------------------------
-- 3. La protección del último Administrador cuenta solo a los ACTIVOS
--
-- Sin esto, desactivar al único Administrador activo dejaría el sistema sin
-- nadie que administre mientras el conteo sigue viendo filas que ya no cuentan.
-- Otherwise deactivating the only active admin would lock everyone out.
-- ----------------------------------------------------------------------------

create or replace function proteger_ultimo_administrador()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _quedan int;
begin
  if old.rol <> 'Administrador' or not old.activo then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- Sigue siendo Administrador Y sigue activo: no hay nada que proteger.
  if tg_op = 'UPDATE' and new.rol = 'Administrador' and new.activo then
    return new;
  end if;

  select count(*) into _quedan
    from usuarios
   where rol = 'Administrador'
     and activo
     and id <> old.id;

  if _quedan = 0 then
    raise exception 'No se puede dejar el sistema sin ningún Administrador activo. Asigna ese rol a otra persona primero.'
      using errcode = 'PT006';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


-- ----------------------------------------------------------------------------
-- 4. Desactivar
--
-- SECURITY DEFINER porque escribe en `auth.users`, donde el rol `authenticated`
-- no tiene permiso — y ESA es la razón de la primera línea del cuerpo: sin la
-- comprobación de rol, cualquiera con una sesión podría llamarla y banear a
-- quien quisiera. Una función definer sin guarda es una escalada de privilegios
-- con buenos modales.
--
-- A definer function without a role check is a privilege escalation with good
-- manners.
-- ----------------------------------------------------------------------------

create or replace function desactivar_usuario(_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  -- `is distinct from` y no `<>`: para una persona DESACTIVADA `get_my_role()`
  -- devuelve NULL, y en SQL `NULL <> 'Administrador'` no es cierto sino NULL,
  -- así que el `if` no se cumple y la guarda se salta entera. La suite lo cazó:
  -- una cuenta desactivada podía reactivarse a sí misma. En una función
  -- SECURITY DEFINER, una guarda que no se cumple es la escalada completa.
  -- `is distinct from`, not `<>`: get_my_role() is NULL for a deactivated
  -- person, and NULL <> 'x' is NULL, not true — the guard would be skipped.
  if get_my_role() is distinct from 'Administrador' then
    raise exception 'Solo un Administrador puede desactivar accesos.'
      using errcode = 'PT007';
  end if;

  -- Desactivarse a sí mismo no tiene un uso legítimo y sí una forma de acabar
  -- mal. Se bloquea aparte para dar un mensaje que explique, en vez de dejar
  -- que caiga en la regla del último Administrador con otro texto.
  -- Blocked separately so the message explains, instead of falling through.
  if _id = auth.uid() then
    raise exception 'No puedes desactivar tu propio acceso. Pídeselo a otro Administrador.'
      using errcode = 'PT008';
  end if;

  -- El trigger del último Administrador vigila este update y lo rechaza con
  -- PT006 si hace falta. No se duplica la comprobación aquí a propósito:
  -- duplicarla es como se desincronizan las reglas.
  update usuarios set activo = false where id = _id;

  if not found then
    raise exception 'No se encontró a esa persona.' using errcode = 'PT009';
  end if;

  -- Segunda capa: GoTrue rechaza el inicio de sesión de una cuenta baneada.
  -- 'infinity' no es válido en esta columna en todas las versiones, así que se
  -- usa una fecha lejana y explícita.
  update auth.users set banned_until = now() + interval '100 years' where id = _id;
end;
$$;


-- ----------------------------------------------------------------------------
-- 5. Reactivar — porque una baja por error tiene que poder deshacerse sin
--    entrar al panel de Supabase.
-- ----------------------------------------------------------------------------

create or replace function reactivar_usuario(_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  -- `is distinct from` y no `<>`: para una persona DESACTIVADA `get_my_role()`
  -- devuelve NULL, y en SQL `NULL <> 'Administrador'` no es cierto sino NULL,
  -- así que el `if` no se cumple y la guarda se salta entera. La suite lo cazó:
  -- una cuenta desactivada podía reactivarse a sí misma. En una función
  -- SECURITY DEFINER, una guarda que no se cumple es la escalada completa.
  -- `is distinct from`, not `<>`: get_my_role() is NULL for a deactivated
  -- person, and NULL <> 'x' is NULL, not true — the guard would be skipped.
  if get_my_role() is distinct from 'Administrador' then
    raise exception 'Solo un Administrador puede reactivar accesos.'
      using errcode = 'PT007';
  end if;

  update usuarios set activo = true where id = _id;

  if not found then
    raise exception 'No se encontró a esa persona.' using errcode = 'PT009';
  end if;

  update auth.users set banned_until = null where id = _id;
end;
$$;


-- ----------------------------------------------------------------------------
-- 6. Permisos: las funciones son el único camino, y solo para quien tiene
--    sesión. El rol anónimo no las alcanza.
-- ----------------------------------------------------------------------------

revoke all on function desactivar_usuario(uuid) from public;
revoke all on function reactivar_usuario(uuid)  from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function desactivar_usuario(uuid) to authenticated';
    execute 'grant execute on function reactivar_usuario(uuid)  to authenticated';
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 7. Ya no se borra desde la aplicación
--
-- La política de DELETE se retira. El botón desapareció de la interfaz, pero
-- una política que sigue ahí es una invitación a que alguien vuelva a llamar
-- al endpoint desde la consola del navegador — que es exactamente cómo se
-- descubrió este hallazgo.
-- The button is gone from the UI, but a policy left behind is an invitation.
-- ----------------------------------------------------------------------------

drop policy if exists "Admin delete usuarios" on usuarios;


-- ============================================================================
-- CÓMO VERIFICAR
--
-- Automático: `supabase/tests/` cubre los dos lados —que un Asignado no pueda
-- llamar a la función, que el Administrador sí, que la persona desactivada
-- pierda el rol y deje de ver todo, que reactivar lo devuelva, y que no se
-- pueda desactivar al último Administrador ni a uno mismo.
--
-- A mano:
--   1. Desactivar a alguien desde Usuarios.
--   2. Intentar iniciar sesión con esa cuenta: debe fallar.
--      (El mensaje es el mismo de una contraseña incorrecta, a propósito: la
--       pantalla de login no revela el estado de ninguna cuenta.)
--   3. Reactivarla y volver a entrar: debe funcionar.
--
-- Sobre una sesión ya abierta: el JWT sigue siendo válido hasta que caduque,
-- pero `get_my_role()` ya devuelve nulo, así que esa sesión no ve ni un dato.
-- La revocación es inmediata donde importa.
--
-- ROLLBACK:
--   drop function if exists desactivar_usuario(uuid);
--   drop function if exists reactivar_usuario(uuid);
--   create policy "Admin delete usuarios" on usuarios for delete
--     using (get_my_role() = 'Administrador');
--   create or replace function get_my_role() returns text
--   language sql security definer stable set search_path = public, pg_temp
--   as $f$ select rol from usuarios where id = auth.uid() $f$;
--   -- La columna `activo` se puede dejar: no estorba.
-- ============================================================================

-- ============================================================================
-- >>> migrations/plantillas_perfil.sql
-- ============================================================================

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

-- ============================================================================
-- >>> migrations/autonomia_y_bitacora_turno.sql
-- ============================================================================

-- ============================================================================
-- Migración 12: Autonomía del voluntariado, pool de tareas y bitácora de turno
-- Volunteer self-check-in, open task claiming pool, and shift handover log
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requisitos previos: schema.sql y migraciones 1-11
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla de Bitácora de Turnos (Handover log)
-- ----------------------------------------------------------------------------

create table if not exists bitacora_turnos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) on delete set null,
  area_trabajo_id uuid references areas_trabajo(id) on delete set null,
  fecha date default current_date not null,
  turno text default 'General' check (turno in ('Matutino', 'Vespertino', 'Nocturno', 'General')),
  mensaje text not null check (char_length(trim(mensaje)) > 0),
  created_at timestamptz default now() not null
);

create index if not exists idx_bitacora_fecha on bitacora_turnos(fecha desc);
create index if not exists idx_bitacora_area on bitacora_turnos(area_trabajo_id);

alter table bitacora_turnos enable row level security;

-- Todos los usuarios activos leen las notas para coordinar la operación
drop policy if exists "All authenticated read bitacora" on bitacora_turnos;
create policy "All authenticated read bitacora"
  on bitacora_turnos for select
  using (get_my_role() is not null);

-- Cualquier voluntario o gestor activo puede dejar novedades
drop policy if exists "Authenticated insert bitacora" on bitacora_turnos;
create policy "Authenticated insert bitacora"
  on bitacora_turnos for insert
  with check (get_my_role() is not null);

-- Solo el autor o un Administrador pueden eliminar una nota
drop policy if exists "Author or Admin delete bitacora" on bitacora_turnos;
create policy "Author or Admin delete bitacora"
  on bitacora_turnos for delete
  using (get_my_role() = 'Administrador' or (usuario_id = auth.uid() and get_my_role() is not null));


-- ----------------------------------------------------------------------------
-- 2. Tareas Abiertas: Asignado puede ver tareas sin asignar en estado Pendiente
-- ----------------------------------------------------------------------------

drop policy if exists "Asignado see open tasks" on tareas;
create policy "Asignado see open tasks"
  on tareas for select
  using (
    get_my_role() = 'Asignado'
    and asignado_id is null
    and estado = 'Pendiente'
  );


-- ----------------------------------------------------------------------------
-- 3. Función RPC: Reclamar tarea abierta de forma atómica
-- ----------------------------------------------------------------------------

create or replace function reclamar_tarea_abierta(p_tarea_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tarea tareas%rowtype;
begin
  if get_my_role() is null then
    raise exception 'Debes tener una cuenta activa para tomar una tarea.' using errcode = 'PT010';
  end if;

  -- Bloqueo FOR UPDATE para garantizar atomicidad y evitar condición de carrera
  select * into v_tarea
    from tareas
   where id = p_tarea_id
     for update;

  if not found then
    raise exception 'La tarea no existe.' using errcode = 'PT011';
  end if;

  if v_tarea.asignado_id is not null then
    raise exception 'Esta tarea ya fue tomada por otra persona.' using errcode = 'PT012';
  end if;

  if v_tarea.estado <> 'Pendiente' then
    raise exception 'Solo se pueden tomar tareas en estado Pendiente.' using errcode = 'PT013';
  end if;

  update tareas
     set asignado_id = auth.uid()
   where id = p_tarea_id
   returning * into v_tarea;

  return row_to_json(v_tarea);
end;
$$;

grant execute on function reclamar_tarea_abierta(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 4. Función RPC: Iniciar rutina de voluntariado (Auto-toma)
-- ----------------------------------------------------------------------------

create or replace function iniciar_rutina_voluntario(p_plantilla_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plantilla plantillas_perfil%rowtype;
  v_item record;
  v_count int := 0;
begin
  if get_my_role() is null then
    raise exception 'Debes tener una cuenta activa para iniciar una rutina.' using errcode = 'PT020';
  end if;

  select * into v_plantilla
    from plantillas_perfil
   where id = p_plantilla_id and activo = true;

  if not found then
    raise exception 'El perfil o rutina no existe o no está activo.' using errcode = 'PT021';
  end if;

  for v_item in (
    select * from plantilla_tareas
     where plantilla_id = p_plantilla_id
     order by orden asc, nombre asc
  ) loop
    insert into tareas (
      nombre,
      detalles,
      foto_requerida,
      area_trabajo_id,
      categoria_id,
      asignado_id,
      creado_por,
      estado,
      fecha_limite
    ) values (
      v_item.nombre,
      v_item.detalles,
      coalesce(v_item.foto_requerida, false),
      coalesce(v_item.area_trabajo_id, v_plantilla.area_trabajo_id),
      coalesce(v_item.categoria_id, v_plantilla.categoria_id),
      auth.uid(),
      auth.uid(),
      'Pendiente',
      current_date
    );
    v_count := v_count + 1;
  end loop;

  return json_build_object(
    'success', true,
    'plantilla', v_plantilla.nombre,
    'tareas_creadas', v_count
  );
end;
$$;

grant execute on function iniciar_rutina_voluntario(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 5. Lectura de plantillas y tareas activas para voluntarios (Asignado)
-- Permite que los voluntarios vean los perfiles activos para iniciar su jornada
-- ----------------------------------------------------------------------------

drop policy if exists "Asignado read active plantillas_perfil" on plantillas_perfil;
create policy "Asignado read active plantillas_perfil"
  on plantillas_perfil for select
  using (get_my_role() = 'Asignado' and activo = true);

drop policy if exists "Asignado read active plantilla_tareas" on plantilla_tareas;
create policy "Asignado read active plantilla_tareas"
  on plantilla_tareas for select
  using (
    get_my_role() = 'Asignado'
    and exists (
      select 1 from plantillas_perfil p
       where p.id = plantilla_tareas.plantilla_id and p.activo = true
    )
  );

-- ============================================================================
-- >>> migrations/configuracion_y_pool_reversible.sql
-- ============================================================================

-- ============================================================================
-- Migración 14: Ajustes de administración, y un pool que se puede deshacer
-- Admin-configurable settings, and a task pool whose claims are reversible
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requisitos previos: schema.sql y migraciones 1-13
--
-- ── Qué resuelve ──
--
-- 1. La bitácora de turno la leía CUALQUIER usuario activo, sin límite de
--    fecha ni de área. En un albergue para mujeres migrantes, esas notas son
--    texto libre sobre la operación del día: quién llegó, qué pasó en la
--    noche. Que se lean o no es una decisión de la dirección del albergue,
--    no una constante del código — así que se vuelve un ajuste, con su
--    advertencia en el momento de ampliarla.
--
-- 2. Reclamar una tarea del pool era IRREVERSIBLE para quien la reclamaba, y
--    la escondía de todos los demás: la política deja ver a un Asignado lo
--    suyo o lo que está sin asignar, así que en cuanto alguien toma una
--    tarea, desaparece del pool para el resto. Un pulgar que se equivoca
--    dejaba la tarea parqueada hasta que un Gestor lo notara.
--
-- The shift log was readable by every active user with no date or area
-- bound; whether that is right is the shelter's decision, not a constant.
-- And claiming a pooled task was irreversible for the claimer while hiding
-- it from everyone else.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Tabla de configuración
-- ----------------------------------------------------------------------------

create table if not exists configuracion (
  clave text primary key,
  valor text not null,
  descripcion text,
  actualizado_por uuid references usuarios(id) on delete set null,
  actualizado_en timestamptz default now() not null
);

alter table configuracion enable row level security;

-- Todos los usuarios activos LEEN: la aplicación necesita saber cómo
-- comportarse. Solo el Administrador ESCRIBE.
-- Everyone active reads (the app needs the settings); only Admin writes.
drop policy if exists "Activos leen configuracion" on configuracion;
create policy "Activos leen configuracion"
  on configuracion for select
  using (get_my_role() is not null);

drop policy if exists "Admin escribe configuracion" on configuracion;
create policy "Admin escribe configuracion"
  on configuracion for all
  using (get_my_role() = 'Administrador')
  with check (get_my_role() = 'Administrador');

/**
 * Lee un ajuste con respaldo.
 *
 * `security definer` a propósito: esta función se usa DENTRO de las políticas
 * de otras tablas. Si leyera `configuracion` con los permisos de quien
 * consulta, la política de bitácora dependería de la política de
 * configuración y se entraría en una recursión que PostgreSQL corta con un
 * error confuso a mitad de una consulta normal.
 *
 * SECURITY DEFINER on purpose: it is called from other tables' policies, so
 * it must not re-enter RLS.
 */
create or replace function get_config(p_clave text, p_default text default null)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select valor from configuracion where clave = p_clave), p_default);
$$;

grant execute on function get_config(text, text) to authenticated;

-- Valores iniciales. `on conflict do nothing` para que re-ejecutar la
-- migración no pise lo que la dirección ya haya decidido.
-- Re-running must never overwrite what the shelter already chose.
insert into configuracion (clave, valor, descripcion) values
  ('bitacora_alcance', 'todas',
   'Quién lee la bitácora: todas | area | propias. Coordinación siempre ve todo.'),
  ('bitacora_dias', '30',
   'Días hacia atrás visibles en la bitácora. 0 = sin límite.'),
  ('pool_tope_sin_empezar', '0',
   'Máximo de tareas tomadas del pool y aún sin empezar. 0 = sin tope.'),
  ('pool_dias_para_soltar', '1',
   'Días tras los cuales una tarea tomada y no empezada vuelve al pool. 0 = nunca.')
on conflict (clave) do nothing;


-- ----------------------------------------------------------------------------
-- 2. Marca de cuándo se reclamó una tarea
-- ----------------------------------------------------------------------------

/**
 * `reclamada_en` distingue dos cosas que hasta ahora se veían iguales: una
 * tarea que un Gestor asignó, y una que un voluntario tomó del pool.
 *
 * La distinción es la que hace segura la devolución automática: solo se
 * devuelve al pool lo que alguien tomó por su cuenta. Una tarea que la
 * coordinación asignó deliberadamente NUNCA se desasigna sola — eso sería
 * deshacer una decisión de otra persona mientras duerme.
 *
 * Tells apart a task a coordinator assigned from one a volunteer claimed.
 * Only the latter is ever auto-released.
 */
alter table tareas add column if not exists reclamada_en timestamptz;

create index if not exists idx_tareas_reclamada
  on tareas(asignado_id, estado) where reclamada_en is not null;


-- ----------------------------------------------------------------------------
-- 3. Bitácora: alcance y ventana, según configuración
-- ----------------------------------------------------------------------------

drop policy if exists "All authenticated read bitacora" on bitacora_turnos;
drop policy if exists "Read bitacora segun configuracion" on bitacora_turnos;

create policy "Read bitacora segun configuracion"
  on bitacora_turnos for select
  using (
    get_my_role() is not null
    and (
      -- Coordinación y dirección siempre ven todo: leer las novedades de
      -- todas las áreas es literalmente su trabajo.
      get_my_role() in ('Administrador', 'Gestor')

      or get_config('bitacora_alcance', 'todas') = 'todas'

      or (get_config('bitacora_alcance', 'todas') = 'propias'
          and usuario_id = auth.uid())

      -- «Mi área» se deduce de dónde trabaja la persona, sin pedirle al
      -- albergue que mantenga otro catálogo. Consecuencia deliberada: quien
      -- todavía no tiene ninguna tarea no ve notas de área. La pantalla de
      -- ajustes lo advierte.
      or (get_config('bitacora_alcance', 'todas') = 'area'
          and area_trabajo_id in (
            select t.area_trabajo_id from tareas t
             where t.asignado_id = auth.uid()
               and t.area_trabajo_id is not null
          ))
    )
    and (
      coalesce(nullif(get_config('bitacora_dias', '30'), ''), '0')::int = 0
      or fecha >= current_date
                  - (coalesce(nullif(get_config('bitacora_dias', '30'), ''), '0')::int)
    )
  );


-- ----------------------------------------------------------------------------
-- 4. Devolver al pool lo tomado y no empezado
-- ----------------------------------------------------------------------------

/**
 * Devolución automática, sin depender de un programador de tareas.
 *
 * Supabase puede correr `pg_cron`, pero atar una regla de operación a una
 * extensión que puede no estar habilitada en el proyecto del albergue es
 * construir una promesa que falla en silencio. En vez de eso, esta función
 * se llama cuando alguien abre el pool: quien va a tomar una tarea es
 * exactamente quien se beneficia de que lo abandonado ya esté libre.
 *
 * No cron: this runs when someone opens the pool — the person about to claim
 * is exactly the one who benefits from stale claims already being free.
 */
create or replace function liberar_reclamos_vencidos()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dias int;
  v_liberadas int;
begin
  v_dias := coalesce(nullif(get_config('pool_dias_para_soltar', '1'), ''), '0')::int;
  if v_dias <= 0 then
    return 0;
  end if;

  update tareas
     set asignado_id = null,
         reclamada_en = null
   where estado = 'Pendiente'
     and asignado_id is not null
     and reclamada_en is not null                       -- solo lo auto-tomado
     and reclamada_en < now() - (v_dias || ' days')::interval;

  get diagnostics v_liberadas = row_count;
  return v_liberadas;
end;
$$;

grant execute on function liberar_reclamos_vencidos() to authenticated;


/**
 * Soltar una tarea que tomé y no empecé.
 *
 * El inverso que le faltaba a reclamar. Sin esto, equivocarse de tarjeta con
 * el pulgar —en un teléfono, con una mano, que es el escenario de uso real—
 * solo lo podía deshacer un Gestor.
 *
 * Lo que NO se puede soltar es una tarea que la coordinación asignó
 * (`reclamada_en is null`): eso no es deshacer un error propio, es devolver
 * trabajo que alguien te dio, y esa conversación es con esa persona.
 *
 * The inverse of claiming. You cannot drop work a coordinator assigned you.
 */
create or replace function soltar_tarea(p_tarea_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tarea tareas%rowtype;
begin
  if get_my_role() is null then
    raise exception 'Debes tener una cuenta activa.' using errcode = 'PT015';
  end if;

  select * into v_tarea from tareas where id = p_tarea_id for update;

  if not found then
    raise exception 'La tarea no existe.' using errcode = 'PT016';
  end if;

  if v_tarea.asignado_id is distinct from auth.uid() then
    raise exception 'Esta tarea no es tuya.' using errcode = 'PT017';
  end if;

  if v_tarea.estado <> 'Pendiente' then
    raise exception 'Ya empezaste esta tarea. Habla con quien coordina si necesitas soltarla.'
      using errcode = 'PT018';
  end if;

  if v_tarea.reclamada_en is null then
    raise exception 'Esta tarea te la asignó quien coordina. Pídele a esa persona que la reasigne.'
      using errcode = 'PT019';
  end if;

  update tareas
     set asignado_id = null, reclamada_en = null
   where id = p_tarea_id
   returning * into v_tarea;

  return row_to_json(v_tarea);
end;
$$;

grant execute on function soltar_tarea(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 5. Reclamar: ahora deja marca, libera lo vencido y respeta el tope
-- ----------------------------------------------------------------------------

create or replace function reclamar_tarea_abierta(p_tarea_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tarea tareas%rowtype;
  v_tope int;
  v_parqueadas int;
begin
  if get_my_role() is null then
    raise exception 'Debes tener una cuenta activa para tomar una tarea.' using errcode = 'PT010';
  end if;

  -- Antes de nada, lo abandonado vuelve al pool.
  perform liberar_reclamos_vencidos();

  /*
   * El tope cuenta SOLO lo que la persona tomó por su cuenta y no ha
   * empezado. Contar también lo que le asignó la coordinación la castigaría
   * por una decisión que no es suya: si un Gestor te dio ocho tareas, eso no
   * es acaparar el pool.
   *
   * The cap counts only self-claimed, not-yet-started tasks.
   */
  v_tope := coalesce(nullif(get_config('pool_tope_sin_empezar', '0'), ''), '0')::int;
  if v_tope > 0 then
    select count(*) into v_parqueadas
      from tareas
     where asignado_id = auth.uid()
       and estado = 'Pendiente'
       and reclamada_en is not null;

    if v_parqueadas >= v_tope then
      raise exception 'Ya tienes % tarea(s) tomadas sin empezar. Empieza o suelta alguna antes de tomar otra.', v_parqueadas
        using errcode = 'PT014';
    end if;
  end if;

  select * into v_tarea from tareas where id = p_tarea_id for update;

  if not found then
    raise exception 'La tarea no existe.' using errcode = 'PT011';
  end if;

  if v_tarea.asignado_id is not null then
    raise exception 'Esta tarea ya fue tomada por otra persona.' using errcode = 'PT012';
  end if;

  if v_tarea.estado <> 'Pendiente' then
    raise exception 'Solo se pueden tomar tareas en estado Pendiente.' using errcode = 'PT013';
  end if;

  update tareas
     set asignado_id = auth.uid(),
         reclamada_en = now()
   where id = p_tarea_id
   returning * into v_tarea;

  return row_to_json(v_tarea);
end;
$$;

grant execute on function reclamar_tarea_abierta(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 6. Iniciar rutina: una vez por plantilla y por día
-- ----------------------------------------------------------------------------

/**
 * Guarda de idempotencia.
 *
 * El botón del modal ya está protegido con `disabled`, pero el principio
 * declarado de este proyecto es que la base de datos es la autoridad y que
 * ninguna regla depende de la buena fe del navegador. Un reintento de red,
 * un botón de atrás o dos aparatos abiertos bastaban para duplicar la
 * jornada entera de alguien.
 *
 * The modal already guards the double-tap, but this project's stated
 * principle is that the database is the authority.
 */
alter table tareas add column if not exists plantilla_id uuid
  references plantillas_perfil(id) on delete set null;

create index if not exists idx_tareas_plantilla
  on tareas(asignado_id, plantilla_id) where plantilla_id is not null;

create or replace function iniciar_rutina_voluntario(p_plantilla_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plantilla plantillas_perfil%rowtype;
  v_item record;
  v_count int := 0;
begin
  if get_my_role() is null then
    raise exception 'Debes tener una cuenta activa para iniciar una rutina.' using errcode = 'PT020';
  end if;

  select * into v_plantilla
    from plantillas_perfil
   where id = p_plantilla_id and activo = true;

  if not found then
    raise exception 'El perfil o rutina no existe o no está activo.' using errcode = 'PT021';
  end if;

  if exists (
    select 1 from tareas
     where asignado_id = auth.uid()
       and plantilla_id = p_plantilla_id
       and fecha_creacion >= current_date
  ) then
    raise exception 'Ya iniciaste esta rutina hoy. Tus tareas están en el tablero.'
      using errcode = 'PT022';
  end if;

  for v_item in (
    select * from plantilla_tareas
     where plantilla_id = p_plantilla_id
     order by orden asc, nombre asc
  ) loop
    insert into tareas (
      nombre, detalles, foto_requerida,
      area_trabajo_id, categoria_id,
      asignado_id, creado_por, estado, fecha_limite, plantilla_id
    ) values (
      v_item.nombre,
      v_item.detalles,
      coalesce(v_item.foto_requerida, false),
      coalesce(v_item.area_trabajo_id, v_plantilla.area_trabajo_id),
      coalesce(v_item.categoria_id, v_plantilla.categoria_id),
      auth.uid(), auth.uid(), 'Pendiente', current_date, p_plantilla_id
    );
    v_count := v_count + 1;
  end loop;

  return json_build_object(
    'success', true,
    'plantilla', v_plantilla.nombre,
    'tareas_creadas', v_count
  );
end;
$$;

grant execute on function iniciar_rutina_voluntario(uuid) to authenticated;


-- ============================================================================
-- Códigos de este proyecto que agrega esta migración:
--   PT014  tope de tareas tomadas sin empezar alcanzado
--   PT015  cuenta inactiva al soltar
--   PT016  la tarea a soltar no existe
--   PT017  la tarea a soltar no es tuya
--   PT018  la tarea a soltar ya se empezó
--   PT019  la tarea a soltar la asignó coordinación, no se tomó del pool
--   PT022  la rutina ya se inició hoy
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 7. El trigger de columnas debe conocer el pool
-- ----------------------------------------------------------------------------

/**
 * ── El defecto que arregla ──
 *
 * `reclamar_tarea_abierta` cambia `asignado_id`, y `restrict_asignado_update`
 * se lo prohíbe al rol Asignado (PT001) — que es exactamente el único rol que
 * usa el pool. La función es SECURITY DEFINER y por eso se salta RLS, pero
 * **los triggers siguen disparando**. Resultado: el pool rebotaba con «Solo
 * puedes cambiar el estado de la tarea y su evidencia» en el primer toque.
 *
 * Claiming changes `asignado_id`, which the trigger forbids for the very role
 * the pool exists for. SECURITY DEFINER skips RLS, not triggers.
 *
 * ── Por qué así y no con una bandera ──
 *
 * Lo fácil sería que la función encendiera un GUC y el trigger lo respetara.
 * Eso vuelve la regla dependiente de POR DÓNDE llegó la escritura, y el
 * principio de este proyecto es el contrario: la base de datos decide por lo
 * que se está haciendo, no por quién dice estar haciéndolo. Así que el
 * permiso se escribe como lo que es —dos transiciones concretas— y vale
 * igual si mañana la escritura llega por otro camino.
 *
 * A GUC flag would make the rule depend on HOW the write arrived. The two
 * transitions are written out instead, so the rule holds by any path.
 *
 * ── Lo que sigue prohibido ──
 *
 * Asignarle una tarea a otra persona, quitarle una tarea a alguien más, y
 * mover el sello `reclamada_en` por fuera de estas dos transiciones (que
 * serviría para esquivar la devolución automática).
 */
create or replace function restrict_asignado_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _evidencia text := nullif(trim(new.evidencia_url), '');
  _movimiento_de_pool boolean;
begin
  new.evidencia_url := _evidencia;

  if coalesce(get_my_role(), '') <> 'Asignado' then
    return new;
  end if;

  /*
   * Tomar del pool: de nadie a mí. Soltar: de mí a nadie.
   * En ambos casos la tarea sigue en Pendiente — tomar no es empezar.
   */
  _movimiento_de_pool :=
       (old.asignado_id is null      and new.asignado_id = auth.uid())
    or (old.asignado_id = auth.uid() and new.asignado_id is null);
  _movimiento_de_pool := _movimiento_de_pool
    and old.estado = 'Pendiente'
    and new.estado = 'Pendiente';

  -- ---- Bloqueo de columnas ---------------------------------------------
  if new.nombre           is distinct from old.nombre           or
     new.detalles         is distinct from old.detalles         or
     new.foto_requerida   is distinct from old.foto_requerida   or
     new.categoria_id     is distinct from old.categoria_id     or
     new.area_trabajo_id  is distinct from old.area_trabajo_id  or
     new.creado_por       is distinct from old.creado_por       or
     new.plantilla_id     is distinct from old.plantilla_id     or
     new.fecha_limite     is distinct from old.fecha_limite     or
     (not _movimiento_de_pool
      and (new.asignado_id  is distinct from old.asignado_id
        or new.reclamada_en is distinct from old.reclamada_en))
  then
    raise exception 'Solo puedes cambiar el estado de la tarea y su evidencia.'
      using errcode = 'PT001';
  end if;

  -- ---- H2: una tarea cerrada no se reabre desde este rol ----------------
  if old.estado = 'Hecho' and new.estado <> 'Hecho' then
    raise exception 'Una tarea marcada como Hecha solo la puede reabrir un Administrador o Gestor.'
      using errcode = 'PT002';
  end if;

  -- ---- H1: sin evidencia no hay cierre ----------------------------------
  if new.estado = 'Hecho'
     and old.estado is distinct from 'Hecho'
     and coalesce(new.foto_requerida, false)
     and _evidencia is null
  then
    raise exception 'Esta tarea requiere foto de evidencia para marcarse como Hecha.'
      using errcode = 'PT003';
  end if;

  -- ---- H3: la evidencia apunta a la propia tarea ------------------------
  if _evidencia is not null
     and _evidencia is distinct from old.evidencia_url
     and left(_evidencia, length(new.id::text) + 1) <> new.id::text || '/'
  then
    raise exception 'La evidencia debe pertenecer a esta tarea.'
      using errcode = 'PT004';
  end if;

  -- ---- H3 (segunda mitad): no se vacía la evidencia de una tarea cerrada -
  if old.estado = 'Hecho'
     and old.evidencia_url is not null
     and _evidencia is null
  then
    raise exception 'No se puede quitar la evidencia de una tarea ya cerrada.'
      using errcode = 'PT005';
  end if;

  return new;
end;
$$;
