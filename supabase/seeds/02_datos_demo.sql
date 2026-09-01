-- ============================================================================
-- Semilla 2 de 2: catálogos y ~90 tareas de demostración
-- Demo data: catalogs and ~90 tasks
--
-- Requisito previo: haber corrido 01_cuentas_demo.sql (si faltan cuentas, este
-- script se detiene con un mensaje claro en vez de sembrar datos a medias).
--
-- RE-EJECUTABLE. Córrelo antes de cada sesión de demostración: borra solo las
-- tareas sembradas por él y las vuelve a generar con fechas frescas.
--
-- Por qué importa: todas las fechas son RELATIVAS a now(). Si estuvieran
-- escritas como fechas fijas, a mitad de tus dos semanas de presentaciones el
-- tablero mostraría tareas "vencidas hace once días" y ninguna próxima. Así el
-- dataset se ve recién usado cada vez que lo corres.
--
-- All dates are RELATIVE to now(), so the board looks freshly used every time
-- you re-run this instead of decaying over the demo window.
--
-- Las tareas sembradas llevan un id con prefijo 'cafede00-', así que el borrado
-- es quirúrgico: NO toca ninguna tarea que se haya creado en vivo durante una
-- demostración anterior ni ningún dato ajeno.
-- Seeded tasks use a 'cafede00-' id prefix, so the reset is surgical.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Catálogos (idempotente)
-- ----------------------------------------------------------------------------

insert into areas_trabajo (nombre) values
  ('Cocina'), ('Comedor'), ('Dormitorios'), ('Baños'), ('Lavandería'),
  ('Almacén'), ('Ludoteca'), ('Enfermería'), ('Oficinas'), ('Patio')
on conflict (nombre) do nothing;

insert into categorias (nombre) values
  ('Limpieza'), ('Mantenimiento'), ('Educación'), ('Legal'),
  ('Acompañamiento'), ('Salud'), ('Donativos'), ('Administrativa')
on conflict (nombre) do nothing;


-- ----------------------------------------------------------------------------
-- 2. Reinicio quirúrgico de las tareas sembradas
-- ----------------------------------------------------------------------------

delete from tareas where id::text like 'cafede00-%';


-- ----------------------------------------------------------------------------
-- 3. Generación
-- ----------------------------------------------------------------------------

