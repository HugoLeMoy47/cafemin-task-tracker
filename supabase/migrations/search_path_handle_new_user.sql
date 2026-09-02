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
