-- ============================================================================
-- Migración: las reglas de cierre dejan de vivir solo en el navegador
-- Task-closing rules move from the browser into the database
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requisitos previos: schema.sql, security_rls_and_stability.sql,
--                     add_fecha_inicio.sql y hardening_rls_demo_publica.sql
--
-- ⚠️ NO requiere cambios de código. El cliente ya se comporta así; esta
--    migración solo hace que la base exija lo mismo que la interfaz pedía.
--    Se puede aplicar antes o después de cualquier despliegue.
--    No coupled code changes: the client already behaves this way.
--
-- ----------------------------------------------------------------------------
-- POR QUÉ
--
-- Auditoría del 2 de septiembre de 2026. Reproducido contra PostgreSQL 16 con
-- las políticas reales y un rol sin BYPASSRLS, haciéndose pasar por un
-- Asignado. Los tres agujeros salen de lo mismo: el rol Asignado tiene
-- escritura incondicional sobre `estado` y `evidencia_url`, y todo el criterio
-- de qué valores son legítimos estaba en KanbanBoard.jsx.
--
--   H1  Cerró una tarea con foto_requerida = true y evidencia nula.
--       La promesa del producto —que un cierre deja rastro verificable— era
--       una cortesía de la interfaz.
--
--   H2  Movió una tarea de 'Hecho' a 'Pendiente'. El trigger de marcas de
--       tiempo puso la fecha de cierre en nulo al hacerlo, así que el efecto
--       no es solo saltarse una regla: BORRA el registro de que la tarea
--       estuvo cerrada, sin dejar huella, y de paso corrompe las métricas del
--       reporte.
--
--   H3  Apuntó `evidencia_url` a la carpeta de otra tarea —reciclando una
--       misma foto para cerrar varias— y la vació después de haber cerrado.
--       El bucket ya acotaba bien quién puede LEER un archivo; nadie acotaba
--       qué se puede ESCRIBIR en la columna que dice cuál es.
--
-- Lo que esta migración NO cambia, a propósito: Administrador y Gestor siguen
-- pudiendo reabrir tareas y cerrar sin foto. Es la decisión de producto que ya
-- estaba tomada (KanbanBoard.jsx:290-295) y una corrección de seguridad no es
-- el lugar para revertirla en silencio.
-- Admin and Gestor keep both bypasses on purpose: that product decision was
-- already made, and a security fix is not the place to quietly reverse it.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Las tres reglas, dentro de la función que ya gobierna al rol Asignado
--
-- Se amplía `restrict_asignado_update` en vez de agregar un cuarto trigger
-- BEFORE UPDATE. Con varios, el orden de disparo depende del nombre, que es la
-- dependencia frágil que `add_fecha_inicio.sql` se esforzó en quitar.
--
-- El nombre se queda como está aunque la función ya haga más que restringir
-- columnas: `add_fecha_inicio.sql` la busca por nombre en pg_proc para su
-- guarda de seguridad, y renombrarla dejaría esa guarda buscando un objeto que
-- no existe — es decir, callada para siempre.
--
-- ⚠️ ESA GUARDA TAMBIÉN PROHÍBE que el texto de esta función mencione la
--    columna de marca de inicio: si aparece, `add_fecha_inicio.sql` aborta al
--    re-ejecutarse. Por eso aquí no se nombra en ningún comentario.
--    That guard forbids this function's source from naming the start-stamp
--    column, so it is not mentioned anywhere below.
--
-- Sobre el orden con `trg_marcas_de_tiempo` (que dispara antes, por nombre):
-- esa función escribe `fecha_hecho`, y ninguna de las reglas de abajo la lee.
-- Las tres miran `estado`, `foto_requerida` y `evidencia_url`, que nadie más
-- toca. El orden es indiferente aquí, pero conviene saberlo antes de agregar
-- una regla que sí dependa de una marca de tiempo.
--
-- Sobre `get_my_role()` nula: devuelve null para service_role y para procesos
-- sin sesión, así que la comparación con 'Asignado' es falsa y las reglas se
-- saltan. Es lo que se quiere: las semillas y los scripts de administración no
-- deben chocar contra reglas pensadas para una persona usando la aplicación.
-- get_my_role() is null for service_role, so seeds and admin scripts skip
-- these rules — which is the intent.
--
-- Se fija `search_path`: la función es SECURITY DEFINER y estaba en la lista
-- de "Function Search Path Mutable" del Security Advisor. Como de todos modos
-- se reescribe, dejarla mutable sería enviar a sabiendas un hueco conocido.
-- Queda pendiente `handle_new_user()`, que se atiende aparte.
-- ----------------------------------------------------------------------------

create or replace function restrict_asignado_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- Una evidencia en blanco es una evidencia ausente. Normalizarlo aquí, una
  -- vez, evita que cada regla de abajo tenga que acordarse — y que un
  -- `is not null` ingenuo deje pasar tres espacios. Además se escribe de vuelta
  -- a la fila, para que la columna no guarde nunca una cadena vacía y el resto
  -- del sistema pueda confiar en `is null`.
  -- Blank evidence is absent evidence: normalized once, and written back so the
  -- column never stores an empty string.
  _evidencia text := nullif(trim(new.evidencia_url), '');
