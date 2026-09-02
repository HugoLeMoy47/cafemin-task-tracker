-- ============================================================================
-- Suite de regresión: las reglas del rol Asignado
-- Regression suite for the Asignado role's rules
--
-- Corre DESPUÉS de 00_espejo.sql, que deja montadas las migraciones reales:
--   psql -X -f supabase/tests/00_espejo.sql -f supabase/tests/01_reglas_asignado.sql
--
-- Cada caso se ejecuta como `app_user`, un rol sin BYPASSRLS, haciéndose pasar
-- por una persona concreta. La suite termina con ERROR si algún caso falla, de
-- modo que sirve en un pipeline y no solo para leerla.
--
-- Los cuatro primeros son los ataques que la auditoría del 2 de septiembre de
-- 2026 reprodujo con éxito ANTES de reglas_cierre_asignado.sql. Ahora deben
-- rebotar. Los siguientes existen para que la corrección no se lleve por
-- delante el uso normal del producto: una regla de seguridad que rompe el flujo
-- de trabajo se acaba desactivando, y entonces no protege nada.
--
-- The last group exists so the fix does not break normal use: a security rule
-- that breaks the workflow gets switched off, and then it protects nothing.
-- ============================================================================

\set ON_ERROR_STOP on
\set QUIET on

create temporary table _resultados (
  n serial,
  grupo text,
  caso text,
  esperado text,
  obtenido text,
  veredicto text
);

-- ---------------------------------------------------------------------------
-- Ejecuta una sentencia y clasifica el desenlace.
--
--   'PTxxx'  el trigger la rechazó con ese código propio del proyecto
--   'OK'     se aplicó y tocó al menos una fila
--   'CERO'   se aplicó sin tocar ninguna fila — así es como RLS deniega un
--            UPDATE: filtrando, no lanzando error. Distinguirlo importa: un
--            'CERO' donde se esperaba 'OK' es una regla que rompió el flujo.
-- ---------------------------------------------------------------------------
create or replace function _probar(_grupo text, _caso text, _sql text, _espera text)
returns void language plpgsql as $$
declare
  _obtenido text;
  _filas int;
begin
  begin
    execute _sql;
    get diagnostics _filas = row_count;
    _obtenido := case when _filas > 0 then 'OK' else 'CERO' end;
  exception when others then
    _obtenido := sqlstate;
  end;

  insert into _resultados (grupo, caso, esperado, obtenido, veredicto)
  values (_grupo, _caso, _espera, _obtenido,
          case when _obtenido = _espera then 'PASA' else 'FALLA' end);
end;
$$;

/* Cuenta filas visibles bajo las políticas del rol actual. */
create or replace function _contar(_grupo text, _caso text, _sql text, _espera int)
returns void language plpgsql as $$
declare _n int;
begin
  execute _sql into _n;
  insert into _resultados (grupo, caso, esperado, obtenido, veredicto)
  values (_grupo, _caso, _espera::text, _n::text,
          case when _n = _espera then 'PASA' else 'FALLA' end);
end;
$$;

-- Los ayudantes se quedan SECURITY INVOKER a propósito: si fueran DEFINER, la
-- sentencia bajo prueba correría con los privilegios del dueño y se saltaría
-- RLS, que es justo lo que se quiere comprobar. Como consecuencia escriben la
-- bitácora con la identidad de app_user, así que hay que darle permiso.
-- The helpers stay SECURITY INVOKER on purpose: as DEFINER the statement under
-- test would bypass RLS — exactly what we are trying to exercise.
grant execute on function _probar(text, text, text, text) to app_user;
grant execute on function _contar(text, text, text, int) to app_user;
grant select, insert on _resultados to app_user;
grant usage on sequence _resultados_n_seq to app_user;


-- ---------------------------------------------------------------------------
-- Tareas de prueba. Se crean como Administrador, que es quien puede.
-- ---------------------------------------------------------------------------
set role app_user;
set demo.uid = '11111111-1111-1111-1111-111111111111';

