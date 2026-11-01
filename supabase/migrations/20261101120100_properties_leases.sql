-- =====================================================================
-- Properties belong to exactly one account and carry a structured address.
-- Leases connect a property (landlord account) with a tenant account.
-- Lease access is computed from the lease's status and dates (Budapest time):
-- nobody has to revoke anything by hand when a lease ends.
-- =====================================================================

create extension if not exists btree_gist with schema extensions;

-- ---------- Properties -----------------------------------------------------------

create type public.property_kind as enum ('flat', 'room', 'house');
create type public.floor_type as enum ('basement', 'ground', 'raised_ground', 'mezzanine', 'numbered', 'attic');

drop index public.properties_owner_idx;
alter table public.properties
  drop column owner_user_id,
  drop column landlord_kind,
  drop column landlord_name,
  drop column landlord_email,
  drop column address_line,
  alter column city drop default,
  alter column postal_code set not null,
  add column account_id     uuid not null references public.accounts (id) on delete restrict,
  add column kind           public.property_kind not null default 'flat',
  add column label          text check (length(label) <= 120),
  add column country_code   text not null default 'HU' check (country_code ~ '^[A-Z]{2}$'),
  add column street_name    text not null check (length(btrim(street_name)) between 1 and 100),
  add column street_type    text not null check (length(btrim(street_type)) between 1 and 30),
  add column house_number   text not null check (length(btrim(house_number)) between 1 and 20),
  add column building       text check (length(building) <= 20),
  add column staircase      text check (length(staircase) <= 20),
  add column floor_type     public.floor_type,
  add column floor_number   smallint,
  add column door           text check (length(door) <= 20),
  add column address_note   text check (length(address_note) <= 200),
  add column parcel_number  text check (parcel_number ~ '^[0-9]{1,6}(/[0-9A-Z]{1,6}){0,3}$'),
  add column google_place_id text check (length(google_place_id) <= 300),
  add column latitude       numeric(9, 6) check (latitude between -90 and 90),
  add column longitude      numeric(9, 6) check (longitude between -180 and 180),
  add column created_by     uuid references public.profiles (id) on delete set null,
  add column archived_at    timestamptz,
  add constraint properties_city_length check (length(btrim(city)) between 1 and 100),
  add constraint properties_hu_postal_code check (country_code <> 'HU' or postal_code ~ '^[0-9]{4}$'),
  add constraint properties_floor check (
    (floor_type = 'numbered' and floor_number is not null and floor_number between 1 and 99)
    or (floor_type is distinct from 'numbered' and floor_number is null)
  ),
  add constraint properties_id_account_key unique (id, account_id);

alter table public.properties
  add column district smallint generated always as (
    case when country_code = 'HU' and city = 'Budapest' and postal_code ~ '^1[0-9]{3}$'
         then substr(postal_code, 2, 2)::smallint end
  ) stored;

comment on table public.properties is 'A rentable flat, room or house. Owned by exactly one account. A flat let by the room = one property per room.';
comment on column public.properties.parcel_number is 'Land registry number (helyrajzi szám), e.g. 29431/0/A/3. Optional.';
comment on column public.properties.district is 'Budapest district, derived from the postcode (1068 → 6).';
create index properties_account_idx on public.properties (account_id);

-- Managers and viewers with a "selected" scope see only these properties.
create table public.account_member_properties (
  account_id  uuid not null,
  user_id     uuid not null,
  property_id uuid not null,
  primary key (account_id, user_id, property_id),
  foreign key (account_id, user_id) references public.account_members (account_id, user_id) on delete cascade,
  foreign key (property_id, account_id) references public.properties (id, account_id) on delete cascade
);
create index account_member_properties_property_idx on public.account_member_properties (property_id);

-- ---------- Leases -----------------------------------------------------------------

create type public.lease_status as enum ('draft', 'pending', 'confirmed', 'closed', 'cancelled');
create type public.lease_phase as enum ('draft', 'pending', 'upcoming', 'active', 'closing', 'closed', 'cancelled');
create type public.lease_party_side as enum ('landlord', 'tenant');
create type public.occupant_role as enum ('co_tenant', 'occupant');

