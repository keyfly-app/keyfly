-- Settings hub round (canvas "Cégadatok – szerkeszthető", "Profil – lakcím és levelezési cím"):
-- companies keep editable details (only the last three digits of the tax number may change: VAT code + county code),
-- an EU VAT number, a structured registered office, an optional mailing address and contact; people may add a home
-- and a mailing address. Retention: company fields live with the account; personal addresses go with the profile.

-- ---------- Addresses ----------
-- {country?, postal_code, city, street, unit?} – country (ISO 3166-1 alpha-2) on personal addresses only; Hungarian
-- postal codes have four digits.
create or replace function private.valid_address(a jsonb, with_country boolean)
returns boolean language sql immutable set search_path = '' as $$
  select a is null or (
    jsonb_typeof(a) = 'object'
    and not exists (select 1 from jsonb_object_keys(a) k where k not in ('country', 'postal_code', 'city', 'street', 'unit'))
    and length(btrim(coalesce(a->>'postal_code', ''))) between 1 and 10
    and length(btrim(coalesce(a->>'city', ''))) between 1 and 100
    and length(btrim(coalesce(a->>'street', ''))) between 1 and 200
    and length(coalesce(a->>'unit', '')) <= 50
    and (case when with_country then coalesce(a->>'country', '') ~ '^[A-Z]{2}$' else a->>'country' is null end)
    and (coalesce(a->>'country', 'HU') <> 'HU' or a->>'postal_code' ~ '^[0-9]{4}$')
  )
$$;

-- "1139 Budapest, Váci út 81." – the one-line form used on leases and invoices.
create or replace function private.format_address(a jsonb)
returns text language sql immutable set search_path = '' as $$
  select case when a is null then null else
    concat_ws(', ', concat_ws(' ', a->>'postal_code', a->>'city'), concat_ws(' ', a->>'street', nullif(a->>'unit', '')))
  end
$$;

-- ---------- Companies ----------
alter table public.accounts
  add column eu_vat_number   text check (eu_vat_number ~ '^HU[0-9]{8}$'),
  add column office_address  jsonb check (private.valid_address(office_address, false)),
  add column mailing_address jsonb check (private.valid_address(mailing_address, false)),
  add column contact_email   text check (length(contact_email) <= 254 and contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column contact_phone   text check (contact_phone ~ '^\+?[0-9 ()/-]{6,30}$'),
  add constraint accounts_person_no_company_details check (
    kind = 'company' or (eu_vat_number is null and office_address is null and mailing_address is null and contact_email is null and contact_phone is null)
  );
comment on column public.accounts.office_address is 'Registered office (székhely). registered_address is its one-line form, kept in sync by a trigger.';
comment on column public.accounts.mailing_address is 'Levelezési cím; null = same as the registered office.';

-- "1139 Budapest, Váci út 81." (NAV) → structured office, and back.
update public.accounts
set office_address = jsonb_build_object('postal_code', m[1], 'city', m[2], 'street', m[3])
from (select id, regexp_match(registered_address, '^([0-9]{4}) ([^,]+), (.+)$') as m from public.accounts) parsed
where parsed.id = accounts.id and accounts.kind = 'company' and parsed.m is not null and accounts.office_address is null;

create or replace function private.sync_company_details()
returns trigger language plpgsql set search_path = '' as $$
declare
  m text[];
begin
  if new.kind <> 'company' then
    return new;
  end if;
  -- Created from NAV with a one-line address: split it.
  if tg_op = 'INSERT' and new.office_address is null and new.registered_address is not null then
    m := regexp_match(new.registered_address, '^([0-9]{4}) ([^,]+), (.+)$');
    if m is not null then
      new.office_address := jsonb_build_object('postal_code', m[1], 'city', m[2], 'street', m[3]);
    end if;
  end if;
  if new.office_address is not null then
    new.registered_address := private.format_address(new.office_address);
  end if;
  -- The first eight digits identify the taxpayer: only the VAT code and the county code may change.
  if tg_op = 'UPDATE' and left(new.tax_number, 8) is distinct from left(old.tax_number, 8)
     and current_user not in ('service_role', 'postgres', 'supabase_admin') and not private.is_staff() then
    raise exception 'tax_id_fixed' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger accounts_sync_company_details before insert or update on public.accounts
  for each row execute function private.sync_company_details();

revoke update on public.accounts from authenticated;
grant update (name, legal_name, tax_number, company_reg_number, eu_vat_number, office_address, mailing_address, contact_email, contact_phone)
  on public.accounts to authenticated;

-- ---------- People ----------
alter table public.profiles
  add column home_address    jsonb check (private.valid_address(home_address, true)),
  add column mailing_address jsonb check (private.valid_address(mailing_address, true));
comment on column public.profiles.home_address is 'Lakcím, optional; for leases. Deleted with the profile.';
comment on column public.profiles.mailing_address is 'Levelezési cím, optional; null = same as the home address. Deleted with the profile.';
grant update (home_address, mailing_address) on public.profiles to authenticated;

-- ---------- Trusted devices (canvas "Biztonságos eszközök") ----------
-- After the two-step code, a person may mark the browser: for 30 days it asks for no code there. The browser keeps a
-- random token in an httpOnly cookie; only its SHA-256 hash is stored. Staff never skip the code (is_staff needs aal2).
create table public.trusted_devices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  token_hash   text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  label        text not null check (length(label) between 1 and 100),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '30 days',
  last_used_at timestamptz
);
comment on table public.trusted_devices is 'Browsers that skip the two-step code for 30 days. Removed on expiry, password change, two-step off or backup-code sign-in.';
create index trusted_devices_user_idx on public.trusted_devices (user_id);