insert into tareas (id, nombre, foto_requerida, asignado_id, estado, creado_por) values
  ('aaaa0001-0000-4000-8000-000000000001', 'Con foto obligatoria',   true,
   '22222222-2222-2222-2222-222222222222', 'En curso', '11111111-1111-1111-1111-111111111111'),
  ('aaaa0002-0000-4000-8000-000000000002', 'Sin foto obligatoria',   false,
   '22222222-2222-2222-2222-222222222222', 'En curso', '11111111-1111-1111-1111-111111111111'),
  ('aaaa0003-0000-4000-8000-000000000003', 'Ya cerrada con foto',    true,
   '22222222-2222-2222-2222-222222222222', 'En curso', '11111111-1111-1111-1111-111111111111'),
  ('aaaa0004-0000-4000-8000-000000000004', 'De otra persona',        false,
   '33333333-3333-3333-3333-333333333333', 'Pendiente', '11111111-1111-1111-1111-111111111111'),
  ('aaaa0005-0000-4000-8000-000000000005', 'Para cerrar con foto',   true,
   '22222222-2222-2222-2222-222222222222', 'En curso', '11111111-1111-1111-1111-111111111111'),
  ('aaaa0006-0000-4000-8000-000000000006', 'Admin cierra sin foto',  true,
   '22222222-2222-2222-2222-222222222222', 'En curso', '11111111-1111-1111-1111-111111111111');

-- Se deja una realmente cerrada y con evidencia, para los casos que la usan.
update tareas
   set estado = 'Hecho',
       evidencia_url = 'aaaa0003-0000-4000-8000-000000000003/foto.jpg'
 where id = 'aaaa0003-0000-4000-8000-000000000003';


-- ===========================================================================
-- GRUPO 1 — Los cuatro ataques reproducidos en la auditoría
-- ===========================================================================
set demo.uid = '22222222-2222-2222-2222-222222222222';   -- Asignado de Prueba

select _probar('Ataque', 'H1 · cerrar una tarea con foto obligatoria, sin evidencia',
  $$update tareas set estado = 'Hecho'
     where id = 'aaaa0001-0000-4000-8000-000000000001'$$, 'PT003');

select _probar('Ataque', 'H2 · reabrir una tarea ya cerrada',
  $$update tareas set estado = 'Pendiente'
     where id = 'aaaa0003-0000-4000-8000-000000000003'$$, 'PT002');

select _probar('Ataque', 'H3 · apuntar la evidencia a otra tarea',
  $$update tareas set evidencia_url = 'aaaa0004-0000-4000-8000-000000000004/robada.jpg'
     where id = 'aaaa0001-0000-4000-8000-000000000001'$$, 'PT004');

select _probar('Ataque', 'H3 · vaciar la evidencia de una tarea cerrada',
  $$update tareas set evidencia_url = null
     where id = 'aaaa0003-0000-4000-8000-000000000003'$$, 'PT005');

-- Variante: cadena vacía en vez de null. Es el mismo ataque con otra ropa, y
-- un `is not null` ingenuo lo dejaría pasar.
select _probar('Ataque', 'H3 · vaciar la evidencia usando cadena vacía',
  $$update tareas set evidencia_url = '   '
     where id = 'aaaa0003-0000-4000-8000-000000000003'$$, 'PT005');

-- Variante: prefijo que empieza igual pero es otra carpeta.
select _probar('Ataque', 'H3 · ruta con prefijo parecido pero ajena',
  $$update tareas set evidencia_url = 'aaaa0001-0000-4000-8000-000000000001-bis/x.jpg'
     where id = 'aaaa0001-0000-4000-8000-000000000001'$$, 'PT004');


-- ===========================================================================
-- GRUPO 2 — El uso normal del producto NO se rompió
-- ===========================================================================

select _probar('Uso normal', 'Asignado mueve su tarea a En curso',
  $$update tareas set estado = 'En curso'
     where id = 'aaaa0002-0000-4000-8000-000000000002'$$, 'OK');

