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
