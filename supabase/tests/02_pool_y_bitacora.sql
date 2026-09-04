-- ============================================================================
-- Casos del pool reversible, el tope, la devolución automática y el alcance
-- de la bitácora.
--
--   psql -X -f supabase/tests/00_espejo.sql -f supabase/tests/02_pool_y_bitacora.sql
--
-- Corre como un rol SIN bypass de RLS, igual que 01_reglas_asignado.sql: una
-- política que solo se lee no está comprobada.
-- ============================================================================

\set ON_ERROR_STOP on
set client_min_messages = warning;

create temporary table resultados (
  n serial,
  caso text,
  esperado text,
  obtenido text,
  ok boolean
);

create or replace function registrar(p_caso text, p_esperado text, p_obtenido text)
returns void language plpgsql as $$
begin
  insert into resultados (caso, esperado, obtenido, ok)
  values (p_caso, p_esperado, p_obtenido, p_esperado = p_obtenido);
end;
$$;

-- `registrar` se queda SECURITY INVOKER a propósito, igual que los ayudantes
-- de 01: como DEFINER, la sentencia bajo prueba correría con privilegios del
-- dueño y se saltaría RLS, que es justo lo que se quiere comprobar. La
-- consecuencia es que escribe con la identidad de app_user, así que hay que
-- darle permiso explícito.
grant execute on function registrar(text, text, text) to app_user;
grant select, insert on resultados to app_user;
grant usage on sequence resultados_n_seq to app_user;

-- ---------------------------------------------------------------------------
-- Actores
-- ---------------------------------------------------------------------------

-- Igual que en 00_espejo.sql: se crean en auth.users y el trigger
-- on_auth_user_created levanta el perfil con rol 'Asignado'.
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ana@ejemplo.test'),
  ('00000000-0000-4000-8000-00000000000b', 'beto@ejemplo.test'),
  ('00000000-0000-4000-8000-00000000000c', 'coca@ejemplo.test');

update usuarios set nombre_completo = 'Ana Volunta'  where correo = 'ana@ejemplo.test';
update usuarios set nombre_completo = 'Beto Volunta' where correo = 'beto@ejemplo.test';
update usuarios set nombre_completo = 'Coca Gestora', rol = 'Gestor'
 where correo = 'coca@ejemplo.test';

insert into areas_trabajo (id, nombre) values
  ('00000000-0000-4000-8000-0000000000a1', 'Cocina de prueba'),
  ('00000000-0000-4000-8000-0000000000a2', 'Patio de prueba')
on conflict (id) do nothing;

-- Tres tareas libres en el pool, y una que la coordinación asignó a Ana.
insert into tareas (id, nombre, estado, asignado_id, area_trabajo_id) values
  ('00000000-0000-4000-8000-0000000000f1', 'Libre 1', 'Pendiente', null, '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000f2', 'Libre 2', 'Pendiente', null, '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000f3', 'Libre 3', 'Pendiente', null, '00000000-0000-4000-8000-0000000000a2'),
  ('00000000-0000-4000-8000-0000000000f9', 'Asignada por Coca', 'Pendiente',
     '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1')
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- 1. Reclamar deja marca y esconde la tarea del resto
-- ---------------------------------------------------------------------------

set demo.uid = '00000000-0000-4000-8000-00000000000a';
set role app_user;

do $$ begin perform reclamar_tarea_abierta('00000000-0000-4000-8000-0000000000f1'); end $$;

reset role;
set demo.uid = '';
select registrar(
  'Reclamar sella reclamada_en',
  'sellada',
  (select case when reclamada_en is not null then 'sellada' else 'sin sello' end
     from tareas where id = '00000000-0000-4000-8000-0000000000f1'));

-- Beto ya no debe verla en el pool
set demo.uid = '00000000-0000-4000-8000-00000000000b';
set role app_user;
select registrar(
  'Lo reclamado desaparece del pool de otro voluntario',
  '2',
  (select count(*)::text from tareas where asignado_id is null and estado = 'Pendiente'));
