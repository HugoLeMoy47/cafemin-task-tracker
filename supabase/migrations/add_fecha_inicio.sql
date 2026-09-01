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
