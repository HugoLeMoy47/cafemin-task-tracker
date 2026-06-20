-- Migración: políticas de Storage para el bucket 'evidencias'
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requisito previo: el bucket 'evidencias' debe existir (Storage → New bucket → nombre: evidencias, Public: ON)

-- Asegura que el bucket existe y es público (getPublicUrl requiere bucket público)
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', true)
on conflict (id) do update set public = true;

-- Usuarios autenticados pueden subir fotos al bucket
create policy "Authenticated upload to evidencias"
on storage.objects for insert
to authenticated
with check (bucket_id = 'evidencias');

-- Lectura pública (necesario para que getPublicUrl funcione)
create policy "Public read from evidencias"
on storage.objects for select
to public
using (bucket_id = 'evidencias');

-- Usuarios autenticados pueden eliminar archivos (para limpieza)
create policy "Authenticated delete from evidencias"
on storage.objects for delete
to authenticated
using (bucket_id = 'evidencias');
