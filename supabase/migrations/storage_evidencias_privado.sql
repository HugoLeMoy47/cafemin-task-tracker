-- ============================================================================
-- Migración: bucket 'evidencias' privado, con acceso por propiedad de la tarea
-- Private 'evidencias' bucket, access scoped by task ownership
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requisitos previos: schema.sql, security_rls_and_stability.sql y
--                     hardening_rls_demo_publica.sql ya ejecutados
--
-- ⚠️ ESTA MIGRACIÓN VA ACOMPAÑADA DE CAMBIOS DE CÓDIGO. Ejecutarla sin
--    desplegar la versión que firma las URLs deja las fotos inaccesibles.
--    Run this together with the deploy that switches to signed URLs.
--
-- Antes: el bucket era público y la política de SELECT concedía lectura al rol
-- 'public'. Cualquiera en internet con la URL de un archivo lo veía, sin
-- sesión. En un refugio para personas migrantes, una foto de evidencia puede
-- identificar a alguien en situación de vulnerabilidad.
--
-- Después: bucket privado; el cliente pide una URL firmada de vigencia corta.
-- La ruta de cada archivo es '{id_de_tarea}/{timestamp}.{ext}', así que el
-- primer segmento permite comparar contra el asignado de la tarea.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Cerrar el bucket
-- ----------------------------------------------------------------------------

update storage.buckets set public = false where id = 'evidencias';


-- ----------------------------------------------------------------------------
-- 2. Reemplazar las políticas
--
-- Se califican con 'public.' a propósito: las políticas sobre storage.objects
-- no necesariamente evalúan con 'public' en el search_path.
-- ----------------------------------------------------------------------------

drop policy if exists "Authenticated upload to evidencias"   on storage.objects;
drop policy if exists "Public read from evidencias"          on storage.objects;
drop policy if exists "Authenticated delete from evidencias" on storage.objects;

-- Lectura: Admin y Gestor ven todo; el Asignado, solo la evidencia de las
-- tareas que tiene asignadas. Ni siquiera adivinando la ruta ve ajenas.
create policy "Evidencias: lectura autorizada"
on storage.objects for select to authenticated
using (
  bucket_id = 'evidencias'
  and (
    public.get_my_role() in ('Administrador', 'Gestor')
    or exists (
      select 1 from public.tareas t
      where t.id::text = split_part(storage.objects.name, '/', 1)
        and t.asignado_id = auth.uid()
    )
  )
);

-- Carga: mismo criterio. Impide que un Asignado suba archivos a la carpeta
-- de una tarea que no es suya.
create policy "Evidencias: carga autorizada"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'evidencias'
  and (
    public.get_my_role() in ('Administrador', 'Gestor')
    or exists (
      select 1 from public.tareas t
      where t.id::text = split_part(storage.objects.name, '/', 1)
        and t.asignado_id = auth.uid()
    )
  )
);

-- Borrado: solo Administrador. Antes lo podía hacer cualquier autenticado.
create policy "Evidencias: borrado solo Admin"
on storage.objects for delete to authenticated
using (
  bucket_id = 'evidencias'
  and public.get_my_role() = 'Administrador'
);


-- ----------------------------------------------------------------------------
-- 3. Convertir las filas existentes: de URL pública a ruta
--
-- El código nuevo guarda la ruta ('{id}/{ts}.{ext}'). Las filas viejas traen
-- la URL pública completa; se les recorta el prefijo. El ayudante del cliente
-- también tolera el formato viejo, así que el orden de despliegue no es
-- crítico, pero conviene dejar los datos limpios.
-- ----------------------------------------------------------------------------

update public.tareas
   set evidencia_url = regexp_replace(
         evidencia_url,
         '^.*/storage/v1/object/public/evidencias/',
         ''
       )
 where evidencia_url like '%/storage/v1/object/public/evidencias/%';


-- ============================================================================
-- CÓMO VERIFICAR
--
-- 1. Copiar la URL pública de una foto de ANTES y abrirla en una ventana de
--    incógnito: debe devolver error, no la imagen.
-- 2. Entrar como Asignado, abrir una tarea propia con evidencia y pulsar
--    "Ver evidencia": debe abrirse.
-- 3. Confirmar que quedan tres políticas sobre el bucket:
--      select policyname from pg_policies
--       where tablename = 'objects' and policyname like 'Evidencias%';
--
-- ROLLBACK (vuelve a dejar el bucket público — solo para emergencias):
--
--   update storage.buckets set public = true where id = 'evidencias';
--   drop policy if exists "Evidencias: lectura autorizada"  on storage.objects;
--   drop policy if exists "Evidencias: carga autorizada"    on storage.objects;
--   drop policy if exists "Evidencias: borrado solo Admin"  on storage.objects;
--   create policy "Public read from evidencias" on storage.objects
--     for select to public using (bucket_id = 'evidencias');
--   create policy "Authenticated upload to evidencias" on storage.objects
--     for insert to authenticated with check (bucket_id = 'evidencias');
-- ============================================================================
