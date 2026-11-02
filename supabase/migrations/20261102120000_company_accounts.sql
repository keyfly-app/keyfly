-- =====================================================================
-- Keyfly – company accounts (canvas "App v2.3": Cég hozzáadása, Csapat, Csomagok – új logika)
--  1. plans: "business" is now "enterprise"; every plan has unlimited users and all four roles.
--     Enterprise only: access limited to selected properties; it is enabled by Keyfly staff.
--  2. one company = one account: the first 8 digits of the tax number are unique among live companies
--  3. every company account has a URL slug (/c/<slug>/…) and the date NAV confirmed its data
--  4. access requests: someone who finds their company already on Keyfly asks to join;
--     the owner or an admin approves (with a role) or declines. Enterprise accounts are invitation-only.
--  5. the "manager" start view is retired (company work happens in a company account): such profiles see the landlord view
-- =====================================================================

-- ---------- 1. plans ---------------------------------------------------------------

alter type public.account_plan rename value 'business' to 'enterprise';
comment on column public.accounts.plan is
  'basic (free) · pro (paid features) · enterprise (custom, enabled by Keyfly). Users are unlimited on every plan. Changed by staff or billing only.';

-- The personal-account rule stays; plans no longer limit members or roles.
create or replace function private.enforce_account_member()
returns trigger language plpgsql set search_path = '' as $$
declare
  acc public.accounts;
begin
  select * into acc from public.accounts where id = new.account_id for update;
  if acc.kind = 'person' and new.user_id is distinct from acc.personal_user_id then
    raise exception 'personal_account_single_member' using errcode = '23514';
  end if;
  if new.property_scope = 'selected' and acc.plan <> 'enterprise' then
    raise exception 'scope_only_on_enterprise' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.create_account_invitation(
  p_account_id uuid, p_email text, p_role public.account_role,
  p_scope public.property_scope default 'all', p_property_ids uuid[] default '{}'
) returns text language plpgsql security definer set search_path = '' as $$
declare
  acc public.accounts;
  token text := private.new_token();
  inv uuid;
  v_email text := lower(btrim(p_email));
begin
  if not private.has_account_role(p_account_id, array['owner', 'admin']::public.account_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into acc from public.accounts where id = p_account_id for update;
  if acc.kind = 'person' then
    raise exception 'personal_account_single_member' using errcode = '23514';
  end if;
  if p_role = 'owner' then
    raise exception 'owner_is_transferred_not_invited' using errcode = '23514';
  end if;
  if p_scope = 'selected' and acc.plan <> 'enterprise' then
    raise exception 'scope_only_on_enterprise' using errcode = '23514';
  end if;
  if p_role = 'admin' and p_scope <> 'all' then
    raise exception 'scope_only_for_managers_and_viewers' using errcode = '23514';
  end if;
  if exists (select 1 from public.account_members m join public.profiles p on p.id = m.user_id
             where m.account_id = p_account_id and lower(p.email) = v_email) then
    raise exception 'already_member' using errcode = '23505';
  end if;
  -- Re-sending replaces the open invitation to the same address.
  update public.invitations set revoked_at = now()
  where kind = 'account_member' and account_id = p_account_id and invitations.email = v_email
    and accepted_at is null and declined_at is null and revoked_at is null;
  insert into public.invitations (kind, email, account_id, account_role, property_scope, token_hash, invited_by, expires_at)
  values ('account_member', v_email, p_account_id, p_role, p_scope, private.token_hash(token), auth.uid(), now() + interval '7 days')
  returning id into inv;
  if p_scope = 'selected' then
    insert into public.invitation_properties (invitation_id, account_id, property_id)
    select inv, p_account_id, unnest(p_property_ids);
  end if;
  return token;
end;
$$;

-- Ownership moves to an existing member; the previous owner stays as admin.
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
  update public.account_members set role = 'admin', property_scope = 'all' where account_id = p_account_id and user_id = me;
  update public.account_members set role = 'owner', property_scope = 'all' where account_id = p_account_id and user_id = p_new_owner;
  delete from public.account_member_properties where account_id = p_account_id and user_id = p_new_owner;
end;
$$;

-- The activity log is an Enterprise feature.
create or replace function public.activity_log(p_account_id uuid default null, p_limit int default 100)
returns table (
  id bigint, occurred_at timestamptz, actor_id uuid, actor_is_staff boolean, action text,
  table_name text, row_key text, account_id uuid, changes jsonb
) language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if p_account_id is null then
    if not private.has_staff_role(array['superadmin', 'admin']::public.staff_role[]) then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
    return query select e.* from audit.events e order by e.id desc limit least(p_limit, 500);
    return;
  end if;
  if not (private.has_staff_role(array['superadmin', 'admin']::public.staff_role[])
          or (private.has_account_role(p_account_id, array['owner', 'admin']::public.account_role[])
              and (select a.plan from public.accounts a where a.id = p_account_id) = 'enterprise')) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query select e.* from audit.events e where e.account_id = p_account_id order by e.id desc limit least(p_limit, 500);
end;
$$;

-- ---------- 2.–3. one company, one account; slug; NAV check ---------------------------

alter table public.accounts
  add column slug text,
  add column nav_verified_at timestamptz,
  add constraint accounts_slug_format check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 60),
  add constraint accounts_company_has_slug check (kind = 'person' or slug is not null) not valid;
