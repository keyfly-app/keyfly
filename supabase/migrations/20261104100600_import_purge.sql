-- Retention: the values an import overwrote are only needed while it can be undone (24 hours). A daily job removes them
-- two days after the import; the batch itself (file name, counts, who and when) stays as the account's import history.
create or replace function private.purge_import_changes()
returns void language sql security definer set search_path = '' as $$
  delete from public.import_batch_changes c
   using public.import_batches b
   where b.id = c.batch_id and b.created_at < now() - interval '2 days';
$$;
revoke execute on function private.purge_import_changes() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then return; end if;
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.unschedule(jobid) from cron.job where jobname = 'purge-import-changes';
  perform cron.schedule('purge-import-changes', '53 3 * * *', 'select private.purge_import_changes()');
end $$;
