-- ============================================================================
-- Semilla 1 de 2: roles de las cuentas de demostración
-- Demo accounts: role assignment
--
-- ⚠️ REQUISITO PREVIO — hazlo ANTES de correr este archivo.
--
-- Las cuentas NO se pueden crear con SQL: `usuarios.id` referencia
-- `auth.users(id)`, así que deben existir primero en Auth. Créalas en
-- Authentication → Users → Add user, con "Auto Confirm User" ACTIVADO.
-- El trigger handle_new_user crea el perfil en `usuarios` automáticamente.
--
-- Accounts cannot be created from SQL: `usuarios.id` references
-- `auth.users(id)`. Create them in the dashboard with Auto Confirm ON first.
--
--   Correo                                        Nombre completo
--   ------------------------------------------    --------------------------
--   subdireccion.demo@freejolitos.consulting      Alejandra Rueda Ontiveros
--   coord.operacion.demo@freejolitos.consulting   Martín Ibáñez Solano
--   coord.social.demo@freejolitos.consulting      Rocío Peralta Nájera
--   cocina.demo@freejolitos.consulting            Fernanda Quiroz Bello
--   mantenimiento.demo@freejolitos.consulting     Ignacio Salcedo Vera
--   acompanamiento.demo@freejolitos.consulting    Teresa Molina Arriaga
--
-- Al crear cada usuario, en "User Metadata" agrega:  nombre_completo
-- con el valor de la columna de arriba. Si no lo haces, el perfil se crea con
-- el nombre 'Usuario' y este script lo corrige de todos modos.
--
-- Usa la MISMA contraseña para las seis (mínimo 8 caracteres) y repártela con
-- quien vaya a ver la demostración. Son cuentas desechables: no reutilices una
-- contraseña que uses en cualquier otro lado.
--
-- TODAS las personas de este archivo son FICTICIAS. No corresponden a personal
-- real de CAFEMIN, a propósito: la demo vive en una URL pública.
-- Every person here is FICTITIOUS by design: the demo lives on a public URL.
-- ============================================================================

-- Corrige el nombre visible y asigna el rol. Es idempotente: puedes repetirlo.
update usuarios set nombre_completo = 'Alejandra Rueda Ontiveros', rol = 'Administrador'
 where correo = 'subdireccion.demo@freejolitos.consulting';

update usuarios set nombre_completo = 'Martín Ibáñez Solano',     rol = 'Gestor'
 where correo = 'coord.operacion.demo@freejolitos.consulting';

update usuarios set nombre_completo = 'Rocío Peralta Nájera',     rol = 'Gestor'
 where correo = 'coord.social.demo@freejolitos.consulting';

update usuarios set nombre_completo = 'Fernanda Quiroz Bello',    rol = 'Asignado'
 where correo = 'cocina.demo@freejolitos.consulting';

update usuarios set nombre_completo = 'Ignacio Salcedo Vera',     rol = 'Asignado'
 where correo = 'mantenimiento.demo@freejolitos.consulting';

update usuarios set nombre_completo = 'Teresa Molina Arriaga',    rol = 'Asignado'
 where correo = 'acompanamiento.demo@freejolitos.consulting';


-- Verificación: deben aparecer las seis con su rol correcto.
select correo, nombre_completo, rol
  from usuarios
 where correo like '%.demo@freejolitos.consulting'
 order by case rol when 'Administrador' then 1 when 'Gestor' then 2 else 3 end, nombre_completo;
