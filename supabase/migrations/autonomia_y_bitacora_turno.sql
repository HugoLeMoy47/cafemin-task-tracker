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

-- Todos los autenticados leen las notas para coordinar la operación
create policy "All authenticated read bitacora"
  on bitacora_turnos for select
  using (auth.uid() is not null);

-- Cualquier voluntario o gestor autenticado puede dejar novedades
create policy "Authenticated insert bitacora"
  on bitacora_turnos for insert
  with check (auth.uid() is not null);

-- Solo el autor o un Administrador pueden eliminar una nota
create policy "Author or Admin delete bitacora"
  on bitacora_turnos for delete
  using (get_my_role() = 'Administrador' or usuario_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 2. Tareas Abiertas: Asignado puede ver tareas sin asignar en estado Pendiente
-- ----------------------------------------------------------------------------

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
  if auth.uid() is null then
    raise exception 'Debes haber iniciado sesión para tomar una tarea.' using errcode = 'PT010';
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
  if auth.uid() is null then
    raise exception 'Debes haber iniciado sesión para iniciar una rutina.' using errcode = 'PT020';
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