select _probar('Uso normal', 'Asignado cierra una tarea que no pide foto',
  $$update tareas set estado = 'Hecho'
     where id = 'aaaa0002-0000-4000-8000-000000000002'$$, 'OK');

-- Así es exactamente como lo hace PhotoModal: estado y evidencia en la MISMA
-- sentencia. Si la regla exigiera la evidencia antes del cierre, este caso
-- fallaría y el producto quedaría inservible para el rol que más lo usa.
select _probar('Uso normal', 'Asignado cierra subiendo la foto en el mismo update',
  $$update tareas
       set estado = 'Hecho',
           evidencia_url = 'aaaa0005-0000-4000-8000-000000000005/foto.jpg'
     where id = 'aaaa0005-0000-4000-8000-000000000005'$$, 'OK');

set demo.uid = '11111111-1111-1111-1111-111111111111';   -- Administrador

select _probar('Uso normal', 'Administrador reabre una tarea cerrada',
  $$update tareas set estado = 'En curso'
     where id = 'aaaa0003-0000-4000-8000-000000000003'$$, 'OK');

-- Excepción de producto documentada en KanbanBoard.jsx: Admin y Gestor cierran
-- sin foto. Se fija aquí para que quede claro que es una decisión, no un olvido.
select _probar('Uso normal', 'Administrador cierra sin foto (excepción documentada)',
  $$update tareas set estado = 'Hecho'
     where id = 'aaaa0006-0000-4000-8000-000000000006'$$, 'OK');


-- ===========================================================================
-- GRUPO 3 — Los controles que ya existían siguen aguantando
-- ===========================================================================
set demo.uid = '22222222-2222-2222-2222-222222222222';   -- Asignado de Prueba

select _probar('Control previo', 'No puede reasignarse una tarea ajena',
  $$update tareas set asignado_id = '22222222-2222-2222-2222-222222222222'
     where id = 'aaaa0004-0000-4000-8000-000000000004'$$, 'CERO');

select _probar('Control previo', 'No puede renombrar su propia tarea',
  $$update tareas set nombre = 'renombrada'
     where id = 'aaaa0001-0000-4000-8000-000000000001'$$, 'PT001');

select _probar('Control previo', 'No puede ascenderse a Administrador',
  $$update usuarios set rol = 'Administrador'
     where id = '22222222-2222-2222-2222-222222222222'$$, 'CERO');

select _contar('Control previo', 'No ve tareas ajenas',
  $$select count(*)::int from tareas
     where id = 'aaaa0004-0000-4000-8000-000000000004'$$, 0);

select _contar('Control previo', 'Solo ve su propia fila del directorio',
  $$select count(*)::int from usuarios$$, 1);

set demo.uid = '11111111-1111-1111-1111-111111111111';
select _contar('Control previo', 'El Administrador sí ve a todo el personal',
  $$select count(*)::int from usuarios$$, 3);


-- ===========================================================================
-- GRUPO 3b — La organización no se queda sin Administrador
--
-- El caso de "no se puede" es el obvio. El de "el penúltimo SÍ se puede" es el
-- que suele faltar, y es el que separa una regla útil de un estorbo que
-- alguien acabará desactivando.
-- ===========================================================================
set demo.uid = '11111111-1111-1111-1111-111111111111';   -- el único Administrador

select _probar('Último Admin', 'No se puede degradar al último Administrador',
  $$update usuarios set rol = 'Gestor'
     where id = '11111111-1111-1111-1111-111111111111'$$, 'PT006');

-- Desde `desactivacion_de_usuarios.sql` ya no existe política de DELETE sobre
-- `usuarios`, así que el borrado no llega ni al trigger: RLS lo filtra y no
-- toca ninguna fila. La protección se cumple por una vía distinta, y el caso se
-- deja para que se note si alguien vuelve a abrir ese camino.
-- The DELETE policy is gone, so RLS filters it before the trigger ever runs.
select _probar('Último Admin', 'El borrado de perfiles ya no existe como camino',
  $$delete from usuarios
     where id = '11111111-1111-1111-1111-111111111111'$$, 'CERO');

