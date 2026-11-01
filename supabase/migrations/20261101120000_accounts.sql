-- =====================================================================
-- Accounts: who acts. A person gets a personal account at sign-up; companies
-- are accounts too. Members hold a role per account. Replaces organizations.
-- Staff: new roles, disabling, invitations; staff rights require 2FA (aal2).
-- =====================================================================

-- This restructuring assumes the tables it reshapes are still empty (true on 2026-11-01 for
-- staging and production). Stop instead of silently dropping data.
do $$
begin
  if exists (select 1 from public.organizations) or exists (select 1 from public.properties)
     or exists (select 1 from public.applications where referred_by_org_id is not null) then
    raise exception 'accounts migration expects no organizations or properties yet – migrate the data first';
  end if;
end $$;

-- ---------- Staff ----------------------------------------------------------

alter type public.staff_role rename value 'ops' to 'insurance';
alter type public.staff_role add value if not exists 'finance';

alter table public.staff
  add column invited_by  uuid references public.profiles (id) on delete set null,
  add column disabled_at timestamptz;
comment on column public.staff.disabled_at is 'Staff are disabled, never deleted, so their audit trail stays readable.';

-- Staff rights apply only to active staff signed in with a second factor.
create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
     and exists (
       select 1 from public.staff s
       where s.user_id = (select auth.uid()) and s.disabled_at is null
     );
$$;

create or replace function private.has_staff_role(roles public.staff_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_staff()
     and exists (
       select 1 from public.staff s
       where s.user_id = (select auth.uid()) and s.disabled_at is null and s.role = any (roles)
     );
$$;

create table public.staff_invitations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (email = lower(email) and email ~ '^[^@\s]+@keyfly\.app$'),
  role        public.staff_role not null,
  token_hash  bytea not null unique,
  invited_by  uuid references public.profiles (id) on delete set null,
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  constraint staff_invitations_one_outcome check (accepted_at is null or revoked_at is null)
);
comment on table public.staff_invitations is 'Invite-only staff onboarding (admin.keyfly.app). Only the token hash is stored.';
create unique index staff_invitations_open_email_key on public.staff_invitations (email)
  where accepted_at is null and revoked_at is null;

-- ---------- Accounts ----------------------------------------------------------

create type public.account_kind as enum ('person', 'company');
create type public.account_plan as enum ('basic', 'pro', 'business');
create type public.account_role as enum ('owner', 'admin', 'manager', 'viewer');
create type public.property_scope as enum ('all', 'selected');
create type public.start_view as enum ('tenant', 'landlord', 'manager');

create table public.accounts (
  id                  uuid primary key default gen_random_uuid(),
  kind                public.account_kind not null,
  personal_user_id    uuid unique references public.profiles (id) on delete cascade,
  name                text not null check (length(btrim(name)) between 1 and 200),
  legal_name          text check (length(btrim(legal_name)) between 1 and 300),
  tax_number          text check (tax_number ~ '^\d{8}-\d-\d{2}$'),
  company_reg_number  text check (company_reg_number ~ '^\d{2}-\d{2}-\d{6}$'),
  registered_address  text check (length(registered_address) <= 300),
  plan                public.account_plan not null default 'basic',
  is_referral_partner boolean not null default false,
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  archived_at         timestamptz,
  constraint accounts_person_has_user check ((kind = 'person') = (personal_user_id is not null)),
  constraint accounts_company_details check (
    (kind = 'company' and legal_name is not null and tax_number is not null)
    or (kind = 'person' and legal_name is null and tax_number is null and company_reg_number is null and registered_address is null)
  )
);
comment on table public.accounts is 'Who acts: a person (one per user, created at sign-up) or a company. Plan and data belong to the account.';
comment on column public.accounts.plan is 'basic: 1 user · pro: up to 3 users, no admin role · business: unlimited, all roles. Changed by staff or billing only.';

create trigger accounts_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();

