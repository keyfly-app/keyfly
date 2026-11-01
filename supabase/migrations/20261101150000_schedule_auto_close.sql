-- =====================================================================
-- Daily job: leases that ended more than 60 days ago and have no open claim
-- close themselves (private.auto_close_leases). Runs at 02:00 UTC
-- (03:00 or 04:00 in Budapest). Skipped where pg_cron is not available
-- (local test databases).
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron not available – auto-close not scheduled';
    return;
  end if;
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.unschedule(jobid) from cron.job where jobname = 'auto-close-leases';
  perform cron.schedule('auto-close-leases', '0 2 * * *', 'select private.auto_close_leases(60)');
end $$;
