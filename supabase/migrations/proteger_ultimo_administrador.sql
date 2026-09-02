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