create table public.leases (
  id                    uuid primary key default gen_random_uuid(),
  property_id           uuid not null references public.properties (id) on delete restrict,
  account_id            uuid not null references public.accounts (id) on delete restrict,
  tenant_account_id     uuid references public.accounts (id) on delete restrict,
  status                public.lease_status not null default 'draft',
  start_date            date not null,
  end_date              date,
  termination_date      date,
  monthly_rent          integer not null check (monthly_rent > 0),
  deposit_amount        integer check (deposit_amount >= 0),
  service_charge        integer check (service_charge >= 0),
  payment_day           smallint check (payment_day between 1 and 28),
  landlord_confirmed_at timestamptz,
  tenant_confirmed_at   timestamptz,
  closed_at             timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint leases_dates check (end_date is null or end_date >= start_date),
  constraint leases_termination check (termination_date is null or termination_date >= start_date),
  constraint leases_not_self check (tenant_account_id is distinct from account_id),
  constraint leases_confirmed_has_parties check (
    status not in ('confirmed', 'closed')
    or (tenant_account_id is not null and landlord_confirmed_at is not null and tenant_confirmed_at is not null)
  ),
  constraint leases_closed_at check ((status = 'closed') = (closed_at is not null)),
  constraint leases_no_overlap exclude using gist (
    property_id with =,
    daterange(start_date, least(end_date, termination_date), '[]') with &&
  ) where (status in ('confirmed', 'closed'))
);
comment on table public.leases is 'A property let to a tenant account. account_id = the landlord account managing this lease (kept when a property later changes hands).';
comment on column public.leases.end_date is 'Null for an open-ended lease; it then ends on termination_date.';
create index leases_property_idx on public.leases (property_id);
create index leases_account_idx on public.leases (account_id);
create index leases_tenant_account_idx on public.leases (tenant_account_id);

create trigger leases_updated_at before update on public.leases
  for each row execute function public.set_updated_at();

-- Contract parties as recorded when both sides confirmed (the legal record).
create table public.lease_parties (
  lease_id            uuid not null references public.leases (id) on delete cascade,
  side                public.lease_party_side not null,
  kind                public.account_kind not null,
  name                text not null,
  tax_number          text,
  company_reg_number  text,
  representative_name text,
  address             text,
  email               text,
  phone               text,
  captured_at         timestamptz not null default now(),
  primary key (lease_id, side)
);
comment on table public.lease_parties is 'Snapshot of both parties at confirmation. Later account changes do not alter it.';