-- Ahora hay dos. La regla debe dejar de estorbar.
select _probar('Último Admin', 'Se puede nombrar a un segundo Administrador',
  $$update usuarios set rol = 'Administrador'
     where id = '33333333-3333-3333-3333-333333333333'$$, 'OK');

select _probar('Último Admin', 'Con dos, sí se puede degradar a uno',
  $$update usuarios set rol = 'Gestor'
     where id = '11111111-1111-1111-1111-111111111111'$$, 'OK');

-- Y con uno solo otra vez, vuelve a proteger.
set demo.uid = '33333333-3333-3333-3333-333333333333';   -- el que quedó
select _probar('Último Admin', 'Vuelve a proteger cuando queda uno solo',
  $$update usuarios set rol = 'Asignado'
     where id = '33333333-3333-3333-3333-333333333333'$$, 'PT006');

-- Cambiar otra cosa de un Administrador no debe activar la regla.
select _probar('Último Admin', 'Editar otro campo del Administrador no estorba',
  $$update usuarios set nombre_completo = 'Nombre Nuevo'
     where id = '33333333-3333-3333-3333-333333333333'$$, 'OK');

-- Se restaura el estado para no arrastrar efectos al grupo siguiente.
update usuarios set rol = 'Administrador'
 where id = '11111111-1111-1111-1111-111111111111';


-- ===========================================================================
-- GRUPO 3c — Desactivar el acceso de verdad (H13)
--
-- Lo que se prueba aquí no es "el botón funciona", sino las tres cosas que lo
-- hacen distinto de un borrado: que el acceso se corta en la base y no solo en
-- la interfaz, que la HISTORIA se conserva, y que la puerta no se puede abrir
-- desde un rol que no debe.
-- ===========================================================================

-- Quién puede llamar a la función.
set demo.uid = '22222222-2222-2222-2222-222222222222';   -- Asignado
select _probar('Desactivación', 'Un Asignado no puede desactivar a nadie',
  $$select desactivar_usuario('33333333-3333-3333-3333-333333333333')$$, 'PT007');

set demo.uid = '11111111-1111-1111-1111-111111111111';   -- Administrador
select _probar('Desactivación', 'El Administrador no puede desactivarse a sí mismo',
  $$select desactivar_usuario('11111111-1111-1111-1111-111111111111')$$, 'PT008');

select _probar('Desactivación', 'Un id inexistente da un error claro',
  $$select desactivar_usuario('99999999-9999-9999-9999-999999999999')$$, 'PT009');

select _probar('Desactivación', 'El Administrador sí puede desactivar a alguien',
  $$select desactivar_usuario('22222222-2222-2222-2222-222222222222')$$, 'OK');

-- El efecto en la base, no en la pantalla.
select _contar('Desactivación', 'La marca quedó puesta',
  $$select count(*)::int from usuarios
     where id = '22222222-2222-2222-2222-222222222222' and not activo$$, 1);

reset role;
select _contar('Desactivación', 'La cuenta quedó baneada en Auth',
  $$select count(*)::int from auth.users
     where id = '22222222-2222-2222-2222-222222222222' and banned_until > now()$$, 1);

-- LA PRUEBA QUE JUSTIFICA TODO EL CAMBIO: la historia sobrevive.
-- Con el borrado anterior, estas tareas se quedaban sin asignado en silencio.
select _contar('Desactivación', 'Sus tareas CONSERVAN a quién estaban asignadas',
  $$select count(*)::int from tareas
     where asignado_id = '22222222-2222-2222-2222-222222222222'$$, 5);