do $$
declare
  v_admin uuid;
  v_gestores  uuid[];
  v_asignados uuid[];
  v_faltantes text;

  -- Plantillas: area|categoria|foto_requerida|nombre|detalles
  -- Las recurrentes se repiten a lo largo de las semanas, como en la operación
  -- real de un albergue. Recurring chores repeat across weeks, as they do in
  -- a real shelter.
  v_recurrentes text[] := array[
    'Cocina|Limpieza|1|Limpieza profunda de cocina|Campana, parrillas y trampas de grasa. Subir foto al terminar.',
    'Comedor|Limpieza|0|Sanitización de mesas del comedor|Después de cada uno de los tres tiempos.',
    'Baños|Limpieza|1|Aseo y reposición en baños de planta baja|Verificar jabón, papel y ventilación.',
    'Dormitorios|Limpieza|0|Cambio de ropa de cama dormitorio A|Recoger, marcar y enviar a lavandería.',
    'Lavandería|Limpieza|0|Ciclo de lavado y tendido|Separar por dormitorio para no mezclar pertenencias.',
    'Almacén|Donativos|1|Recepción y clasificación de donativos|Registrar cantidades y fotografiar el ingreso.',
    'Cocina|Salud|0|Control de temperaturas en refrigeración|Registrar lectura matutina y vespertina.',
    'Patio|Mantenimiento|0|Barrido y revisión de drenajes del patio|Antes de la temporada de lluvias.',
    'Ludoteca|Educación|0|Sesión de apoyo escolar|Grupo de primaria, dos horas por la tarde.',
    'Enfermería|Salud|0|Revisión de caducidades del botiquín|Retirar lo vencido y levantar faltantes.',
    'Oficinas|Administrativa|0|Respaldo de expedientes del día|Verificar que quede copia fuera del equipo local.',
    'Dormitorios|Acompañamiento|0|Ronda nocturna de acompañamiento|Registrar incidencias sin datos sensibles.'
  ];

  -- Tareas de una sola vez, para que el tablero no parezca una plantilla.
  v_puntuales text[] := array[
    'Oficinas|Legal|0|Preparar carpeta de asesoría jurídica|Casos programados para la próxima semana.',
    'Enfermería|Salud|0|Agendar valoraciones médicas|Coordinar traslados con la unidad de salud.',
    'Almacén|Donativos|1|Inventario físico de papelería|Conteo por artículo. Fotografiar el acta firmada.',
    'Cocina|Mantenimiento|1|Reparar fuga en tarja de cocina|Requiere plomero externo. Documentar antes y después.',
    'Ludoteca|Educación|0|Preparar material para taller de lectura|Imprimir cuadernillos y revisar existencias.',
    'Comedor|Mantenimiento|0|Ajustar bisagras de puertas del comedor|Dos puertas rechinan y una no cierra.',
    'Oficinas|Administrativa|0|Actualizar directorio de instituciones aliadas|Verificar teléfonos y personas de contacto.',
    'Patio|Mantenimiento|1|Poda y retiro de ramas del patio|Riesgo de caída sobre el área de juegos.',
    'Baños|Mantenimiento|0|Cambiar regadera del baño de mujeres|Pieza ya comprada, pendiente de instalar.',
    'Dormitorios|Mantenimiento|0|Revisar literas del dormitorio B|Reportadas tres con tornillería floja.',
    'Lavandería|Mantenimiento|1|Servicio preventivo a lavadora industrial|Coordinar con proveedor. Foto de la orden de servicio.',
    'Oficinas|Legal|0|Integrar documentación para trámite institucional|Revisar vigencias antes de enviar.',
    'Almacén|Administrativa|0|Ordenar y etiquetar anaqueles del almacén|Facilitar el conteo mensual.',
    'Comedor|Donativos|0|Organizar despensa recibida|Separar por caducidad y rotar existencias.',
    'Enfermería|Acompañamiento|0|Seguimiento de canalizaciones|Confirmar citas y traslados de la semana.'
  ];

  v_plantilla text;
  v_partes text[];
  v_id_area uuid;
  v_id_cat uuid;

  i int;
  v_creada timestamptz;
  v_hecha timestamptz;
  v_inicio timestamptz;
  v_ritmo numeric;  -- fracción del tiempo total que la tarea pasó esperando
  v_asignado uuid;
  v_creador uuid;
  v_n int := 0;
  v_limite date;