reset role;
set demo.uid = '';


-- ---------------------------------------------------------------------------
-- 2. Soltar: solo lo mío, solo sin empezar, solo lo que yo tomé
-- ---------------------------------------------------------------------------

-- Beto no puede soltar lo de Ana
set demo.uid = '00000000-0000-4000-8000-00000000000b';
set role app_user;
do $$
begin
  perform soltar_tarea('00000000-0000-4000-8000-0000000000f1');
  perform registrar('Soltar tarea ajena', 'PT017', 'no rebotó');
exception when others then
  perform registrar('Soltar tarea ajena', 'PT017', sqlstate);
end $$;
reset role;
set demo.uid = '';

-- Ana no puede soltar lo que le asignó la coordinación
set demo.uid = '00000000-0000-4000-8000-00000000000a';
set role app_user;
do $$
begin
  perform soltar_tarea('00000000-0000-4000-8000-0000000000f9');
  perform registrar('Soltar lo que asignó coordinación', 'PT019', 'no rebotó');
exception when others then
  perform registrar('Soltar lo que asignó coordinación', 'PT019', sqlstate);
end $$;

-- Ana sí puede soltar lo que ella tomó
do $$
begin
  perform soltar_tarea('00000000-0000-4000-8000-0000000000f1');
  perform registrar('Soltar lo propio sin empezar', 'ok', 'ok');
exception when others then
  perform registrar('Soltar lo propio sin empezar', 'ok', sqlstate);
end $$;
reset role;
set demo.uid = '';

select registrar(
  'Al soltar, vuelve al pool y se borra el sello',
  'libre',
  (select case when asignado_id is null and reclamada_en is null then 'libre' else 'sigue tomada' end
     from tareas where id = '00000000-0000-4000-8000-0000000000f1'));

-- No se puede soltar algo ya empezado
update tareas set asignado_id = '00000000-0000-4000-8000-00000000000a',
                  reclamada_en = now(), estado = 'En curso'
 where id = '00000000-0000-4000-8000-0000000000f2';

set demo.uid = '00000000-0000-4000-8000-00000000000a';
set role app_user;
do $$
begin
  perform soltar_tarea('00000000-0000-4000-8000-0000000000f2');
  perform registrar('Soltar algo ya empezado', 'PT018', 'no rebotó');
exception when others then
  perform registrar('Soltar algo ya empezado', 'PT018', sqlstate);
end $$;
reset role;
set demo.uid = '';

update tareas set asignado_id = null, reclamada_en = null, estado = 'Pendiente'
 where id = '00000000-0000-4000-8000-0000000000f2';


-- ---------------------------------------------------------------------------
-- 3. El tope: cuenta lo auto-tomado, ignora lo que asignó coordinación
-- ---------------------------------------------------------------------------

update configuracion set valor = '1' where clave = 'pool_tope_sin_empezar';

set demo.uid = '00000000-0000-4000-8000-00000000000a';
set role app_user;

-- Ana ya tiene una asignada por Coca (f9), que NO debe contar. Toma una:
do $$ begin perform reclamar_tarea_abierta('00000000-0000-4000-8000-0000000000f1'); end $$;

-- La segunda debe rebotar por el tope
do $$
begin
  perform reclamar_tarea_abierta('00000000-0000-4000-8000-0000000000f2');
  perform registrar('Tope de tomadas sin empezar', 'PT014', 'no rebotó');
exception when others then
  perform registrar('Tope de tomadas sin empezar', 'PT014', sqlstate);
end $$;
reset role;
set demo.uid = '';

select registrar(
  'El tope no contó la tarea que asignó coordinación',
  'una tomada',
  (select case when count(*) = 1 then 'una tomada' else count(*)::text end::text
     from tareas
    where asignado_id = '00000000-0000-4000-8000-00000000000a'
      and estado = 'Pendiente' and reclamada_en is not null));

