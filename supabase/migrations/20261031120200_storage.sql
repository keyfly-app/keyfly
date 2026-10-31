-- =====================================================================
-- Keyfly – fájltárolás
-- 'documents' (privát): fedezeti igazolások, munkáltatói igazolások, kárdokumentumok.
--   Útvonal: <felhasználó uuid>/<fájlnév>  – mindenki csak a saját mappáját látja.
-- 'public-assets' (nyilvános): logók, képek a weboldalhoz.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/heic']),
  ('public-assets', 'public-assets', true, 5242880, array['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "documents: saját mappa olvasása"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_staff())
  );

create policy "documents: saját mappába feltöltés"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_staff())
  );

create policy "documents: munkatárs töröl"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and private.is_staff());

create policy "public-assets: munkatárs tölt fel"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'public-assets' and private.is_staff());