begin
  -- Cuentas requeridas -------------------------------------------------------
  select id into v_admin from usuarios
   where correo = 'subdireccion.demo@freejolitos.consulting';

  select array_agg(id order by correo) into v_gestores from usuarios
   where correo in ('coord.operacion.demo@freejolitos.consulting',
                    'coord.social.demo@freejolitos.consulting');

  select array_agg(id order by correo) into v_asignados from usuarios
   where correo in ('cocina.demo@freejolitos.consulting',
                    'mantenimiento.demo@freejolitos.consulting',
                    'acompanamiento.demo@freejolitos.consulting');

  if v_admin is null or coalesce(array_length(v_gestores, 1), 0) < 2
                     or coalesce(array_length(v_asignados, 1), 0) < 3 then
    select string_agg(c, ', ') into v_faltantes
      from unnest(array[
        'subdireccion.demo@freejolitos.consulting',
        'coord.operacion.demo@freejolitos.consulting',
        'coord.social.demo@freejolitos.consulting',
        'cocina.demo@freejolitos.consulting',
        'mantenimiento.demo@freejolitos.consulting',
        'acompanamiento.demo@freejolitos.consulting']) as c
     where c not in (select correo from usuarios);

    raise exception
      'Faltan cuentas de demostración: %. Créalas en Authentication -> Users (Auto Confirm) y corre 01_cuentas_demo.sql antes de este archivo.',
      coalesce(v_faltantes, '(revisa los roles asignados)');
  end if;

  ---------------------------------------------------------------------------
  -- A. HECHAS: 10 semanas de historial, ~55 tareas.
  --    Densidad creciente hacia el presente: se ve un equipo que fue
  --    adoptando la herramienta, no una carga masiva de un solo día.
  ---------------------------------------------------------------------------
  for i in 0..54 loop
    v_plantilla := v_recurrentes[1 + (i % array_length(v_recurrentes, 1))];
    v_partes := string_to_array(v_plantilla, '|');

    select id into v_id_area from areas_trabajo where nombre = v_partes[1];
    select id into v_id_cat  from categorias     where nombre = v_partes[2];

    -- Más antiguas al principio del bucle, más recientes al final.
    v_creada := now()
      - make_interval(days => 70 - (i * 70 / 55))
      + make_interval(hours => 8 + (i % 9));
    v_hecha := v_creada + make_interval(hours => 5 + (i * 7) % 60);

    -- Cada persona tiene un ritmo distinto para TOMAR la tarea. Esa diferencia
    -- es la que hace conversable el reporte Por Asignado: separa "tardó en
    -- empezar" de "tardó en hacerla", que son problemas distintos.
    -- Each person picks tasks up at a different pace; that difference is what
    -- makes the per-assignee report worth discussing.
    v_ritmo := (array[0.12, 0.40, 0.72])[1 + (i % 3)];
    v_inicio := v_creada + (v_hecha - v_creada) * v_ritmo;

    -- Una de cada once saltó directo a Hecho, sin pasar por En curso: el
    -- trigger sella inicio = cierre y el tiempo de trabajo queda en cero.
    -- Aparece a propósito para que el tablero muestre también ese caso.
    -- One in eleven jumped straight to Hecho, so work time is zero.
    if i % 11 = 0 then
      v_inicio := v_hecha;
    end if;

    v_asignado := v_asignados[1 + (i % 3)];
    v_creador  := case when i % 4 = 0 then v_admin else v_gestores[1 + (i % 2)] end;
    v_n := v_n + 1;

    insert into tareas (id, nombre, detalles, foto_requerida, evidencia_url,
                        asignado_id, estado, fecha_creacion, fecha_inicio, fecha_hecho,
                        categoria_id, area_trabajo_id, creado_por, fecha_limite)
    values (('cafede00-0000-4000-8000-' || lpad(v_n::text, 12, '0'))::uuid,
            v_partes[4], v_partes[5], v_partes[3] = '1', null,
            v_asignado, 'Hecho', v_creada, v_inicio, v_hecha,
            v_id_cat, v_id_area, v_creador, (v_creada + interval '2 days')::date);
  end loop;

  ---------------------------------------------------------------------------
  -- B. EN CURSO: ~20 tareas de los últimos días.
  --    Varias con foto requerida y SIN evidencia: son las que se usan para
  --    demostrar en vivo el bloqueo, la subida y la URL firmada.
  ---------------------------------------------------------------------------
  for i in 0..19 loop
    if i % 2 = 0 then
      v_plantilla := v_puntuales[1 + (i % array_length(v_puntuales, 1))];
    else
      v_plantilla := v_recurrentes[1 + ((i * 5) % array_length(v_recurrentes, 1))];
    end if;
    v_partes := string_to_array(v_plantilla, '|');

    select id into v_id_area from areas_trabajo where nombre = v_partes[1];
    select id into v_id_cat  from categorias     where nombre = v_partes[2];

    -- Repartidas en unas cuatro semanas, no todas en los últimos días: al
    -- concentrarlas, la gráfica semanal queda plana y luego pega un salto que
    -- parece un pico de trabajo inexistente.
    -- Spread over ~4 weeks: concentrating them makes the weekly chart flat and
    -- then spike, which reads as a workload surge that never happened.
    v_creada := now() - make_interval(days => 3 + (i * 23) % 26, hours => 3 + (i % 7));

    -- Ya está en curso, así que por definición tiene inicio sellado.
    -- It is in progress, so by definition it has a start stamp.
    v_ritmo := (array[0.12, 0.40, 0.72])[1 + (i % 3)];
    v_inicio := v_creada + (now() - v_creada) * v_ritmo;

    v_asignado := v_asignados[1 + (i % 3)];
    v_creador  := v_gestores[1 + (i % 2)];
    v_n := v_n + 1;

    -- Vencimientos repartidos: algunas ya vencidas (alerta roja en el tablero),
    -- la mayoría dentro de las próximas dos semanas.
    v_limite := case
      when i % 7 = 0 then (now() - make_interval(days => 1 + (i % 3)))::date
      else (now() + make_interval(days => 1 + (i % 13)))::date
    end;

    insert into tareas (id, nombre, detalles, foto_requerida, evidencia_url,
                        asignado_id, estado, fecha_creacion, fecha_inicio, fecha_hecho,
                        categoria_id, area_trabajo_id, creado_por, fecha_limite)
    values (('cafede00-0000-4000-8000-' || lpad(v_n::text, 12, '0'))::uuid,
            v_partes[4], v_partes[5], v_partes[3] = '1', null,
            v_asignado, 'En curso', v_creada, v_inicio, null,
            v_id_cat, v_id_area, v_creador, v_limite);
  end loop;

  ---------------------------------------------------------------------------
  -- C. PENDIENTES: ~15 tareas, incluidas dos sin asignar.
  --    Las sin asignar aparecen agrupadas como "Sin asignar" en el reporte
  --    Por Asignado: sirven para hablar de carga de trabajo y huecos.
  ---------------------------------------------------------------------------
  for i in 0..14 loop
    v_plantilla := v_puntuales[1 + ((i * 3) % array_length(v_puntuales, 1))];
    v_partes := string_to_array(v_plantilla, '|');

    select id into v_id_area from areas_trabajo where nombre = v_partes[1];
    select id into v_id_cat  from categorias     where nombre = v_partes[2];

    v_creada := now() - make_interval(days => (i * 7) % 17, hours => 2 + (i % 5));
    v_asignado := case when i % 8 = 3 then null else v_asignados[1 + (i % 3)] end;
    v_creador  := case when i % 3 = 0 then v_admin else v_gestores[1 + (i % 2)] end;
    v_n := v_n + 1;

    v_limite := case
      when i % 9 = 0 then (now() - interval '2 days')::date
      else (now() + make_interval(days => 2 + (i % 14)))::date
    end;

    -- Pendiente = todavía no se toma, así que fecha_inicio queda en null.
    -- Not picked up yet, so fecha_inicio stays null.
    insert into tareas (id, nombre, detalles, foto_requerida, evidencia_url,
                        asignado_id, estado, fecha_creacion, fecha_inicio, fecha_hecho,
                        categoria_id, area_trabajo_id, creado_por, fecha_limite)
    values (('cafede00-0000-4000-8000-' || lpad(v_n::text, 12, '0'))::uuid,
            v_partes[4], v_partes[5], v_partes[3] = '1', null,
            v_asignado, 'Pendiente', v_creada, null, null,
            v_id_cat, v_id_area, v_creador, v_limite);
  end loop;

  raise notice 'Sembradas % tareas de demostración.', v_n;