create table public.lease_occupants (
  lease_id   uuid not null references public.leases (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.occupant_role not null,
  added_by   uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (lease_id, user_id)
);
comment on table public.lease_occupants is 'co_tenant: party to the lease, keeps read access after closing. occupant: lives there, access ends with the lease.';
create index lease_occupants_user_idx on public.lease_occupants (user_id);

-- Policies hang on the lease.
alter table public.policies add column lease_id uuid references public.leases (id) on delete restrict;
create index policies_lease_idx on public.policies (lease_id);

-- ---------- Phase and access -------------------------------------------------------

create or replace function private.today()
returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Europe/Budapest')::date;
$$;

-- Computed field: select=*,lease_phase from the API.
create or replace function public.lease_phase(l public.leases)
returns public.lease_phase language sql stable set search_path = '' as $$
  select case
    when l.status in ('draft', 'pending', 'closed', 'cancelled') then l.status::text::public.lease_phase
    when private.today() < l.start_date then 'upcoming'
    when least(l.end_date, l.termination_date) is null or private.today() <= least(l.end_date, l.termination_date) then 'active'
    else 'closing'
  end;
$$;

create or replace function private.can_see_property(prop uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.properties p
    join public.account_members m on m.account_id = p.account_id and m.user_id = (select auth.uid())
    where p.id = prop
      and (m.property_scope = 'all'
           or exists (select 1 from public.account_member_properties s
                      where s.account_id = m.account_id and s.user_id = m.user_id and s.property_id = p.id))
  );
$$;

create or replace function private.can_manage_property(prop uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.properties p
    join public.account_members m on m.account_id = p.account_id and m.user_id = (select auth.uid())
    where p.id = prop and m.role in ('owner', 'admin', 'manager')
      and (m.property_scope = 'all'
           or exists (select 1 from public.account_member_properties s
                      where s.account_id = m.account_id and s.user_id = m.user_id and s.property_id = p.id))
  );
$$;

create type private.lease_access_level as enum ('landlord_manage', 'landlord_view', 'tenant', 'tenant_archive', 'occupant');

-- The single decision point for "who may see this lease, and how".
create or replace function private.lease_access(lid uuid)
returns private.lease_access_level language plpgsql stable security definer set search_path = '' as $$
declare
  l public.leases;
  me uuid := auth.uid();
  ph public.lease_phase;
  occ public.occupant_role;
  mem record;
begin
  if me is null then
    return null;
  end if;
  select * into l from public.leases where id = lid;
  if not found then
    return null;
  end if;

  -- Landlord side: members of the managing account (l.account_id), within their property scope.
  select m.role, m.property_scope into mem from public.account_members m where m.account_id = l.account_id and m.user_id = me;
  if found and (mem.property_scope = 'all' or exists (
        select 1 from public.account_member_properties s
        where s.account_id = l.account_id and s.user_id = me and s.property_id = l.property_id)) then
    return case when mem.role in ('owner', 'admin', 'manager') then 'landlord_manage' else 'landlord_view' end::private.lease_access_level;
  end if;

  ph := public.lease_phase(l);
  if ph in ('draft', 'cancelled') then
    return null;
  end if;

  -- Tenant side: members of the tenant account, and co-tenants.
  select role into occ from public.lease_occupants
  where lease_id = lid and user_id = me and removed_at is null;

  if (l.tenant_account_id is not null and private.is_account_member(l.tenant_account_id)) or occ = 'co_tenant' then
    return case when ph = 'closed' then 'tenant_archive' else 'tenant' end;
  end if;

  if occ = 'occupant' and ph in ('upcoming', 'active', 'closing') then
    return 'occupant';
  end if;
  return null;
end;
$$;

-- Tenants (current and past) may read the address of the property they rent(ed).
create or replace function private.has_tenant_view_of_property(prop uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.leases l
    where l.property_id = prop
      and private.lease_access(l.id) in ('tenant', 'tenant_archive', 'occupant')
  );
$$;

-- Owner or admin of the tenant account: may invite or remove household members.
create or replace function private.is_tenant_admin(lid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.leases l
    where l.id = lid and l.tenant_account_id is not null
      and private.has_account_role(l.tenant_account_id, array['owner', 'admin']::public.account_role[])
      and private.lease_access(l.id) = 'tenant'
  );
$$;

-- A lease is created by its landlord side; status changes go through functions.
create or replace function private.guard_lease()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.account_id is distinct from (select account_id from public.properties where id = new.property_id) then
      raise exception 'lease_account_must_own_property' using errcode = '23514';
    end if;
    if private.is_api_user() and not private.is_staff()
       and (new.status <> 'draft' or new.tenant_account_id is not null or new.landlord_confirmed_at is not null
            or new.tenant_confirmed_at is not null or new.closed_at is not null) then
      raise exception 'lease_starts_as_draft' using errcode = '42501';
    end if;
    return new;
  end if;

  if not private.is_api_user() or private.is_staff() then
    return new;
  end if;
  if new.property_id is distinct from old.property_id or new.account_id is distinct from old.account_id
     or new.tenant_account_id is distinct from old.tenant_account_id or new.status is distinct from old.status
     or new.landlord_confirmed_at is distinct from old.landlord_confirmed_at
     or new.tenant_confirmed_at is distinct from old.tenant_confirmed_at or new.closed_at is distinct from old.closed_at then
    raise exception 'lease_status_changes_via_functions' using errcode = '42501';
  end if;
  if old.status in ('closed', 'cancelled') then
    raise exception 'lease_is_final' using errcode = '42501';
  end if;
  -- Once the tenant has been invited, the terms are fixed: what the tenant accepts is what was sent.
  -- Changing them means cancelling and inviting again (pending) or an amendment (confirmed).
  if old.status <> 'draft'
     and (new.start_date, new.end_date, new.monthly_rent, new.deposit_amount, new.service_charge, new.payment_day)
         is distinct from (old.start_date, old.end_date, old.monthly_rent, old.deposit_amount, old.service_charge, old.payment_day) then
    raise exception 'terms_fixed_after_invitation' using errcode = '42501';
  end if;
  -- A notice cannot be backdated.
  if new.termination_date is distinct from old.termination_date and new.termination_date < private.today() then
    raise exception 'notice_cannot_be_backdated' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger leases_guard before insert or update on public.leases
  for each row execute function private.guard_lease();

-- ---------- Lease lifecycle functions ------------------------------------------------

create or replace function private.snapshot_lease_parties(lid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  l public.leases;
  v_side public.lease_party_side;
  acc public.accounts;
  person public.profiles;
begin
  select * into l from public.leases where id = lid;
  foreach v_side in array array['landlord', 'tenant']::public.lease_party_side[] loop
    select * into acc from public.accounts
    where id = case when v_side = 'landlord' then l.account_id else l.tenant_account_id end;
    select * into person from public.profiles where id = acc.personal_user_id;
    insert into public.lease_parties (lease_id, side, kind, name, tax_number, company_reg_number, address, email, phone)
    values (lid, v_side, acc.kind, coalesce(acc.legal_name, person.full_name, acc.name), acc.tax_number, acc.company_reg_number,
            acc.registered_address, person.email, person.phone)
    on conflict (lease_id, side) do nothing;
  end loop;
end;
$$;

create or replace function public.cancel_lease(p_lease_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  l public.leases;
begin
  select * into l from public.leases where id = p_lease_id for update;
  if not found or private.lease_access(p_lease_id) is distinct from 'landlord_manage' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if l.status not in ('draft', 'pending') then
    raise exception 'only_unconfirmed_leases_can_be_cancelled' using errcode = '22023';
  end if;
  update public.leases set status = 'cancelled' where id = p_lease_id;
end;
$$;

-- The landlord closes a lease once move-out is settled; open claims keep it open.
create or replace function public.close_lease(p_lease_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  l public.leases;
begin
  select * into l from public.leases where id = p_lease_id for update;
  if not found or (private.lease_access(p_lease_id) is distinct from 'landlord_manage'
                   and not private.has_staff_role(array['superadmin', 'admin']::public.staff_role[])) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if public.lease_phase(l) <> 'closing' then
    raise exception 'lease_not_in_closing' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.claims c join public.policies p on p.id = c.policy_id
    where p.lease_id = p_lease_id and c.status in ('submitted', 'in_review', 'approved', 'recovering')
  ) then
    raise exception 'open_claim' using errcode = '22023';
  end if;
  update public.leases set status = 'closed', closed_at = now() where id = p_lease_id;
end;
$$;

-- Scheduled (daily): leases in closing for more than the window, with no open claim, close themselves.
create or replace function private.auto_close_leases(window_days int default 60)
returns int language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  update public.leases l set status = 'closed', closed_at = now()
  where l.status = 'confirmed'
    and least(l.end_date, l.termination_date) is not null
    and least(l.end_date, l.termination_date) + window_days < private.today()
    and not exists (
      select 1 from public.claims c join public.policies p on p.id = c.policy_id
      where p.lease_id = l.id and c.status in ('submitted', 'in_review', 'approved', 'recovering')
    );
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function private.auto_close_leases(int) from public, anon, authenticated;

-- ---------- Policies, claims: access through the lease (or the property) ---------------

create or replace function private.can_view_policy(pol uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.policies p
    join public.applications a on a.id = p.application_id
    where p.id = pol
      and (
        p.tenant_id = (select auth.uid())
        or (p.lease_id is not null and private.lease_access(p.lease_id) is not null
            and private.lease_access(p.lease_id) <> 'occupant')
        or (p.lease_id is null and p.property_id is not null and private.can_see_property(p.property_id))
        or (a.referred_by_account_id is not null and private.is_account_member(a.referred_by_account_id))
        or private.is_staff()
      )
  );
$$;

create or replace function private.can_claim_policy(pol uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.policies p
    where p.id = pol and p.status = 'active'
      and (
        (p.lease_id is not null and private.lease_access(p.lease_id) = 'landlord_manage')
        or (p.lease_id is null and p.property_id is not null and private.can_manage_property(p.property_id))
      )
  );
$$;

-- ---------- Access rules ---------------------------------------------------------------

alter table public.account_member_properties enable row level security;
alter table public.leases enable row level security;
alter table public.lease_parties enable row level security;
alter table public.lease_occupants enable row level security;

revoke all on public.properties, public.account_member_properties, public.leases, public.lease_parties, public.lease_occupants
  from anon, authenticated;

grant select, insert on public.properties to authenticated;
grant update (kind, label, postal_code, city, street_name, street_type, house_number, building, staircase,
              floor_type, floor_number, door, address_note, parcel_number, google_place_id, latitude, longitude, archived_at)
  on public.properties to authenticated;
create policy "properties_select_account_tenant_staff" on public.properties for select to authenticated
  using (private.can_see_property(id) or private.has_tenant_view_of_property(id) or private.is_staff());
create policy "properties_insert_account_manager" on public.properties for insert to authenticated
  with check (
    private.has_account_role(account_id, array['owner', 'admin', 'manager']::public.account_role[])
    and created_by = (select auth.uid())
  );
create policy "properties_update_manager_or_staff" on public.properties for update to authenticated
  using (private.can_manage_property(id) or private.is_staff())
  with check (private.can_manage_property(id) or private.is_staff());

grant select, insert, delete on public.account_member_properties to authenticated;
create policy "member_properties_select_same_account" on public.account_member_properties for select to authenticated
  using (private.is_account_member(account_id) or private.is_staff());
create policy "member_properties_write_owner_admin" on public.account_member_properties for insert to authenticated
  with check (private.has_account_role(account_id, array['owner', 'admin']::public.account_role[]));
create policy "member_properties_delete_owner_admin" on public.account_member_properties for delete to authenticated
  using (private.has_account_role(account_id, array['owner', 'admin']::public.account_role[]));

grant select, insert, delete on public.leases to authenticated;
grant update (start_date, end_date, termination_date, monthly_rent, deposit_amount, service_charge, payment_day)
  on public.leases to authenticated;
create policy "leases_select_parties_staff" on public.leases for select to authenticated
  using (private.lease_access(id) is not null or private.is_staff());
create policy "leases_insert_property_manager" on public.leases for insert to authenticated
  with check (private.can_manage_property(property_id) and created_by = (select auth.uid()));
create policy "leases_update_landlord_manager" on public.leases for update to authenticated
  using (private.lease_access(id) = 'landlord_manage' or private.is_staff())
  with check (private.lease_access(id) = 'landlord_manage' or private.is_staff());
create policy "leases_delete_landlord_draft" on public.leases for delete to authenticated
  using (status = 'draft' and private.lease_access(id) = 'landlord_manage');

grant select on public.lease_parties to authenticated;
create policy "lease_parties_select_parties_staff" on public.lease_parties for select to authenticated
  using (private.lease_access(lease_id) in ('landlord_manage', 'landlord_view', 'tenant', 'tenant_archive') or private.is_staff());

grant select on public.lease_occupants to authenticated;
grant update (removed_at) on public.lease_occupants to authenticated;
create policy "lease_occupants_select_parties_staff" on public.lease_occupants for select to authenticated
  using (private.lease_access(lease_id) is not null or private.is_staff());
create policy "lease_occupants_remove_by_landlord_or_tenant_admin" on public.lease_occupants for update to authenticated
  using (removed_at is null and (private.lease_access(lease_id) = 'landlord_manage' or private.is_tenant_admin(lease_id)))
  with check (removed_at is not null);

revoke execute on function public.lease_phase(public.leases) from public, anon;
grant execute on function public.lease_phase(public.leases) to authenticated;
revoke execute on function public.cancel_lease(uuid), public.close_lease(uuid) from public, anon;
grant execute on function public.cancel_lease(uuid), public.close_lease(uuid) to authenticated;

-- Helpers in the private schema: only what access rules need is executable by signed-in users.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.is_staff(), private.has_staff_role(public.staff_role[]), private.is_api_user(),
  private.is_account_member(uuid), private.has_account_role(uuid, public.account_role[]),
  private.can_see_property(uuid), private.can_manage_property(uuid), private.has_tenant_view_of_property(uuid),
  private.lease_access(uuid), private.is_tenant_admin(uuid), private.today(),
  private.can_view_policy(uuid), private.can_claim_policy(uuid)
  to authenticated;
