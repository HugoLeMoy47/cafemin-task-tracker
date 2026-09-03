-- ============================================================================
-- Semilla 3 de 3: Perfiles de rutina y plantillas de tareas para voluntariado
-- Routine task templates and volunteer profiles for CAFEMIN
--
-- Re-ejecutable: utiliza UUIDs predecibles con prefijo 'cafepro0-' para que
-- pueda re-ejecutarse sin duplicar perfiles ni alterar rutinas creadas en vivo.
-- ============================================================================

-- 1. Catálogos base necesarios
insert into areas_trabajo (nombre) values
  ('Cocina'), ('Comedor'), ('Dormitorios'), ('Baños'), ('Lavandería'),
  ('Almacén'), ('Ludoteca'), ('Enfermería'), ('Oficinas'), ('Patio')
on conflict (nombre) do nothing;

insert into categorias (nombre) values
  ('Limpieza'), ('Mantenimiento'), ('Educación'), ('Legal'),
  ('Acompañamiento'), ('Salud'), ('Donativos'), ('Administrativa')
on conflict (nombre) do nothing;

-- 2. Limpieza quirúrgica de perfiles sembrados previamente
delete from plantillas_perfil where id::text like 'cafepro0-%';

-- 3. Inserción de perfiles de rutina típicos de la operación de CAFEMIN
do $$
declare
  v_admin_id uuid;
  v_area_cocina uuid;
  v_area_almacen uuid;
  v_area_banos uuid;
  v_area_ludoteca uuid;
  v_cat_limpieza uuid;
  v_cat_donativos uuid;
  v_cat_educacion uuid;
  v_cat_acomp uuid;