comment on column public.accounts.slug is 'Company URL part: app.keyfly.app/c/<slug>/…. Set at creation, unique.';
comment on column public.accounts.nav_verified_at is 'When the legal name, tax number and registered office came from NAV (via számlázz.hu).';

create unique index accounts_slug_unique on public.accounts (slug) where slug is not null;
create unique index accounts_company_tax_unique on public.accounts (left(tax_number, 8))
  where kind = 'company' and archived_at is null;

-- "Duna Lakáskezelő Kft." → "duna-lakaskezelo-kft"; a number is added when taken.
create or replace function private.company_slug(p_name text)
returns text language plpgsql stable set search_path = '' as $$
declare
  base text := trim(both '-' from regexp_replace(
    translate(lower(p_name), 'áàâäãåéèêëíìîïóòôöõőúùûüűçñ', 'aaaaaaeeeeiiiiooooooouuuuucn'), '[^a-z0-9]+', '-', 'g'));
  candidate text;
  n int := 1;
begin
  base := left(coalesce(nullif(base, ''), 'ceg'), 50);
  if length(base) < 2 then base := base || '-ceg'; end if;
  base := trim(both '-' from base);
  candidate := base;
  while exists (select 1 from public.accounts where slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end;
$$;
revoke execute on function private.company_slug(text) from public, anon, authenticated;

update public.accounts set slug = private.company_slug(name) where kind = 'company' and slug is null;

-- Any company row (staff tools, tests) gets its slug on insert.
create or replace function private.fill_company_slug()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.kind = 'company' and new.slug is null then
    new.slug := private.company_slug(new.name);
  end if;
  return new;
end;
$$;
revoke execute on function private.fill_company_slug() from public, anon, authenticated;
create trigger accounts_fill_slug before insert on public.accounts for each row execute function private.fill_company_slug();
alter table public.accounts validate constraint accounts_company_has_slug;

-- Only the server creates companies, after the NAV check, with its secret key (service_role): users cannot
-- claim a tax number with made-up data. p_owner: the signed-in user who added it; p_name: the display name.
drop function public.create_company_account(text, text, text, text, text);
create function public.create_company_account(
  p_owner uuid, p_legal_name text, p_tax_number text, p_registered_address text default null, p_name text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  acc uuid;
  v_name text := coalesce(nullif(btrim(p_name), ''), btrim(p_legal_name));
begin
  if not exists (select 1 from public.profiles where id = p_owner) then
    raise exception 'owner_not_found' using errcode = '22023';
  end if;
  if exists (select 1 from public.accounts where kind = 'company' and archived_at is null and left(tax_number, 8) = left(btrim(p_tax_number), 8)) then
    raise exception 'company_exists' using errcode = '23505';
  end if;
  insert into public.accounts (kind, name, legal_name, tax_number, registered_address, created_by, nav_verified_at)
  values ('company', v_name, btrim(p_legal_name), btrim(p_tax_number), nullif(btrim(p_registered_address), ''), p_owner, now())
  returning id into acc;
  insert into public.account_members (account_id, user_id, role) values (acc, p_owner, 'owner');
  return acc;
end;
$$;
revoke execute on function public.create_company_account(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_company_account(uuid, text, text, text, text) to service_role;

-- ---------- 4. access requests ---------------------------------------------------------

create type public.access_request_status as enum ('pending', 'approved', 'declined', 'cancelled');

create table public.account_access_requests (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  message     text check (length(message) <= 500),
  status      public.access_request_status not null default 'pending',
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  decided_by  uuid references public.profiles (id) on delete set null
);
comment on table public.account_access_requests is
  'Someone asks to join a company account (found by tax number). Owner or admin decides. Kept 1 year after the decision.';
create unique index account_access_requests_one_pending on public.account_access_requests (account_id, user_id) where status = 'pending';
create index account_access_requests_account_idx on public.account_access_requests (account_id, status);

alter table public.account_access_requests enable row level security;
revoke all on public.account_access_requests from anon, authenticated;
grant select on public.account_access_requests to authenticated;
-- The requester sees their own; owners and admins see their account's. Changes only through the functions below.
create policy "access_requests_select_own_or_owner_admin" on public.account_access_requests for select to authenticated
  using (user_id = (select auth.uid()) or private.has_account_role(account_id, array['owner', 'admin']::public.account_role[]) or private.is_staff());

-- What the "add a company" screen may know about a tax number: whether a live company has it,
-- its display name, whether it is invitation-only, and the caller's own relation to it.
create or replace function public.company_lookup(p_tax8 text)
returns table (account_id uuid, name text, slug text, invitation_only boolean, i_am_member boolean, requested_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.name,
         case when private.is_account_member(a.id) then a.slug end,
         a.plan = 'enterprise',
         private.is_account_member(a.id),
         (select r.created_at from public.account_access_requests r
          where r.account_id = a.id and r.user_id = (select auth.uid()) and r.status = 'pending')
  from public.accounts a
  where (select auth.uid()) is not null and p_tax8 ~ '^\d{8}$'
    and a.kind = 'company' and a.archived_at is null and left(a.tax_number, 8) = p_tax8;
$$;

create or replace function public.request_company_access(p_account_id uuid, p_message text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  acc public.accounts;
  req uuid;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  select * into acc from public.accounts where id = p_account_id and kind = 'company' and archived_at is null;
  if acc.id is null then
    raise exception 'company_not_found' using errcode = '22023';
  end if;
  if acc.plan = 'enterprise' then
    raise exception 'invitation_only' using errcode = '42501';
  end if;
  if private.is_account_member(p_account_id) then
    raise exception 'already_member' using errcode = '23505';
  end if;
  if exists (select 1 from public.account_access_requests where account_id = p_account_id and user_id = me and status = 'pending') then
    raise exception 'already_requested' using errcode = '23505';
  end if;
  insert into public.account_access_requests (account_id, user_id, message)
  values (p_account_id, me, nullif(btrim(p_message), ''))
  returning id into req;
  return req;
end;
$$;

-- Approve (with a role) or decline. Returns who asked, so the decider's side can email them.
create or replace function public.decide_access_request(
  p_request_id uuid, p_approve boolean, p_role public.account_role default 'manager'
) returns table (requester_email text, requester_name text, requester_locale public.locale, account_name text, account_slug text)
language plpgsql security definer set search_path = '' as $$
declare
  r public.account_access_requests;
begin
  select * into r from public.account_access_requests where id = p_request_id for update;
  if r.id is null or not private.has_account_role(r.account_id, array['owner', 'admin']::public.account_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if r.status <> 'pending' then
    raise exception 'request_closed' using errcode = '22023';
  end if;
  if p_approve then
    if p_role = 'owner' then
      raise exception 'owner_is_transferred_not_invited' using errcode = '23514';
    end if;
    insert into public.account_members (account_id, user_id, role, invited_by)
    values (r.account_id, r.user_id, p_role, auth.uid())
    on conflict (account_id, user_id) do nothing;
  end if;
  update public.account_access_requests
    set status = case when p_approve then 'approved' else 'declined' end::public.access_request_status,
        decided_at = now(), decided_by = auth.uid()
    where id = p_request_id;
  return query
    select p.email, p.full_name, p.locale, a.name, a.slug
    from public.profiles p, public.accounts a
    where p.id = r.user_id and a.id = r.account_id;
end;
$$;

create or replace function public.cancel_access_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.account_access_requests set status = 'cancelled', decided_at = now()
  where id = p_request_id and user_id = (select auth.uid()) and status = 'pending';
  if not found then
    raise exception 'request_closed' using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.company_lookup(text), public.request_company_access(uuid, text),
  public.decide_access_request(uuid, boolean, public.account_role), public.cancel_access_request(uuid) from public, anon;
grant execute on function public.company_lookup(text), public.request_company_access(uuid, text),
  public.decide_access_request(uuid, boolean, public.account_role), public.cancel_access_request(uuid) to authenticated;

-- Requesters and owners/admins read each other's names through this, not through profiles.
create or replace function public.account_access_requests_list(p_account_id uuid)
returns table (id uuid, user_id uuid, full_name text, email text, message text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.user_id, p.full_name, p.email, r.message, r.created_at
  from public.account_access_requests r join public.profiles p on p.id = r.user_id
  where r.account_id = p_account_id and r.status = 'pending'
    and private.has_account_role(p_account_id, array['owner', 'admin']::public.account_role[])
  order by r.created_at;
$$;
revoke execute on function public.account_access_requests_list(uuid) from public, anon;
grant execute on function public.account_access_requests_list(uuid) to authenticated;

-- Retention: decided requests go after a year (runs with the other daily clean-ups if pg_cron is there).
create or replace function private.purge_access_requests()
returns void language sql security definer set search_path = '' as $$
  delete from public.account_access_requests where status <> 'pending' and decided_at < now() - interval '1 year';
$$;
revoke execute on function private.purge_access_requests() from public, anon, authenticated;

-- ---------- 5. start view --------------------------------------------------------------

update public.profiles set start_view = 'landlord' where start_view = 'manager';

-- ---------- Team list ------------------------------------------------------------------

-- Members of an account with name and email, for the people who work in it (profiles stay private otherwise).
create or replace function public.account_members_list(p_account_id uuid)
returns table (user_id uuid, full_name text, email text, role public.account_role, property_scope public.property_scope, joined_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id, p.full_name, p.email, m.role, m.property_scope, m.created_at
  from public.account_members m join public.profiles p on p.id = m.user_id
  where m.account_id = p_account_id and private.is_account_member(p_account_id)
  order by (m.role = 'owner') desc, m.created_at;
$$;
revoke execute on function public.account_members_list(uuid) from public, anon;
grant execute on function public.account_members_list(uuid) to authenticated;

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron not available – access request clean-up not scheduled';
    return;
  end if;
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.unschedule(jobid) from cron.job where jobname = 'purge-access-requests';
  perform cron.schedule('purge-access-requests', '20 2 * * *', 'select private.purge_access_requests()');
end $$;