update configuracion set valor = '0' where clave = 'pool_tope_sin_empezar';


-- ---------------------------------------------------------------------------
-- 4. Devolución automática: solo lo auto-tomado y vencido
-- ---------------------------------------------------------------------------

-- Se envejece el reclamo de Ana y también se le pone sello falso a la tarea
-- que asignó la coordinación, para comprobar que ESA no se libera.
update tareas set reclamada_en = now() - interval '5 days'
 where id = '00000000-0000-4000-8000-0000000000f1';

do $$ begin perform liberar_reclamos_vencidos(); end $$;

select registrar(
  'Lo tomado y abandonado vuelve al pool',
  'libre',
  (select case when asignado_id is null then 'libre' else 'sigue tomada' end
     from tareas where id = '00000000-0000-4000-8000-0000000000f1'));

select registrar(
  'Lo que asignó coordinación NUNCA se libera solo',
  'sigue asignada',
  (select case when asignado_id = '00000000-0000-4000-8000-00000000000a'
               then 'sigue asignada' else 'se soltó sola' end
     from tareas where id = '00000000-0000-4000-8000-0000000000f9'));

-- Con el ajuste en 0, la devolución automática se apaga
update configuracion set valor = '0' where clave = 'pool_dias_para_soltar';
update tareas set asignado_id = '00000000-0000-4000-8000-00000000000a',
                  reclamada_en = now() - interval '9 days'
 where id = '00000000-0000-4000-8000-0000000000f1';

select registrar(
  'Con pool_dias_para_soltar = 0 no se libera nada',
  '0',
  liberar_reclamos_vencidos()::text);

update configuracion set valor = '1' where clave = 'pool_dias_para_soltar';
update tareas set asignado_id = null, reclamada_en = null
 where id = '00000000-0000-4000-8000-0000000000f1';


-- ---------------------------------------------------------------------------
-- 5. Rutina: una sola vez por plantilla y por día
-- ---------------------------------------------------------------------------

insert into plantillas_perfil (id, nombre, activo, area_trabajo_id) values
  ('00000000-0000-4000-8000-0000000000c1', 'Rutina de cocina', true,
   '00000000-0000-4000-8000-0000000000a1')
on conflict (id) do nothing;

insert into plantilla_tareas (plantilla_id, nombre, orden) values
  ('00000000-0000-4000-8000-0000000000c1', 'Revisar despensa', 1),
  ('00000000-0000-4000-8000-0000000000c1', 'Limpiar campana', 2)
on conflict do nothing;

set demo.uid = '00000000-0000-4000-8000-00000000000b';
set role app_user;

do $$ begin perform iniciar_rutina_voluntario('00000000-0000-4000-8000-0000000000c1'); end $$;

do $$
begin
  perform iniciar_rutina_voluntario('00000000-0000-4000-8000-0000000000c1');
  perform registrar('Iniciar la misma rutina dos veces el mismo día', 'PT022', 'no rebotó');
exception when others then
  perform registrar('Iniciar la misma rutina dos veces el mismo día', 'PT022', sqlstate);
end $$;
reset role;
set demo.uid = '';

select registrar(
  'La rutina creó sus tareas una sola vez',
  '2',
  (select count(*)::text from tareas
    where asignado_id = '00000000-0000-4000-8000-00000000000b'
      and plantilla_id = '00000000-0000-4000-8000-0000000000c1'));


-- ---------------------------------------------------------------------------
-- 6. Bitácora: el alcance lo decide la configuración
-- ---------------------------------------------------------------------------

insert into bitacora_turnos (id, usuario_id, area_trabajo_id, mensaje, fecha) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000000a1', 'Nota de Ana en Cocina', current_date),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-00000000000c',
   '00000000-0000-4000-8000-0000000000a2', 'Nota de Coca en Patio', current_date),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-00000000000c',
   '00000000-0000-4000-8000-0000000000a1', 'Nota vieja', current_date - 90)