end $$;


-- ----------------------------------------------------------------------------
-- 4. Verificación
-- ----------------------------------------------------------------------------

select estado, count(*) as tareas
  from tareas where id::text like 'cafede00-%'
 group by estado
 order by case estado when 'Pendiente' then 1 when 'En curso' then 2 else 3 end;

select coalesce(u.nombre_completo, 'Sin asignar') as asignado,
       count(*) filter (where t.estado = 'Pendiente') as pendientes,
       count(*) filter (where t.estado = 'En curso')  as en_curso,
       count(*) filter (where t.estado = 'Hecho')     as hechas,
       count(*)                                       as total
  from tareas t
  left join usuarios u on u.id = t.asignado_id
 where t.id::text like 'cafede00-%'
 group by 1 order by total desc;

-- Tiempos medios por persona: es lo que alimenta el reporte de desempeño.
select u.nombre_completo as asignado,
       round(avg(extract(epoch from (t.fecha_inicio - t.fecha_creacion)) / 86400)::numeric, 1) as dias_en_tomarla,
       round(avg(extract(epoch from (t.fecha_hecho  - t.fecha_inicio )) / 86400)::numeric, 1) as dias_en_hacerla,
       round(avg(extract(epoch from (t.fecha_hecho  - t.fecha_creacion)) / 86400)::numeric, 1) as dias_totales,
       count(*) as tareas_cerradas
  from tareas t join usuarios u on u.id = t.asignado_id
 where t.id::text like 'cafede00-%' and t.estado = 'Hecho'
 group by 1 order by dias_totales;

select count(*) filter (where foto_requerida and evidencia_url is null and estado = 'En curso')
         as listas_para_demostrar_foto,
       count(*) filter (where fecha_limite < current_date and estado <> 'Hecho')
         as vencidas_visibles
  from tareas where id::text like 'cafede00-%';
