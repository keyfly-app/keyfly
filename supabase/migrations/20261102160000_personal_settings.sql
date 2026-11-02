-- =====================================================================
-- Keyfly – personal settings (canvas "Személyes beállítások", approved 2026-11-02)
--  1. backup codes for two-step verification (authenticator app): stored hashed, each works once
--  2. email preferences per category (security emails are always sent)
--  3. what blocks deleting one's own account
-- =====================================================================

-- ---------- 1. backup codes ----------------------------------------------------------

create table public.mfa_recovery_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  code_hash   text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  created_at  timestamptz not null default now(),
  used_at     timestamptz
);
comment on table public.mfa_recovery_codes is
  'Backup codes for two-step verification (SHA-256 of the code). Replaced when new codes are made; removed when two-step is turned off.';
create index mfa_recovery_codes_user_idx on public.mfa_recovery_codes (user_id);
alter table public.mfa_recovery_codes enable row level security;
revoke all on public.mfa_recovery_codes from anon, authenticated;
-- No policies: only the functions below touch the codes.

-- Failed attempts, for a limit of 10 an hour per person (guessing a code needs millions of tries).
create table public.mfa_recovery_failures (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  at       timestamptz not null default now()
);
create index mfa_recovery_failures_idx on public.mfa_recovery_failures (user_id, at);
alter table public.mfa_recovery_failures enable row level security;
revoke all on public.mfa_recovery_failures from anon, authenticated;

-- New codes: only right after the second factor (aal2), so a stolen password alone cannot make backup codes.
create or replace function public.set_recovery_codes(p_hashes text[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null or coalesce((select auth.jwt()->>'aal'), '') <> 'aal2' then
    raise exception 'needs_second_factor' using errcode = '42501';
  end if;
  if coalesce(array_length(p_hashes, 1), 0) <> 10 then
    raise exception 'ten_codes' using errcode = '22023';
  end if;
  delete from public.mfa_recovery_codes where user_id = me;
  insert into public.mfa_recovery_codes (user_id, code_hash) select me, h from unnest(p_hashes) as h;
end;
$$;

create or replace function public.recovery_codes_left()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.mfa_recovery_codes where user_id = (select auth.uid()) and used_at is null;
$$;

-- Signing in with a backup code (after the password, at aal1): marks the code used. The server then removes the
-- authenticator, so the person is in and sets two-step up again.
create or replace function public.consume_recovery_code(p_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  hit uuid;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if (select count(*) from public.mfa_recovery_failures where user_id = me and at > now() - interval '1 hour') >= 10 then
    raise exception 'too_many_attempts' using errcode = '54000';
  end if;
  update public.mfa_recovery_codes set used_at = now()
   where id = (select id from public.mfa_recovery_codes where user_id = me and code_hash = p_hash and used_at is null limit 1)
  returning id into hit;
  if hit is null then
    insert into public.mfa_recovery_failures (user_id) values (me);
    return false;
  end if;
  delete from public.mfa_recovery_failures where user_id = me;
  return true;
end;
$$;

create or replace function public.delete_recovery_codes()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce((select auth.jwt()->>'aal'), '') <> 'aal2' then
    raise exception 'needs_second_factor' using errcode = '42501';
  end if;
  delete from public.mfa_recovery_codes where user_id = (select auth.uid());
end;
$$;

revoke execute on function public.set_recovery_codes(text[]), public.recovery_codes_left(), public.consume_recovery_code(text), public.delete_recovery_codes() from public, anon;
grant execute on function public.set_recovery_codes(text[]), public.recovery_codes_left(), public.consume_recovery_code(text), public.delete_recovery_codes() to authenticated;

create or replace function private.purge_recovery_failures()
returns void language sql security definer set search_path = '' as $$
  delete from public.mfa_recovery_failures where at < now() - interval '1 day';
$$;
revoke execute on function private.purge_recovery_failures() from public, anon, authenticated;

-- ---------- 2. email preferences ---------------------------------------------------------

alter table public.profiles add column email_prefs jsonb not null default '{}'::jsonb
  constraint profiles_email_prefs_object check (jsonb_typeof(email_prefs) = 'object');
comment on column public.profiles.email_prefs is
  'Emails the person switched off or on: {"lease_changes": false, ...}. Missing key = default. Security and invitation emails are always sent.';
grant update (email_prefs) on public.profiles to authenticated;

-- ---------- 3. deleting one's own account --------------------------------------------------

-- Why the account cannot be deleted right now (none = it can): the account holder of a company with other
-- members must hand it over first; insurance records are kept and handled by support; staff are removed by admins.
create or replace function public.account_deletion_blockers()
returns table (kind text, name text) language sql stable security definer set search_path = '' as $$
  select 'holder', a.name from public.account_members m join public.accounts a on a.id = m.account_id
   where m.user_id = (select auth.uid()) and m.role = 'owner' and a.kind = 'company' and a.archived_at is null
     and exists (select 1 from public.account_members o where o.account_id = a.id and o.user_id <> m.user_id)
  union all
  select 'insurance', null where exists (select 1 from public.policies where tenant_id = (select auth.uid()))
                              or exists (select 1 from public.claims where submitted_by = (select auth.uid()))
  union all
  select 'staff', null where exists (select 1 from public.staff where user_id = (select auth.uid()));
$$;
revoke execute on function public.account_deletion_blockers() from public, anon;
grant execute on function public.account_deletion_blockers() to authenticated;

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then return; end if;
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.unschedule(jobid) from cron.job where jobname = 'purge-recovery-failures';
  perform cron.schedule('purge-recovery-failures', '35 2 * * *', 'select private.purge_recovery_failures()');
end $$;
