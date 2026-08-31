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