alter table public.trusted_devices enable row level security;
revoke all on public.trusted_devices from anon, authenticated;
grant select (id, label, created_at, expires_at, last_used_at), delete on public.trusted_devices to authenticated;
create policy "trusted_devices_own_select" on public.trusted_devices for select to authenticated using (user_id = (select auth.uid()));
create policy "trusted_devices_own_delete" on public.trusted_devices for delete to authenticated using (user_id = (select auth.uid()));

-- Marking needs the code just entered (aal2); at most 10 devices, the oldest goes.
create or replace function public.trust_device(p_token_hash text, p_label text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  new_id uuid;
begin
  if me is null or coalesce((select auth.jwt()->>'aal'), '') <> 'aal2' then
    raise exception 'second_factor_required' using errcode = '42501';
  end if;
  insert into public.trusted_devices (user_id, token_hash, label) values (me, p_token_hash, left(btrim(p_label), 100))
  returning id into new_id;
  delete from public.trusted_devices where id in (
    select id from public.trusted_devices where user_id = me order by created_at desc offset 10
  );
  return new_id;
end;
$$;

-- Is this browser trusted for the signed-in person? Marks it used.
create or replace function public.trusted_device_ok(p_token_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.trusted_devices set last_used_at = now()
  where token_hash = p_token_hash and user_id = (select auth.uid()) and expires_at > now();
  return found;
end;
$$;

revoke execute on function public.trust_device(text, text), public.trusted_device_ok(text) from public, anon;
grant execute on function public.trust_device(text, text), public.trusted_device_ok(text) to authenticated;

create or replace function private.purge_trusted_devices()
returns void language sql security definer set search_path = '' as $$
  delete from public.trusted_devices where expires_at < now();
$$;

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then return; end if;
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.unschedule(jobid) from cron.job where jobname = 'purge-trusted-devices';
  perform cron.schedule('purge-trusted-devices', '17 3 * * *', 'select private.purge_trusted_devices()');
end $$;

-- ---------- Deleting one's account: lease records block it ----------
-- Properties, leases and lease requests of the personal account (or of a company only this person works in) are
-- records the other party relies on; deleting them is support's job, so self-service deletion stops with a clear reason.
create or replace function public.account_deletion_blockers()
returns table (kind text, name text) language sql stable security definer set search_path = '' as $$
  select 'holder', a.name from public.account_members m join public.accounts a on a.id = m.account_id
   where m.user_id = (select auth.uid()) and m.role = 'owner' and a.kind = 'company' and a.archived_at is null
     and exists (select 1 from public.account_members o where o.account_id = a.id and o.user_id <> m.user_id)
  union all
  select 'insurance', null where exists (select 1 from public.policies where tenant_id = (select auth.uid()))
                              or exists (select 1 from public.claims where submitted_by = (select auth.uid()))
  union all
  select 'staff', null where exists (select 1 from public.staff where user_id = (select auth.uid()))
  union all
  select 'records', null where exists (
    with mine as (
      select a.id from public.accounts a where a.personal_user_id = (select auth.uid())
      union
      select m.account_id from public.account_members m
       where m.user_id = (select auth.uid())
         and not exists (select 1 from public.account_members o where o.account_id = m.account_id and o.user_id <> m.user_id)
    )
    select 1 from mine where exists (select 1 from public.properties p where p.account_id = mine.id)
                          or exists (select 1 from public.leases l where l.account_id = mine.id or l.tenant_account_id = mine.id)
                          or exists (select 1 from public.lease_requests r where r.tenant_account_id = mine.id or r.landlord_account_id = mine.id)
  );
$$;

-- ---------- Cégeim: one's own pending access requests, with the company's name ----------
-- The requester is not a member yet, so accounts RLS hides the company; this shows only what they asked for.
create or replace function public.my_access_requests()
returns table (id uuid, account_id uuid, name text, tax_number text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.account_id, a.name, a.tax_number, r.created_at
  from public.account_access_requests r join public.accounts a on a.id = r.account_id
  where r.user_id = (select auth.uid()) and r.status = 'pending' and a.archived_at is null
  order by r.created_at desc;
$$;
revoke execute on function public.my_access_requests() from public, anon;
grant execute on function public.my_access_requests() to authenticated;