create table public.account_members (
  account_id     uuid not null references public.accounts (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  role           public.account_role not null,
  property_scope public.property_scope not null default 'all',
  invited_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  primary key (account_id, user_id),
  constraint account_members_scope_by_role check (role in ('manager', 'viewer') or property_scope = 'all')
);
comment on column public.account_members.property_scope is 'selected: only the properties in account_member_properties.';
create index account_members_user_idx on public.account_members (user_id);
create unique index account_members_one_owner on public.account_members (account_id) where role = 'owner';

-- Plan limits and the personal-account rule, enforced for every writer.
create or replace function private.enforce_account_member()
returns trigger language plpgsql set search_path = '' as $$
declare
  acc public.accounts;
  members int;
begin
  -- Lock the account so concurrent joins cannot exceed the plan limit.
  select * into acc from public.accounts where id = new.account_id for update;
  if acc.kind = 'person' and new.user_id is distinct from acc.personal_user_id then
    raise exception 'personal_account_single_member' using errcode = '23514';
  end if;
  if (acc.plan = 'basic' and new.role <> 'owner') or (acc.plan = 'pro' and new.role = 'admin') then
    raise exception 'role_not_in_plan' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    select count(*) into members from public.account_members where account_id = new.account_id;
    if (acc.plan = 'basic' and members >= 1) or (acc.plan = 'pro' and members >= 3) then
      raise exception 'plan_member_limit' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger account_members_enforce before insert or update on public.account_members
  for each row execute function private.enforce_account_member();

-- The last owner cannot leave: ownership is transferred, never dropped.
create or replace function private.keep_account_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner')
     and exists (select 1 from public.accounts where id = old.account_id)
     and not exists (select 1 from public.account_members where account_id = old.account_id and role = 'owner' and user_id <> old.user_id) then
    raise exception 'account_needs_an_owner' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

create constraint trigger account_members_keep_owner after update or delete on public.account_members
  deferrable initially deferred
  for each row execute function private.keep_account_owner();

-- ---------- Profiles: first-use choice, personal account ------------------------

alter table public.profiles add column start_view public.start_view;
comment on column public.profiles.start_view is 'Answer to "How will you use Keyfly?" – only picks the start screen.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc uuid;
  display text := left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(new.email, '@', 1), ''), 'Keyfly'), 200);
begin
  insert into public.profiles (id, email, full_name, phone, locale)
  values (
    new.id,
    new.email,
    left(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 200),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en'::public.locale else 'hu'::public.locale end
  )
  on conflict (id) do nothing;

  insert into public.accounts (kind, personal_user_id, name, created_by)
  values ('person', new.id, display, new.id)
  on conflict (personal_user_id) do nothing
  returning id into acc;

  if acc is not null then
    insert into public.account_members (account_id, user_id, role) values (acc, new.id, 'owner');
  end if;
  return new;
end;
$$;

-- The personal account carries the person's current name.
create or replace function private.sync_personal_account_name()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.full_name is distinct from old.full_name and nullif(btrim(new.full_name), '') is not null then
    update public.accounts set name = btrim(new.full_name) where personal_user_id = new.id;
  end if;
  return new;
end;
$$;

create trigger profiles_sync_personal_account after update of full_name on public.profiles
  for each row execute function private.sync_personal_account_name();

-- Existing users get their personal account now.
insert into public.accounts (kind, personal_user_id, name, created_by)
select 'person', p.id, coalesce(nullif(btrim(p.full_name), ''), split_part(p.email, '@', 1), 'Keyfly'), p.id
from public.profiles p
on conflict (personal_user_id) do nothing;

insert into public.account_members (account_id, user_id, role)
select a.id, a.personal_user_id, 'owner' from public.accounts a where a.kind = 'person'
on conflict do nothing;

-- ---------- Organizations → accounts ---------------------------------------------

alter table public.applications drop constraint applications_referred_by_org_id_fkey;
drop index public.applications_org_idx;
alter table public.applications rename column referred_by_org_id to referred_by_account_id;
alter table public.applications
  add constraint applications_referred_by_account_id_fkey
  foreign key (referred_by_account_id) references public.accounts (id) on delete set null;
create index applications_referrer_idx on public.applications (referred_by_account_id);

drop policy "applications_select_tenant_agency_staff" on public.applications;
drop policy "properties_select_landlord_side_or_staff" on public.properties;
drop policy "properties_insert_landlord_or_org" on public.properties;
drop policy "properties_update_landlord_side_or_staff" on public.properties;

alter table public.properties drop column org_id;
drop table public.organization_members;
drop table public.organizations;
drop function private.is_org_member(uuid);
drop function private.is_org_admin(uuid);
drop type public.org_role;
drop type public.org_type;

-- ---------- Account helpers ------------------------------------------------------

create or replace function private.is_account_member(acc uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.account_members m where m.account_id = acc and m.user_id = (select auth.uid()));
$$;

create or replace function private.has_account_role(acc uuid, roles public.account_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.account_members m
    where m.account_id = acc and m.user_id = (select auth.uid()) and m.role = any (roles)
  );
$$;

-- The referrer column moved; tenants still may not change it.
create or replace function private.guard_application()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not private.is_api_user() or private.is_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.quoted_rate_pct is not null or new.quoted_premium_monthly is not null
       or new.quoted_premium_yearly is not null or new.max_coverage is not null
       or new.offer_expires_at is not null or new.decision_reason is not null
       or new.decided_at is not null or new.referred_by_account_id is not null then
      raise exception 'offer_fields_are_server_only' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.tenant_id is distinct from old.tenant_id
     or new.referred_by_account_id is distinct from old.referred_by_account_id
     or new.quoted_rate_pct is distinct from old.quoted_rate_pct
     or new.quoted_premium_monthly is distinct from old.quoted_premium_monthly
     or new.quoted_premium_yearly is distinct from old.quoted_premium_yearly
     or new.max_coverage is distinct from old.max_coverage
     or new.offer_expires_at is distinct from old.offer_expires_at
     or new.decision_reason is distinct from old.decision_reason
     or new.decided_at is distinct from old.decided_at then
    raise exception 'protected_field_change' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- Referral partners never read application rows (they hold income data); they get