begin
  new.evidencia_url := _evidencia;

  if get_my_role() <> 'Asignado' then
    return new;
  end if;

  -- ---- Bloqueo de columnas (ya existía) --------------------------------
  if new.nombre           is distinct from old.nombre           or
     new.detalles         is distinct from old.detalles         or
     new.foto_requerida   is distinct from old.foto_requerida   or
     new.asignado_id      is distinct from old.asignado_id      or
     new.categoria_id     is distinct from old.categoria_id     or
     new.area_trabajo_id  is distinct from old.area_trabajo_id  or
     new.creado_por       is distinct from old.creado_por       or
     new.fecha_limite     is distinct from old.fecha_limite
  then
    raise exception 'Solo puedes cambiar el estado de la tarea y su evidencia.'
      using errcode = 'PT001';
  end if;

  -- ---- H2: una tarea cerrada no se reabre desde este rol ----------------
  -- Reabrir borra la fecha de cierre. Quien cierra no debe poder deshacer el
  -- registro de que cerró; para eso está el Administrador.
  if old.estado = 'Hecho' and new.estado <> 'Hecho' then
    raise exception 'Una tarea marcada como Hecha solo la puede reabrir un Administrador o Gestor.'
      using errcode = 'PT002';
  end if;

  -- ---- H1: sin evidencia no hay cierre ----------------------------------
  -- Se compara contra `new` porque el bloqueo de arriba ya garantiza que
  -- foto_requerida no cambió en esta misma actualización.
  if new.estado = 'Hecho'
     and old.estado is distinct from 'Hecho'
     and coalesce(new.foto_requerida, false)
     and _evidencia is null
  then
    raise exception 'Esta tarea requiere foto de evidencia para marcarse como Hecha.'
      using errcode = 'PT003';
  end if;

  -- ---- H3: la evidencia apunta a la propia tarea ------------------------
  -- La ruta es '{id_de_tarea}/{marca}.{ext}' y las políticas del bucket usan
  -- ese primer segmento para decidir quién lee el archivo. Si la columna puede
  -- apuntar a cualquier lado, esa comprobación deja de significar algo.
  --
  -- Solo se valida cuando el valor CAMBIA: las filas anteriores a la migración
  -- del bucket privado pueden traer una URL completa, y no hay por qué
  -- bloquear a alguien por historia que no escribió.
  -- Vaciarla no es asunto de esta regla, sino de la siguiente: quien manda tres
  -- espacios está borrando, no apuntando a otro lado, y merece ese mensaje.
  -- Clearing is the next rule's business, not this one's.
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


-- ----------------------------------------------------------------------------
-- El trigger ya existe desde security_rls_and_stability.sql y apunta a esta
-- misma función por nombre, así que `create or replace` basta. Se recrea solo
-- si falta, para que la migración también sirva en una base recién levantada.
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgname = 'trg_restrict_asignado_update'
       and tgrelid = 'public.tareas'::regclass
  ) then
    create trigger trg_restrict_asignado_update
      before update on tareas
      for each row execute function restrict_asignado_update();
  end if;
end $$;


-- ============================================================================
-- CÓMO VERIFICAR
--
-- Automático: `supabase/tests/` levanta un espejo de PostgreSQL con estas
-- mismas políticas y ejecuta los cuatro ataques más los cinco controles que
-- deben aguantar, con veredicto por caso. Ver `supabase/tests/README.md`.
--
-- A mano, entrando con una cuenta Asignado:
--
--   1. Arrastrar a Hecho una tarea con foto requerida: debe seguir pidiendo la
--      foto, y ahora también fallaría si alguien saltara la interfaz.
--   2. Arrastrar hacia atrás una tarea en Hecho: la interfaz ya lo impedía;
--      ahora la base también.
--   3. Con Administrador, reabrir una tarea: debe seguir funcionando.
--   4. Con Administrador, cerrar sin foto una tarea con foto requerida: debe
--      seguir funcionando (es la excepción documentada).
--
-- Los códigos PT001–PT005 son propios de este proyecto. Sirven para que la
-- capa de mensajes de error del cliente los traduzca sin adivinar por texto.
--
-- ROLLBACK — devuelve la función a su versión anterior (solo bloqueo de
-- columnas). Deja de nuevo abiertos H1, H2 y H3:
--
--   create or replace function restrict_asignado_update()
--   returns trigger as $f$
--   begin
--     if get_my_role() = 'Asignado' then
--       if new.nombre           is distinct from old.nombre           or
--          new.detalles         is distinct from old.detalles         or
--          new.foto_requerida   is distinct from old.foto_requerida   or
--          new.asignado_id      is distinct from old.asignado_id      or
--          new.categoria_id     is distinct from old.categoria_id     or
--          new.area_trabajo_id  is distinct from old.area_trabajo_id  or
--          new.creado_por       is distinct from old.creado_por       or
--          new.fecha_limite     is distinct from old.fecha_limite
--       then
--         raise exception 'Asignado solo puede actualizar estado y evidencia_url';
--       end if;
--     end if;
--     return new;
--   end; $f$ language plpgsql security definer;
-- ============================================================================
