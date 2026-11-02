-- Bank accounts and phone check (canvas "Bankszámlák", "Telefonszám megerősítése", approved 2026-11-02).
--  1. Bank accounts: optional, for personal and company accounts; several per currency, one primary per currency.
--     Stored as IBAN (Hungarian 16/24-digit numbers are converted to IBAN by the app); the check digits are verified
--     here too. Owners and admins manage them, every member can read them. Kept until removed or the account is deleted.
--  2. Phone numbers are confirmed with a 6-digit SMS code (sent by the server through Twilio): only a signed-in
--     person with a confirmed email may ask, at most 3 codes an hour and 10 a day; 5 wrong tries end a code.
--     The phone number can no longer be written directly.

-- ---------- 1. Bank accounts ----------------------------------------------------------

-- ISO 13616 check: country, check digits, mod 97 = 1. Hungarian IBANs have 28 characters.
create or replace function private.iban_ok(p text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  s text;
  ch text;
  m int := 0;
  i int;
begin
  if p is null or p !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then
    return false;
  end if;
  if left(p, 2) = 'HU' and length(p) <> 28 then
    return false;
  end if;
  s := substr(p, 5) || left(p, 4);
  for i in 1..length(s) loop
    ch := substr(s, i, 1);
    if ch ~ '[A-Z]' then
      m := (m * 100 + ascii(ch) - 55) % 97;
    else
      m := (m * 10 + ch::int) % 97;
    end if;
  end loop;
  return m = 1;
end;
$$;

create table public.bank_accounts (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts (id) on delete cascade,
  currency    text not null check (currency ~ '^[A-Z]{3}$'),
  iban        text not null check (private.iban_ok(iban)),
  holder_name text not null check (length(btrim(holder_name)) between 1 and 200),
  label       text check (length(label) <= 60),
  is_primary  boolean not null default false,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint bank_accounts_unique unique (account_id, iban, currency)
);
comment on table public.bank_accounts is
  'Where Keyfly or the insurer pays claims and refunds. Optional. One primary per currency. Deleted with the account.';
create unique index bank_accounts_one_primary on public.bank_accounts (account_id, currency) where is_primary;
create index bank_accounts_created_by_idx on public.bank_accounts (created_by);

create trigger bank_accounts_updated_at before update on public.bank_accounts
  for each row execute function public.set_updated_at();

-- The first account in a currency becomes primary; choosing a new primary releases the old one.
create or replace function private.bank_account_primary()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and not exists (
    select 1 from public.bank_accounts where account_id = new.account_id and currency = new.currency and id <> new.id
  ) then
    new.is_primary := true;
  end if;
  if new.is_primary then
    update public.bank_accounts set is_primary = false
     where account_id = new.account_id and currency = new.currency and id <> new.id and is_primary;
  end if;
  return new;
end;
$$;
create trigger bank_accounts_primary before insert or update of is_primary, currency on public.bank_accounts
  for each row execute function private.bank_account_primary();

-- Removing the primary account makes the oldest other one in that currency primary.
create or replace function private.bank_account_promote()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.is_primary then
    update public.bank_accounts set is_primary = true
     where id = (select id from public.bank_accounts where account_id = old.account_id and currency = old.currency order by created_at limit 1);
  end if;
  return null;
end;
$$;
create trigger bank_accounts_promote after delete on public.bank_accounts
  for each row execute function private.bank_account_promote();
revoke execute on function private.bank_account_primary(), private.bank_account_promote() from public, anon, authenticated;

alter table public.bank_accounts enable row level security;
revoke all on public.bank_accounts from anon, authenticated;
grant select, delete on public.bank_accounts to authenticated;
grant insert (account_id, currency, iban, holder_name, label, is_primary, created_by) on public.bank_accounts to authenticated;
grant update (currency, iban, holder_name, label, is_primary) on public.bank_accounts to authenticated;
create policy "bank_accounts_select_member_or_staff" on public.bank_accounts for select to authenticated
  using (private.is_account_member(account_id) or private.is_staff());
create policy "bank_accounts_insert_owner_admin" on public.bank_accounts for insert to authenticated
  with check (private.has_account_role(account_id, array['owner', 'admin']::public.account_role[]) and created_by = (select auth.uid()));
create policy "bank_accounts_update_owner_admin" on public.bank_accounts for update to authenticated
  using (private.has_account_role(account_id, array['owner', 'admin']::public.account_role[]))
  with check (private.has_account_role(account_id, array['owner', 'admin']::public.account_role[]));
create policy "bank_accounts_delete_owner_admin" on public.bank_accounts for delete to authenticated
  using (private.has_account_role(account_id, array['owner', 'admin']::public.account_role[]));

create trigger bank_accounts_audit after insert or update or delete on public.bank_accounts
  for each row execute function audit.record('id');

-- ---------- 2. Phone check by SMS -------------------------------------------------------

alter table public.profiles add column phone_verified_at timestamptz;
comment on column public.profiles.phone_verified_at is 'When the current phone number was confirmed with an SMS code; set only by confirm_phone_code.';
-- The number changes only through the SMS check below (or is removed with remove_phone).
revoke update (phone) on public.profiles from authenticated;

-- One open code per person: the number it was sent to, its SHA-256 hash, expiry and wrong tries.
create table public.phone_verifications (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  phone       text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  code_hash   text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at  timestamptz not null,
  attempts    smallint not null default 0
);
comment on table public.phone_verifications is 'Open SMS codes (hashed), 10 minutes; removed when used or by the daily clean-up.';

-- Every SMS sent, for the limits (3 an hour, 10 a day per person). Kept 2 days.
create table public.sms_sends (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  at       timestamptz not null default now()
);
create index sms_sends_user_at_idx on public.sms_sends (user_id, at);
comment on table public.sms_sends is 'SMS codes sent per person, for rate limits. Kept 2 days.';

alter table public.phone_verifications enable row level security;
alter table public.sms_sends enable row level security;
revoke all on public.phone_verifications, public.sms_sends from anon, authenticated;

-- Before the server sends the SMS: checks the limits and stores the new code. Returns the number of codes left today.
create or replace function public.start_phone_check(p_phone text, p_code_hash text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  sent_hour int;
  sent_day int;
begin
  if me is null or not exists (select 1 from auth.users where id = me and email_confirmed_at is not null) then
    raise exception 'email_not_confirmed' using errcode = '42501';
  end if;
  if p_phone !~ '^\+[1-9][0-9]{7,14}$' or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid' using errcode = '22023';
  end if;
  select count(*) filter (where at > now() - interval '1 hour'), count(*) filter (where at > now() - interval '1 day')
    into sent_hour, sent_day from public.sms_sends where user_id = me;
  if sent_hour >= 3 or sent_day >= 10 then
    raise exception 'too_many_codes' using errcode = '54000';
  end if;
  insert into public.phone_verifications (user_id, phone, code_hash, expires_at)
  values (me, p_phone, p_code_hash, now() + interval '10 minutes')
  on conflict (user_id) do update set phone = excluded.phone, code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0;
  insert into public.sms_sends (user_id) values (me);
  return 9 - sent_day;
end;
$$;

-- The code from the SMS: on success the number becomes the profile's confirmed phone.
create or replace function public.confirm_phone_code(p_code_hash text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  v public.phone_verifications;
begin
  select * into v from public.phone_verifications where user_id = me for update;
  if v.user_id is null or v.expires_at < now() or v.attempts >= 5 then
    raise exception 'code_expired' using errcode = '22023';
  end if;
  if v.code_hash <> p_code_hash then
    update public.phone_verifications set attempts = attempts + 1 where user_id = me;
    return 'wrong';
  end if;
  update public.profiles set phone = v.phone, phone_verified_at = now() where id = me;
  delete from public.phone_verifications where user_id = me;
  return 'ok';
end;
$$;

create or replace function public.remove_phone()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set phone = null, phone_verified_at = null where id = (select auth.uid());
  delete from public.phone_verifications where user_id = (select auth.uid());
$$;

revoke execute on function public.start_phone_check(text, text), public.confirm_phone_code(text), public.remove_phone() from public, anon;
grant execute on function public.start_phone_check(text, text), public.confirm_phone_code(text), public.remove_phone() to authenticated;

create or replace function private.purge_phone_checks()
returns void language sql security definer set search_path = '' as $$
  delete from public.phone_verifications where expires_at < now() - interval '1 day';
  delete from public.sms_sends where at < now() - interval '2 days';
$$;
revoke execute on function private.purge_phone_checks() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then return; end if;
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.unschedule(jobid) from cron.job where jobname = 'purge-phone-checks';
  perform cron.schedule('purge-phone-checks', '41 3 * * *', 'select private.purge_phone_checks()');
end $$;
