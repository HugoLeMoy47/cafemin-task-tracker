-- ¿Qué migraciones de endurecimiento están aplicadas en esta base?
-- Which hardening migrations are applied to this database?
--
-- Pégala en el SQL Editor de Supabase y córrela contra el proyecto REAL.
-- Es de solo lectura: consulta el catálogo del sistema y no modifica nada.
-- Paste into the Supabase SQL Editor. Read-only: it inspects the catalog.
--
-- ── Por qué existe ──
--
-- Supabase no lleva registro de qué archivo de `supabase/migrations/` se
-- ejecutó: el editor de SQL corre texto suelto y no deja rastro. Así que la
-- única forma honesta de saber si una migración está aplicada es preguntarle a
-- la base por el objeto que esa migración crea. Eso es lo que hace cada fila.
--
-- Supabase keeps no record of which migration file was run — the SQL editor
-- executes loose text. The only honest check is to ask the database for the
-- object each migration creates.
--
-- ── Cómo leerla ──
--
-- Las cuatro migraciones de abajo son las de las rondas de seguridad y hay que
-- correrlas EN ORDEN (8 → 9 → 10 → 11): la 11 redefine una función que crea la
-- 10. Las cuatro son re-ejecutables —comprobado corriéndolas dos veces contra
-- el espejo de `00_espejo.sql`—, así que ante la duda es más barato volver a
-- correr una que dejarla sin correr.
--
-- Run them in order (8 → 9 → 10 → 11): #11 redefines a function #10 creates.
-- All four are safe to re-run (verified by running them twice against the
-- mirror), so when in doubt, re-running costs less than skipping.
--
-- Las siete primeras no se listan porque sin ellas la aplicación no arranca:
-- si puedes entrar y ver el tablero, están.
-- The first seven are not listed: without them the app does not start at all.

select n as "#", migracion as "archivo", case when aplicada then '✅ aplicada' else '❌ PENDIENTE' end as "estado"
from (
  -- Detectada por el código de error PT005, que solo existe en esta versión de
  -- la función: `restrict_asignado_update` ya existía antes, así que preguntar
  -- solo por su nombre daría un falso positivo.
  -- Detected by PT005: the function already existed, so checking the name alone
  -- would be a false positive.
  select 8 as n, 'reglas_cierre_asignado.sql' as migracion,
         exists (
           select 1 from pg_proc
           where proname = 'restrict_asignado_update' and prosrc like '%PT005%'
         ) as aplicada

  union all

  -- Aquí lo que cambia no es el cuerpo sino el `search_path` fijado en la
  -- función, que es justo el arreglo. Por eso se mira `proconfig`.
  -- What changes is the pinned search_path, which is the fix itself.
  select 9, 'search_path_handle_new_user.sql',
         exists (
           select 1 from pg_proc
           where proname = 'handle_new_user' and proconfig::text like '%search_path%'
         )

  union all

  select 10, 'proteger_ultimo_administrador.sql',
         exists (select 1 from pg_trigger where tgname = 'trg_proteger_ultimo_administrador')

  union all

  -- Dos comprobaciones con `and`: la columna sin las funciones dejaría la
  -- desactivación a medias, que es peor que no tenerla, porque la pantalla
  -- diría que funciona.
  -- Both must hold: the column without the functions is a half-applied state
  -- that looks like it works.
  select 11, 'desactivacion_de_usuarios.sql',
         exists (select 1 from pg_proc where proname = 'desactivar_usuario')
         and exists (
           select 1 from information_schema.columns
           where table_name = 'usuarios' and column_name = 'activo'
         )

  union all

  select 12, 'plantillas_perfil.sql',
         exists (
           select 1 from information_schema.tables
           where table_schema = 'public' and table_name = 'plantillas_perfil'
         )
         and exists (
           select 1 from information_schema.tables
           where table_schema = 'public' and table_name = 'plantilla_tareas'
         )

  union all

  select 13, 'autonomia_y_bitacora_turno.sql',
         exists (
           select 1 from information_schema.tables
           where table_schema = 'public' and table_name = 'bitacora_turnos'
         )
         and exists (
           select 1 from pg_proc
           where proname = 'reclamar_tarea_abierta'
         )
         and exists (
           select 1 from pg_proc
           where proname = 'iniciar_rutina_voluntario'
         )

  union all

  -- Detectada por la tabla de ajustes Y por el sello `reclamada_en`: la tabla
  -- sola no prueba que el trigger sepa del pool, que es la mitad que arregla
  -- el defecto por el que el pool rebotaba con PT001.
  select 14, 'configuracion_y_pool_reversible.sql',
         exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'configuracion')
         and exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'tareas'
                       and column_name = 'reclamada_en')
         and exists (select 1 from pg_proc where proname = 'soltar_tarea')
) t
order by n;
