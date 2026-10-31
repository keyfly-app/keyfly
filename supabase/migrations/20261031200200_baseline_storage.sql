-- =====================================================================
-- Keyfly – file storage
-- 'documents' (private): coverage certificates, employer certificates, claim files.
--   Path: <user uuid>/<file name> – each user only sees their own folder.
-- 'public-assets' (public): logos and images for the website.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/heic']),
  ('public-assets', 'public-assets', true, 5242880, array['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "documents_select_own_folder_or_staff" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_staff()));

create policy "documents_insert_own_folder_or_staff" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_staff()));

create policy "documents_delete_staff" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and private.is_staff());

create policy "public_assets_insert_staff" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-assets' and private.is_staff());