begin
  -- Obtener admin para atribución (o null si no existen cuentas demo aún)
  select id into v_admin_id from usuarios where rol = 'Administrador' limit 1;

  -- Obtener IDs de áreas y categorías
  select id into v_area_cocina from areas_trabajo where nombre = 'Cocina' limit 1;
  select id into v_area_almacen from areas_trabajo where nombre = 'Almacén' limit 1;
  select id into v_area_banos from areas_trabajo where nombre = 'Baños' limit 1;
  select id into v_area_ludoteca from areas_trabajo where nombre = 'Ludoteca' limit 1;

  select id into v_cat_limpieza from categorias where nombre = 'Limpieza' limit 1;
  select id into v_cat_donativos from categorias where nombre = 'Donativos' limit 1;
  select id into v_cat_educacion from categorias where nombre = 'Educación' limit 1;
  select id into v_cat_acomp from categorias where nombre = 'Acompañamiento' limit 1;

  -- PERFIL 1: Asistente de Cocina
  insert into plantillas_perfil (id, nombre, descripcion, area_trabajo_id, categoria_id, creado_por, activo)
  values (
    'cafepro0-0000-0000-0000-000000000001',
    'Asistente de Cocina (Turno Matutino)',
    'Preparación de ingredientes, servicio de alimentos y sanitización general de cocina.',
    v_area_cocina,
    v_cat_limpieza,
    v_admin_id,
    true
  );

  insert into plantilla_tareas (plantilla_id, orden, nombre, detalles, foto_requerida, area_trabajo_id, categoria_id) values
  ('cafepro0-0000-0000-0000-000000000001', 1, 'Desinfección de superficies y equipo', 'Limpiar y desinfectar mesas de acero inoxidable, tablas de picar y cuchillos antes de iniciar.', false, v_area_cocina, v_cat_limpieza),
  ('cafepro0-0000-0000-0000-000000000001', 2, 'Lavado y picado de ingredientes', 'Picar verduras, desinfectar legumbres y alistar insumos para el menú del día según indique coordinación.', false, v_area_cocina, v_cat_limpieza),
  ('cafepro0-0000-0000-0000-000000000001', 3, 'Apoyo en barra y servicio de raciones', 'Servir porciones equitativas y calientes a las personas y familias albergadas.', false, v_area_cocina, v_cat_acomp),
  ('cafepro0-0000-0000-0000-000000000001', 4, 'Lavado de loza, charolas y utensilios', 'Lavar, enjuagar con agua caliente y secar vajilla y charolas de comensales.', false, v_area_cocina, v_cat_limpieza),
  ('cafepro0-0000-0000-0000-000000000001', 5, 'Sanitización profunda y cierre de cocina', 'Limpieza de parrillas, vaciado de trampas de grasa y retiro de basura orgánica.', true, v_area_cocina, v_cat_limpieza);

  -- PERFIL 2: Ropero y Clasificación de Donativos
  insert into plantillas_perfil (id, nombre, descripcion, area_trabajo_id, categoria_id, creado_por, activo)
  values (
    'cafepro0-0000-0000-0000-000000000002',
    'Recepción y Ropero (Donaciones)',
    'Clasificación de ropa, calzado, kits de higiene y distribución a personas en tránsito.',
    v_area_almacen,
    v_cat_donativos,
    v_admin_id,
    true
  );

  insert into plantilla_tareas (plantilla_id, orden, nombre, detalles, foto_requerida, area_trabajo_id, categoria_id) values
  ('cafepro0-0000-0000-0000-000000000002', 1, 'Recepción y registro de donaciones recibidas', 'Pesar o cuantificar bultos de donativos ingresados durante el día.', false, v_area_almacen, v_cat_donativos),
  ('cafepro0-0000-0000-0000-000000000002', 2, 'Clasificación de prendas por talla y género', 'Separar ropa de bebé, infantil, dama y caballero en buen estado.', false, v_area_almacen, v_cat_donativos),
  ('cafepro0-0000-0000-0000-000000000002', 3, 'Acomodo en anaqueles y doblado', 'Mantener percheros y estantes accesibles para entregas rápidas.', false, v_area_almacen, v_cat_donativos),
  ('cafepro0-0000-0000-0000-000000000002', 4, 'Entrega de kits de vestimenta e higiene', 'Armar y entregar paquetes individuales a familias recién ingresadas.', false, v_area_almacen, v_cat_acomp),
  ('cafepro0-0000-0000-0000-000000000002', 5, 'Inventario y cierre de almacén', 'Fotografiar orden final de anaqueles y reportar faltantes de tallas críticas.', true, v_area_almacen, v_cat_donativos);

  -- PERFIL 3: Sanitización de Áreas Comunes
  insert into plantillas_perfil (id, nombre, descripcion, area_trabajo_id, categoria_id, creado_por, activo)
  values (
    'cafepro0-0000-0000-0000-000000000003',
    'Higiene y Sanitización de Áreas Comunes',
    'Aseo profundo de pasillos, sanitarios comunitarios y reposición de insumos de higiene.',
    v_area_banos,
    v_cat_limpieza,
    v_admin_id,
    true
  );

  insert into plantilla_tareas (plantilla_id, orden, nombre, detalles, foto_requerida, area_trabajo_id, categoria_id) values
  ('cafepro0-0000-0000-0000-000000000003', 1, 'Barrido y trapeado de pasillos y patio', 'Barrer accesos principales y aplicar desinfectante en piso.', false, null, v_cat_limpieza),
  ('cafepro0-0000-0000-0000-000000000003', 2, 'Lavado y sanitización de baños comunitarios', 'Lavar inodoros, lavamanos y regaderas con solución clorada.', true, v_area_banos, v_cat_limpieza),
  ('cafepro0-0000-0000-0000-000000000003', 3, 'Reposición de jabón, toallas y papel higiénico', 'Verificar dispensadores en baños de hombres y mujeres.', false, v_area_banos, v_cat_limpieza),
  ('cafepro0-0000-0000-0000-000000000003', 4, 'Vaciado de contenedores de basura', 'Amarrar bolsas y llevarlas al contenedor exterior de recolección.', false, null, v_cat_limpieza);

  -- PERFIL 4: Ludoteca y Apoyo a la Infancia
  insert into plantillas_perfil (id, nombre, descripcion, area_trabajo_id, categoria_id, creado_por, activo)
  values (
    'cafepro0-0000-0000-0000-000000000004',
    'Ludoteca y Cuidado Infantil',
    'Actividades recreativas, apoyo escolar y acompañamiento socioemocional a la niñez migrante.',
    v_area_ludoteca,
    v_cat_educacion,
    v_admin_id,
    true
  );

  insert into plantilla_tareas (plantilla_id, orden, nombre, detalles, foto_requerida, area_trabajo_id, categoria_id) values
  ('cafepro0-0000-0000-0000-000000000004', 1, 'Acondicionamiento y tapetes de ludoteca', 'Desinfectar tapetes de foami y organizar mesas de trabajo infantil.', false, v_area_ludoteca, v_cat_limpieza),
  ('cafepro0-0000-0000-0000-000000000004', 2, 'Taller de lectura y expresión artística', 'Lectura de cuentos, dinámicas de dibujo y juegos cooperativos.', false, v_area_ludoteca, v_cat_educacion),
  ('cafepro0-0000-0000-0000-000000000004', 3, 'Supervisión de colación y lavado de manos', 'Acompañar a las y los niños en la toma de su refrigerio matutino.', false, v_area_ludoteca, v_cat_acomp),
  ('cafepro0-0000-0000-0000-000000000004', 4, 'Recolección, desinfección y guardado de juguetes', 'Asegurar que ningún material quede en el piso al terminar el horario.', true, v_area_ludoteca, v_cat_limpieza);

end $$;
