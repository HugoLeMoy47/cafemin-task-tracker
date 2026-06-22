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

create trigger trg_restrict_asignado_update
  before update on tareas
  for each row execute function restrict_asignado_update();
