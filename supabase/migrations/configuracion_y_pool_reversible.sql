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