-- referral_status() below, which returns no income or personal fields.
create policy "applications_select_tenant_staff" on public.applications for select to authenticated
  using (tenant_id = (select auth.uid()) or private.is_staff());

create or replace function public.referral_status(p_account_id uuid)
returns table (application_id uuid, status public.application_status, monthly_rent integer, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not (private.has_account_role(p_account_id, array['owner', 'admin']::public.account_role[])
          and (select a.is_referral_partner from public.accounts a where a.id = p_account_id)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select ap.id, ap.status, ap.monthly_rent, ap.created_at from public.applications ap
    where ap.referred_by_account_id = p_account_id order by ap.created_at desc;
end;
$$;
revoke execute on function public.referral_status(uuid) from public, anon;
grant execute on function public.referral_status(uuid) to authenticated;

-- ---------- Access: accounts, members, staff invitations -----------------------

alter table public.accounts enable row level security;
alter table public.account_members enable row level security;
alter table public.staff_invitations enable row level security;

revoke all on public.accounts, public.account_members, public.staff_invitations from anon, authenticated;

grant select on public.accounts to authenticated;
grant update (name, legal_name, registered_address, company_reg_number) on public.accounts to authenticated;
create policy "accounts_select_member_or_staff" on public.accounts for select to authenticated
  using (private.is_account_member(id) or private.is_staff());
create policy "accounts_update_owner_admin_or_staff" on public.accounts for update to authenticated
  using (private.has_account_role(id, array['owner', 'admin']::public.account_role[]) or private.is_staff())
  with check (private.has_account_role(id, array['owner', 'admin']::public.account_role[]) or private.is_staff());

grant select, delete on public.account_members to authenticated;
grant update (role, property_scope) on public.account_members to authenticated;
create policy "account_members_select_same_account_or_staff" on public.account_members for select to authenticated
  using (private.is_account_member(account_id) or private.is_staff());
create policy "account_members_update_owner_admin" on public.account_members for update to authenticated
  using (private.has_account_role(account_id, array['owner', 'admin']::public.account_role[]) and user_id <> (select auth.uid()))
  with check (private.has_account_role(account_id, array['owner', 'admin']::public.account_role[]) and role <> 'owner');
create policy "account_members_delete_owner_admin_or_self" on public.account_members for delete to authenticated
  using (
    (private.has_account_role(account_id, array['owner', 'admin']::public.account_role[]) and role <> 'owner')
    or (user_id = (select auth.uid()) and role <> 'owner')
  );

grant select on public.staff_invitations to authenticated;
create policy "staff_invitations_select_superadmin" on public.staff_invitations for select to authenticated
  using (private.has_staff_role(array['superadmin']::public.staff_role[]));

grant update (start_view) on public.profiles to authenticated;

-- New companies are created through create_company_account (the creator becomes owner).
create or replace function public.create_company_account(
  p_legal_name text, p_tax_number text, p_company_reg_number text default null,
  p_registered_address text default null, p_name text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  acc uuid;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  insert into public.accounts (kind, name, legal_name, tax_number, company_reg_number, registered_address, created_by)
  values ('company', coalesce(nullif(btrim(p_name), ''), btrim(p_legal_name)), btrim(p_legal_name), btrim(p_tax_number),
          nullif(btrim(p_company_reg_number), ''), nullif(btrim(p_registered_address), ''), me)
  returning id into acc;
  insert into public.account_members (account_id, user_id, role) values (acc, me, 'owner');
  return acc;
end;
$$;

revoke execute on function public.create_company_account(text, text, text, text, text) from public, anon;
grant execute on function public.create_company_account(text, text, text, text, text) to authenticated;

-- Ownership moves to an existing member; the previous owner stays as admin (Business) or manager.
create or replace function public.transfer_account_ownership(p_account_id uuid, p_new_owner uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  acc public.accounts;
begin
  select * into acc from public.accounts where id = p_account_id for update;
  if not private.has_account_role(p_account_id, array['owner']::public.account_role[]) or acc.kind = 'person' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_new_owner = me or not exists (select 1 from public.account_members where account_id = p_account_id and user_id = p_new_owner) then
    raise exception 'new_owner_must_be_a_member' using errcode = '22023';
  end if;
  update public.account_members set role = case when acc.plan = 'business' then 'admin' else 'manager' end::public.account_role, property_scope = 'all'
    where account_id = p_account_id and user_id = me;
  update public.account_members set role = 'owner', property_scope = 'all'
    where account_id = p_account_id and user_id = p_new_owner;
  delete from public.account_member_properties where account_id = p_account_id and user_id = p_new_owner;
end;
$$;
revoke execute on function public.transfer_account_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_account_ownership(uuid, uuid) to authenticated;
