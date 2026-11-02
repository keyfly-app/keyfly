-- Sign-in round 3 (canvas v2.4, approved 2026-11-02).
--  1. Google accounts: someone who signed up with Google can set a password; the server then records the email
--     sign-in method (an "email" identity, as Supabase creates for email sign-ups), so the Google account can be
--     unlinked and another one linked later. Server only (service role).
--  2. Two-step verification by email: besides the authenticator app, a 6-digit code by email. Valid 5 minutes, a new
--     one after 60 seconds, at most 10 a day, 5 wrong tries end it. Only its SHA-256 hash is stored. A correct code
--     lets this one sign-in session through the two-step gate (it does not make the session "aal2": Supabase accepts
--     only the app's code for that, so new backup codes and trusted devices still need the app). The person can turn
--     the email option off.

-- ---------- 1. Email sign-in method for Google sign-ups ----------------------------------

create or replace function public.add_email_identity(p_user uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  u auth.users;
begin
  select * into u from auth.users where id = p_user;
  if u.id is null or u.email is null or u.encrypted_password is null or u.encrypted_password = '' then
    return false;
  end if;
  if exists (select 1 from auth.identities where user_id = p_user and provider = 'email') then
    return true;
  end if;
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (p_user::text, p_user, jsonb_build_object('sub', p_user::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
          'email', null, now(), now());
  return true;
end;
$$;
revoke execute on function public.add_email_identity(uuid) from public, anon, authenticated;
grant execute on function public.add_email_identity(uuid) to service_role;

-- ---------- 2. Two-step code by email ----------------------------------------------------

alter table public.profiles add column two_step_email boolean not null default true;
comment on column public.profiles.two_step_email is 'Two-step verification: may ask for a sign-in code by email besides the authenticator app.';

create or replace function public.set_two_step_email(p_on boolean)
returns void language sql security definer set search_path = '' as $$
  update public.profiles set two_step_email = coalesce(p_on, true) where id = (select auth.uid());
$$;
revoke execute on function public.set_two_step_email(boolean) from public, anon;
grant execute on function public.set_two_step_email(boolean) to authenticated;

-- One open code per person (hashed), and every send for the limits.
create table public.two_step_email_codes (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  code_hash  text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  attempts   smallint not null default 0
);
comment on table public.two_step_email_codes is 'Open two-step codes sent by email (hashed), 5 minutes; removed when used or by the daily clean-up.';

create table public.two_step_email_sends (
  user_id uuid not null references public.profiles (id) on delete cascade,
  at      timestamptz not null default now()
);
create index two_step_email_sends_user_at_idx on public.two_step_email_sends (user_id, at);
comment on table public.two_step_email_sends is 'Two-step codes sent by email, for the limits (one a minute, 10 a day). Kept 2 days.';

-- Sign-in sessions that passed the two-step check with an emailed code; gone when the session ends.
create table public.two_step_passes (
  session_id uuid primary key references auth.sessions (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index two_step_passes_user_idx on public.two_step_passes (user_id);
comment on table public.two_step_passes is 'Sessions let through the two-step gate by an emailed code. Deleted with the session.';

alter table public.two_step_email_codes enable row level security;
alter table public.two_step_email_sends enable row level security;
alter table public.two_step_passes enable row level security;
revoke all on public.two_step_email_codes, public.two_step_email_sends, public.two_step_passes from anon, authenticated;

-- Before the server emails a code: the person uses two-step verification with the email option on, and the limits
-- allow it. Stores the new code's hash.
create or replace function public.start_two_step_email(p_code_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  last_at timestamptz;
  sent_day int;
begin
  if me is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.mfa_factors where user_id = me and status = 'verified')
     or not coalesce((select two_step_email from public.profiles where id = me), false) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select max(at), count(*) filter (where at > now() - interval '1 day') into last_at, sent_day
    from public.two_step_email_sends where user_id = me;
  if last_at > now() - interval '60 seconds' then
    raise exception 'too_soon' using errcode = '54000';
  end if;
  if sent_day >= 10 then
    raise exception 'too_many_codes' using errcode = '54000';
  end if;
  insert into public.two_step_email_codes (user_id, code_hash, expires_at)
  values (me, p_code_hash, now() + interval '5 minutes')
  on conflict (user_id) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0;
  insert into public.two_step_email_sends (user_id) values (me);
end;
$$;

-- An email that could not be sent does not count towards the limits.
create or replace function public.undo_two_step_email()
returns void language sql security definer set search_path = '' as $$
  delete from public.two_step_email_sends
   where ctid = (select ctid from public.two_step_email_sends where user_id = (select auth.uid()) and at > now() - interval '2 minutes' order by at desc limit 1);
  delete from public.two_step_email_codes where user_id = (select auth.uid());
$$;

-- The code typed in: 'ok' lets this session through the gate; 'wrong'; 'expired' (none, too old or 5 wrong tries).
create or replace function public.confirm_two_step_email(p_code_hash text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  sid uuid := nullif((select auth.jwt()) ->> 'session_id', '')::uuid;
  c public.two_step_email_codes;
begin
  if me is null or sid is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into c from public.two_step_email_codes where user_id = me for update;
  if c.user_id is null or c.expires_at < now() or c.attempts >= 5 then
    return 'expired';
  end if;
  if c.code_hash <> p_code_hash then
    update public.two_step_email_codes set attempts = attempts + 1 where user_id = me;
    return case when c.attempts + 1 >= 5 then 'expired' else 'wrong' end;
  end if;
  delete from public.two_step_email_codes where user_id = me;
  insert into public.two_step_passes (session_id, user_id) values (sid, me) on conflict (session_id) do nothing;
  return 'ok';
end;
$$;

-- The proxy asks this for a signed-in session below aal2: did it pass with an emailed code?
create or replace function public.two_step_pass_ok()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.two_step_passes
     where user_id = (select auth.uid()) and session_id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid
  );
$$;

revoke execute on function public.start_two_step_email(text), public.undo_two_step_email(), public.confirm_two_step_email(text), public.two_step_pass_ok() from public, anon;
grant execute on function public.start_two_step_email(text), public.undo_two_step_email(), public.confirm_two_step_email(text), public.two_step_pass_ok() to authenticated;

-- Daily clean-up of old codes and send logs.
create or replace function private.purge_two_step_email()
returns void language sql security definer set search_path = '' as $$
  delete from public.two_step_email_codes where expires_at < now() - interval '1 day';
  delete from public.two_step_email_sends where at < now() - interval '2 days';
$$;
revoke execute on function private.purge_two_step_email() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then return; end if;
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.unschedule(jobid) from cron.job where jobname = 'purge-two-step-email';
  perform cron.schedule('purge-two-step-email', '47 3 * * *', 'select private.purge_two_step_email()');
end $$;