-- Y la persona desactivada deja de ver el sistema, aunque tenga sesión válida.
set role app_user;
set demo.uid = '22222222-2222-2222-2222-222222222222';
select _contar('Desactivación', 'Ya no tiene rol', $$select count(get_my_role())::int$$, 0);
select _contar('Desactivación', 'Ya no ve ninguna tarea', $$select count(*)::int from tareas$$, 0);
-- Sí sigue viendo SU PROPIA fila, y es a propósito: la política "Read own
-- usuario" no mira `activo`, y gracias a eso App.jsx puede leer el perfil y
-- explicarle que su acceso fue desactivado en vez de mostrarle una pantalla
-- rota. No hay fuga: son sus propios datos.
-- Deliberate: it lets the app explain the situation instead of breaking.
select _contar('Desactivación', 'Sigue viendo su propia fila, para poder explicárselo',
  $$select count(*)::int from usuarios$$, 1);

select _probar('Desactivación', 'Desactivada, tampoco puede reactivarse sola',
  $$select reactivar_usuario('22222222-2222-2222-2222-222222222222')$$, 'PT007');

-- Reactivar devuelve todo.
set demo.uid = '11111111-1111-1111-1111-111111111111';
select _probar('Desactivación', 'El Administrador puede reactivar',
  $$select reactivar_usuario('22222222-2222-2222-2222-222222222222')$$, 'OK');

reset role;
select _contar('Desactivación', 'El baneo de Auth se levantó',
  $$select count(*)::int from auth.users
     where id = '22222222-2222-2222-2222-222222222222'
       and (banned_until is null or banned_until <= now())$$, 1);

set role app_user;
set demo.uid = '22222222-2222-2222-2222-222222222222';
select _contar('Desactivación', 'Vuelve a ver sus tareas',
  $$select count(*)::int from tareas$$, 5);

-- No se puede dejar el sistema sin Administrador ACTIVO.
set demo.uid = '11111111-1111-1111-1111-111111111111';
select _probar('Desactivación', 'Nombrar a un segundo Administrador',
  $$update usuarios set rol = 'Administrador'
     where id = '33333333-3333-3333-3333-333333333333'$$, 'OK');
select _probar('Desactivación', 'Desactivar a un Administrador cuando hay dos',
  $$select desactivar_usuario('33333333-3333-3333-3333-333333333333')$$, 'OK');
select _probar('Desactivación', 'Con uno activo, ya no se puede degradar',
  $$update usuarios set rol = 'Gestor'
     where id = '11111111-1111-1111-1111-111111111111'$$, 'PT006');

-- Y el borrado ya no existe como camino.
select _probar('Desactivación', 'Ya no se puede borrar un perfil desde la app',
  $$delete from usuarios where id = '33333333-3333-3333-3333-333333333333'$$, 'CERO');

-- Se restaura para el grupo siguiente.
select reactivar_usuario('33333333-3333-3333-3333-333333333333');
update usuarios set rol = 'Asignado' where id = '33333333-3333-3333-3333-333333333333';


-- ===========================================================================
-- GRUPO 4 — Higiene de las funciones SECURITY DEFINER
--
-- El Security Advisor de Supabase marca "Function Search Path Mutable". Se
-- comprueba aquí para no depender de acordarse de mirar el panel.
-- ===========================================================================
reset role;

insert into _resultados (grupo, caso, esperado, obtenido, veredicto)
select 'Higiene',
       'search_path fijo en ' || p.proname || '()',
       'fijo',
       case when p.proconfig is null then 'MUTABLE'
            else 'fijo' end,
       case when p.proconfig is null then 'FALLA' else 'PASA' end
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef
 order by p.proname;


-- ===========================================================================
-- VEREDICTO
-- ===========================================================================
\set QUIET off
\pset border 2

select n, grupo, caso, esperado, obtenido, veredicto from _resultados order by n;

select count(*) filter (where veredicto = 'PASA')  as pasan,
       count(*) filter (where veredicto = 'FALLA') as fallan,
       count(*)                                     as total
  from _resultados;

do $$
declare _fallas int;
begin
  select count(*) into _fallas from _resultados where veredicto = 'FALLA';
  if _fallas > 0 then
    raise exception 'La suite falló en % caso(s). Revisa la tabla de arriba.', _fallas;
  end if;
  raise notice 'Suite completa: todos los casos pasan.';
end $$;