on conflict (id) do nothing;

-- alcance = todas, ventana 30 días → Beto ve las 2 recientes, no la vieja
update configuracion set valor = 'todas' where clave = 'bitacora_alcance';
update configuracion set valor = '30'    where clave = 'bitacora_dias';

set demo.uid = '00000000-0000-4000-8000-00000000000b';
set role app_user;
select registrar('Bitácora «todas» con ventana de 30 días', '2',
  (select count(*)::text from bitacora_turnos));
reset role;
set demo.uid = '';

-- ventana 0 = sin límite → también la vieja
update configuracion set valor = '0' where clave = 'bitacora_dias';
set demo.uid = '00000000-0000-4000-8000-00000000000b';
set role app_user;
select registrar('Bitácora con ventana 0 (sin límite)', '3',
  (select count(*)::text from bitacora_turnos));
reset role;
set demo.uid = '';

-- alcance = propias → Beto no escribió ninguna, no ve nada
update configuracion set valor = 'propias' where clave = 'bitacora_alcance';
set demo.uid = '00000000-0000-4000-8000-00000000000b';
set role app_user;
select registrar('Bitácora «propias»: Beto no ve las ajenas', '0',
  (select count(*)::text from bitacora_turnos));
reset role;
set demo.uid = '';

-- ...pero coordinación SIEMPRE ve todo, sin importar el ajuste
set demo.uid = '00000000-0000-4000-8000-00000000000c';
set role app_user;
select registrar('Coordinación ve todo aunque el alcance sea «propias»', '3',
  (select count(*)::text from bitacora_turnos));
reset role;
set demo.uid = '';

-- alcance = area → Ana ve las de Cocina (tiene tareas ahí), no la de Patio
update configuracion set valor = 'area' where clave = 'bitacora_alcance';
set demo.uid = '00000000-0000-4000-8000-00000000000a';
set role app_user;
select registrar('Bitácora «area»: solo donde la persona trabaja', '2',
  (select count(*)::text from bitacora_turnos));
reset role;
set demo.uid = '';

update configuracion set valor = 'todas' where clave = 'bitacora_alcance';
update configuracion set valor = '30'    where clave = 'bitacora_dias';


-- ---------------------------------------------------------------------------
-- 7. Solo el Administrador cambia la configuración
-- ---------------------------------------------------------------------------

set demo.uid = '00000000-0000-4000-8000-00000000000a';
set role app_user;
update configuracion set valor = 'propias' where clave = 'bitacora_alcance';
reset role;
set demo.uid = '';

select registrar(
  'Un Asignado no puede cambiar la configuración',
  'todas',
  (select valor from configuracion where clave = 'bitacora_alcance'));

set demo.uid = '00000000-0000-4000-8000-00000000000c';
set role app_user;
update configuracion set valor = 'propias' where clave = 'bitacora_alcance';
reset role;
set demo.uid = '';

select registrar(
  'Un Gestor tampoco puede cambiar la configuración',
  'todas',
  (select valor from configuracion where clave = 'bitacora_alcance'));


-- ---------------------------------------------------------------------------
-- Veredicto
-- ---------------------------------------------------------------------------

\echo ''
\echo '════════ Pool reversible, tope, devolución y bitácora ════════'
select n as "#", caso, esperado, obtenido,
       case when ok then '✔' else '✘ FALLA' end as v
  from resultados order by n;

do $$
declare v_fallas int;
begin
  select count(*) into v_fallas from resultados where not ok;
  if v_fallas > 0 then
    raise exception '% caso(s) fallaron. La regla que no se comprueba, no existe.', v_fallas;
  end if;
  raise notice 'Los % casos pasaron.', (select count(*) from resultados);
end $$;
