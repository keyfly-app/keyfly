-- =====================================================================
-- The tenant invites the landlord.
--
-- The tenant enters what they know (address, terms, the landlord's email) as a lease request.
-- The landlord opens the invitation, picks the account that manages the lease, creates the
-- property from the tenant's address (or links an existing one), checks the terms and approves.
-- Unchanged terms: the lease is confirmed at once. Changed or added terms: the tenant approves
-- them first. All writes go through the functions below; the tenant side reads its requests.
-- =====================================================================

create type public.lease_request_status as enum ('pending_landlord', 'pending_tenant', 'confirmed', 'declined', 'cancelled');

create table public.lease_requests (
  id                 uuid primary key default gen_random_uuid(),
  tenant_account_id  uuid not null references public.accounts (id) on delete restrict,
  status             public.lease_request_status not null default 'pending_landlord',
  -- Address, same rules as public.properties.
  country_code       text not null default 'HU' check (country_code ~ '^[A-Z]{2}$'),
  postal_code        text not null,
  city               text not null check (length(btrim(city)) between 1 and 100),
  street_name        text not null check (length(btrim(street_name)) between 1 and 100),
  street_type        text not null check (length(btrim(street_type)) between 1 and 30),
  house_number       text not null check (length(btrim(house_number)) between 1 and 20),
  building           text check (length(building) <= 20),
  staircase          text check (length(staircase) <= 20),
  floor_type         public.floor_type,
  floor_number       smallint,
  door               text check (length(door) <= 20),
  -- Terms as the tenant knows them.
  start_date         date not null,
  end_date           date,
  monthly_rent       integer not null check (monthly_rent > 0),
  deposit_amount     integer check (deposit_amount >= 0),
  landlord_email     text not null check (landlord_email = lower(landlord_email) and landlord_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(landlord_email) <= 254),
  landlord_name      text check (length(btrim(landlord_name)) between 1 and 200),
  -- Filled in when the landlord takes over.
  landlord_account_id uuid references public.accounts (id) on delete restrict,
  lease_id           uuid unique references public.leases (id) on delete restrict,
  reminder_count     smallint not null default 0 check (reminder_count between 0 and 3),
  last_sent_at       timestamptz not null default now(),
  decided_at         timestamptz,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint lease_requests_hu_postal_code check (country_code <> 'HU' or postal_code ~ '^[0-9]{4}$'),
  constraint lease_requests_floor check (
    (floor_type = 'numbered' and floor_number is not null and floor_number between 1 and 99)
    or (floor_type is distinct from 'numbered' and floor_number is null)
  ),
  constraint lease_requests_dates check (end_date is null or end_date >= start_date),
  constraint lease_requests_lease_when_taken_over check (status not in ('pending_tenant', 'confirmed') or (lease_id is not null and landlord_account_id is not null)),
  constraint lease_requests_decided check ((status in ('confirmed', 'declined', 'cancelled')) = (decided_at is not null))
);
comment on table public.lease_requests is 'A lease started by the tenant: what the tenant entered, waiting for the landlord (and, if the landlord changed the terms, for the tenant again).';
comment on column public.lease_requests.reminder_count is 'Reminders sent to the landlord (at most 3, one per 24 hours).';
create index lease_requests_tenant_account_idx on public.lease_requests (tenant_account_id);
create index lease_requests_landlord_account_idx on public.lease_requests (landlord_account_id);
create index lease_requests_created_by_idx on public.lease_requests (created_by);

create trigger lease_requests_updated_at before update on public.lease_requests
  for each row execute function public.set_updated_at();
create trigger lease_requests_audit after insert or update or delete on public.lease_requests
  for each row execute function audit.record('id');

-- ---------- Invitations: the landlord kind ----------------------------------------------

alter table public.invitations add column lease_request_id uuid references public.lease_requests (id) on delete cascade;
create index invitations_lease_request_idx on public.invitations (lease_request_id);

alter table public.invitations drop constraint invitations_target;
alter table public.invitations add constraint invitations_target check (
  (kind = 'account_member' and account_id is not null and account_role is not null and account_role <> 'owner'
     and property_scope is not null and lease_id is null and occupant_role is null and lease_request_id is null)
  or (kind = 'lease_tenant' and lease_id is not null and account_id is null and account_role is null and occupant_role is null
     and lease_request_id is null)
  or (kind = 'lease_occupant' and lease_id is not null and occupant_role is not null and account_id is null and account_role is null
     and lease_request_id is null)
  or (kind = 'lease_landlord' and lease_request_id is not null and account_id is null and lease_id is null and account_role is null
     and occupant_role is null and property_scope is null)
);

drop index public.invitations_open_key;
create unique index invitations_open_key on public.invitations (kind, coalesce(account_id, lease_id, lease_request_id), email)
  where accepted_at is null and declined_at is null and revoked_at is null;

grant select (lease_request_id) on public.invitations to authenticated;

-- Owner or admin of the account that rents: may see, remind and cancel the request.
create or replace function private.is_lease_request_admin(rid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lease_requests r
    where r.id = rid and private.has_account_role(r.tenant_account_id, array['owner', 'admin']::public.account_role[])
  );
$$;

drop policy "invitations_select_inviting_side" on public.invitations;
create policy "invitations_select_inviting_side" on public.invitations for select to authenticated
  using (
    (account_id is not null and private.has_account_role(account_id, array['owner', 'admin']::public.account_role[]))
    or (kind = 'lease_tenant' and private.lease_access(lease_id) = 'landlord_manage')
    or (kind = 'lease_occupant' and private.is_tenant_admin(lease_id))
    or (kind = 'lease_landlord' and private.is_lease_request_admin(lease_request_id))
    or private.is_staff()
  );

-- ---------- Tenant: create, remind, approve changes, cancel -----------------------------

-- Returns the invitation link token (it travels only in the email) and its expiry.
create or replace function public.create_lease_request(
  p_postal_code text, p_city text, p_street_name text, p_street_type text, p_house_number text,
  p_start_date date, p_monthly_rent integer, p_landlord_email text,
  p_building text default null, p_staircase text default null, p_floor_type public.floor_type default null,
  p_floor_number smallint default null, p_door text default null, p_end_date date default null,
  p_deposit_amount integer default null, p_landlord_name text default null, p_tenant_account_id uuid default null
) returns table (request_id uuid, token text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  me uuid := auth.uid();
  tenant_acc uuid;
  v_email text := lower(btrim(p_landlord_email));
  v_token text := private.new_token();
  v_expires timestamptz := now() + interval '7 days';
  rid uuid;
begin
  if me is null or private.my_email() is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  tenant_acc := coalesce(p_tenant_account_id, (select a.id from public.accounts a where a.personal_user_id = me));
  if not private.has_account_role(tenant_acc, array['owner', 'admin']::public.account_role[]) then
    raise exception 'not_allowed_for_this_account' using errcode = '42501';
  end if;
  if v_email = private.my_email() then
    raise exception 'cannot_invite_yourself' using errcode = '22023';
  end if;
  if p_end_date is not null and p_end_date < private.today() then
    raise exception 'lease_already_ended' using errcode = '22023';
  end if;
  if (select count(*) from public.lease_requests r
      where r.tenant_account_id = tenant_acc and r.status in ('pending_landlord', 'pending_tenant')) >= 5 then
    raise exception 'too_many_open_requests' using errcode = '23514';
  end if;

  insert into public.lease_requests (tenant_account_id, postal_code, city, street_name, street_type, house_number,
                                     building, staircase, floor_type, floor_number, door,
                                     start_date, end_date, monthly_rent, deposit_amount, landlord_email, landlord_name, created_by)
  values (tenant_acc, btrim(p_postal_code), btrim(p_city), btrim(p_street_name), btrim(p_street_type), btrim(p_house_number),
          nullif(btrim(p_building), ''), nullif(btrim(p_staircase), ''), p_floor_type, p_floor_number, nullif(btrim(p_door), ''),
          p_start_date, p_end_date, p_monthly_rent, p_deposit_amount, v_email, nullif(btrim(p_landlord_name), ''), me)
  returning id into rid;

  insert into public.invitations (kind, email, lease_request_id, token_hash, invited_by, expires_at)
  values ('lease_landlord', v_email, rid, private.token_hash(v_token), me, v_expires);
  return query select rid, v_token, v_expires;
end;
$$;

-- A new link to the landlord: the old one stops working and the new one is valid for 7 days.
create or replace function public.remind_lease_request(p_request_id uuid)
returns table (token text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  r public.lease_requests;
  v_token text := private.new_token();
  v_expires timestamptz := now() + interval '7 days';
begin
  select * into r from public.lease_requests where id = p_request_id for update;
  if not found or not private.is_lease_request_admin(p_request_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if r.status <> 'pending_landlord' then
    raise exception 'not_waiting_for_landlord' using errcode = '22023';
  end if;
  if r.reminder_count >= 3 then
    raise exception 'reminder_limit' using errcode = '22023';
  end if;
  if r.last_sent_at > now() - interval '24 hours' then
    raise exception 'reminder_too_soon' using errcode = '22023';
  end if;
  update public.invitations i set revoked_at = now()
  where i.lease_request_id = p_request_id and i.accepted_at is null and i.declined_at is null and i.revoked_at is null;
  insert into public.invitations (kind, email, lease_request_id, token_hash, invited_by, expires_at)
  values ('lease_landlord', r.landlord_email, p_request_id, private.token_hash(v_token), auth.uid(), v_expires);
  update public.lease_requests set reminder_count = reminder_count + 1, last_sent_at = now() where id = p_request_id;
  return query select v_token, v_expires;
end;
$$;

-- Withdraw while waiting for the landlord, or turn down the landlord's changed terms.
create or replace function public.cancel_lease_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.lease_requests;
begin
  select * into r from public.lease_requests where id = p_request_id for update;
  if not found or not private.is_lease_request_admin(p_request_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if r.status not in ('pending_landlord', 'pending_tenant') then
    raise exception 'request_closed' using errcode = '22023';
  end if;
  update public.invitations set revoked_at = now()
  where lease_request_id = p_request_id and accepted_at is null and declined_at is null and revoked_at is null;
  if r.lease_id is not null then
    update public.leases set status = 'cancelled' where id = r.lease_id and status = 'pending';
  end if;
  update public.lease_requests set status = 'cancelled', decided_at = now() where id = p_request_id;
end;
$$;

-- The tenant accepts the terms as the landlord approved them: the lease is confirmed.
create or replace function public.confirm_lease_request(p_request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  r public.lease_requests;
begin
  select * into r from public.lease_requests where id = p_request_id for update;
  if not found or not private.is_lease_request_admin(p_request_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if r.status <> 'pending_tenant' then
    raise exception 'request_closed' using errcode = '22023';
  end if;
  begin
    update public.leases set status = 'confirmed', tenant_confirmed_at = now() where id = r.lease_id and status = 'pending';
  exception when exclusion_violation then
    raise exception 'lease_overlaps' using errcode = '23P01';
  end;
  if not found then
    raise exception 'request_closed' using errcode = '22023';
  end if;
  perform private.snapshot_lease_parties(r.lease_id);
  update public.lease_requests set status = 'confirmed', decided_at = now() where id = p_request_id;
  return r.lease_id;
end;
$$;

-- ---------- Landlord: read the request, take it over ------------------------------------

-- Full details for the invited landlord only, while the invitation is open. Others get no rows.
create or replace function public.lease_request_preview(p_token text)
returns table (
  request_id uuid, tenant_name text, postal_code text, city text, street_name text, street_type text, house_number text,
  building text, staircase text, floor_type public.floor_type, floor_number smallint, door text,
  start_date date, end_date date, monthly_rent integer, deposit_amount integer, expires_at timestamptz
) language sql stable security definer set search_path = '' as $$
  select r.id, coalesce(tenant.full_name, tenant_acc.name), r.postal_code, r.city, r.street_name, r.street_type, r.house_number,
         r.building, r.staircase, r.floor_type, r.floor_number, r.door,
         r.start_date, r.end_date, r.monthly_rent, r.deposit_amount, i.expires_at
  from public.invitations i
  join public.lease_requests r on r.id = i.lease_request_id
  join public.accounts tenant_acc on tenant_acc.id = r.tenant_account_id
  left join public.profiles tenant on tenant.id = i.invited_by
  where i.token_hash = private.token_hash(p_token) and i.kind = 'lease_landlord'
    and (select auth.uid()) is not null and i.email = private.my_email()
    and i.accepted_at is null and i.declined_at is null and i.revoked_at is null and i.expires_at > now()
    and r.status = 'pending_landlord';
$$;

-- p_property_id null: a new property from the tenant's address. Returns the lease, whether the tenant
-- still has to approve (any term changed or added by the landlord), and where to notify the tenant.
create or replace function public.accept_landlord_invitation(
  p_token text, p_account_id uuid, p_start_date date, p_monthly_rent integer,
  p_property_id uuid default null, p_end_date date default null, p_deposit_amount integer default null, p_payment_day smallint default null
) returns table (lease_id uuid, needs_tenant_approval boolean, tenant_email text, tenant_locale public.locale)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  i public.invitations;
  r public.lease_requests;
  me uuid := auth.uid();
  prop uuid := p_property_id;
  changed boolean;
  lid uuid;
begin
  select * into i from public.invitations where token_hash = private.token_hash(p_token) for update;
  if not found or me is null or i.kind is distinct from 'lease_landlord' then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;
  if i.accepted_at is not null or i.declined_at is not null or i.revoked_at is not null or i.expires_at <= now() then
    raise exception 'invitation_closed' using errcode = '22023';
  end if;
  if i.email is distinct from private.my_email() then
    raise exception 'invitation_for_another_email' using errcode = '42501';
  end if;
  select * into r from public.lease_requests where id = i.lease_request_id for update;
  if r.status <> 'pending_landlord' then
    raise exception 'invitation_closed' using errcode = '22023';
  end if;
  if not private.has_account_role(p_account_id, array['owner', 'admin', 'manager']::public.account_role[]) then
    raise exception 'not_allowed_for_this_account' using errcode = '42501';
  end if;
  if p_account_id = r.tenant_account_id then
    raise exception 'cannot_rent_to_yourself' using errcode = '22023';
  end if;
  if p_end_date is not null and p_end_date < private.today() then
    raise exception 'lease_already_ended' using errcode = '22023';
  end if;

  if prop is null then
    insert into public.properties (account_id, kind, postal_code, city, street_name, street_type, house_number,
                                   building, staircase, floor_type, floor_number, door, created_by)
    values (p_account_id, 'flat', r.postal_code, r.city, r.street_name, r.street_type, r.house_number,
            r.building, r.staircase, r.floor_type, r.floor_number, r.door, me)
    returning id into prop;
  elsif not exists (select 1 from public.properties p where p.id = prop and p.account_id = p_account_id and p.archived_at is null)
        or not private.can_manage_property(prop) then
    raise exception 'property_not_in_account' using errcode = '42501';
  end if;

  changed := (p_start_date, p_end_date, p_monthly_rent, p_deposit_amount) is distinct from (r.start_date, r.end_date, r.monthly_rent, r.deposit_amount)
             or p_payment_day is not null;
  begin
    insert into public.leases (property_id, account_id, tenant_account_id, status, start_date, end_date, monthly_rent, deposit_amount,
                               payment_day, landlord_confirmed_at, tenant_confirmed_at, created_by)
    values (prop, p_account_id, r.tenant_account_id, case when changed then 'pending' else 'confirmed' end::public.lease_status,
            p_start_date, p_end_date, p_monthly_rent, p_deposit_amount, p_payment_day, now(),
            case when changed then null else r.created_at end, me)
    returning id into lid;
  exception when exclusion_violation then
    raise exception 'lease_overlaps' using errcode = '23P01';
  end;

  if changed then
    update public.lease_requests set status = 'pending_tenant', landlord_account_id = p_account_id, lease_id = lid where id = r.id;
  else
    perform private.snapshot_lease_parties(lid);
    update public.lease_requests set status = 'confirmed', landlord_account_id = p_account_id, lease_id = lid, decided_at = now() where id = r.id;
  end if;
  update public.invitations set accepted_at = now(), accepted_by = me where id = i.id;
  return query select lid, changed, p.email, p.locale from (select 1) one left join public.profiles p on p.id = i.invited_by;
end;
$$;

-- ---------- Existing invitation functions learn the new kind ----------------------------

create or replace function public.invitation_preview(p_token text)
returns table (
  kind public.invitation_kind, inviter_name text, account_name text, account_role public.account_role,
  property_address text, monthly_rent integer, start_date date, end_date date, occupant_role public.occupant_role,
  expires_at timestamptz, is_open boolean, is_for_me boolean, masked_email text
) language sql stable security definer set search_path = '' as $$
  -- Details only for the invitee while the invitation is open; otherwise just enough to explain why not.
  with inv as (
    select i.*,
           i.accepted_at is null and i.declined_at is null and i.revoked_at is null and i.expires_at > now() as open_,
           i.email = private.my_email() as mine
    from public.invitations i
    where i.token_hash = private.token_hash(p_token) and (select auth.uid()) is not null
  )
  select i.kind,
         case when i.open_ and i.mine then coalesce(inviter.full_name, inviter.email) end,
         case when i.open_ and i.mine then coalesce(acc.name, lacc.name) end,
         case when i.open_ and i.mine then i.account_role end,
         case when i.open_ and i.mine and p.id is not null
              then concat_ws(' ', p.street_name, p.street_type, p.house_number) || ', ' || p.postal_code || ' ' || p.city
              when i.open_ and i.mine and r.id is not null
              then concat_ws(' ', r.street_name, r.street_type, r.house_number) || ', ' || r.postal_code || ' ' || r.city end,
         case when i.open_ and i.mine then coalesce(l.monthly_rent, r.monthly_rent) end,
         case when i.open_ and i.mine then coalesce(l.start_date, r.start_date) end,
         case when i.open_ and i.mine then coalesce(l.end_date, r.end_date) end,
         case when i.open_ and i.mine then i.occupant_role end,
         i.expires_at, i.open_ and (r.id is null or r.status = 'pending_landlord'), i.mine,
         left(i.email, 1) || '•••@' || split_part(i.email, '@', 2)
  from inv i
  left join public.profiles inviter on inviter.id = i.invited_by
  left join public.accounts acc on acc.id = i.account_id
  left join public.leases l on l.id = i.lease_id
  left join public.accounts lacc on lacc.id = l.account_id
  left join public.properties p on p.id = l.property_id
  left join public.lease_requests r on r.id = i.lease_request_id;
$$;

-- Unchanged except: the landlord kind has its own function, and unknown kinds are refused.
create or replace function public.accept_invitation(p_token text, p_tenant_account_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  i public.invitations;
  me uuid := auth.uid();
  tenant_acc uuid;
begin
  select * into i from public.invitations where token_hash = private.token_hash(p_token) for update;
  if not found or me is null then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;
  if i.accepted_at is not null or i.declined_at is not null or i.revoked_at is not null or i.expires_at <= now() then
    raise exception 'invitation_closed' using errcode = '22023';
  end if;
  if i.email is distinct from private.my_email() then
    raise exception 'invitation_for_another_email' using errcode = '42501';
  end if;

  if i.kind = 'account_member' then
    -- The inviter must still be allowed to invite.
    if not exists (select 1 from public.account_members where account_id = i.account_id and user_id = i.invited_by
                   and role in ('owner', 'admin')) then
      raise exception 'invitation_closed' using errcode = '22023';
    end if;
    insert into public.account_members (account_id, user_id, role, property_scope, invited_by)
    values (i.account_id, me, i.account_role, i.property_scope, i.invited_by);
    insert into public.account_member_properties (account_id, user_id, property_id)
    select i.account_id, me, ip.property_id from public.invitation_properties ip where ip.invitation_id = i.id;

  elsif i.kind = 'lease_tenant' then
    tenant_acc := coalesce(p_tenant_account_id, (select id from public.accounts where personal_user_id = me));
    if not private.has_account_role(tenant_acc, array['owner', 'admin']::public.account_role[]) then
      raise exception 'not_allowed_for_this_account' using errcode = '42501';
    end if;
    update public.leases
      set tenant_account_id = tenant_acc, tenant_confirmed_at = now(), status = 'confirmed'
      where id = i.lease_id and status = 'pending';
    if not found then
      raise exception 'lease_not_pending' using errcode = '22023';
    end if;
    perform private.snapshot_lease_parties(i.lease_id);

  elsif i.kind = 'lease_occupant' then
    if (select public.lease_phase(l) from public.leases l where l.id = i.lease_id) not in ('upcoming', 'active') then
      raise exception 'invitation_closed' using errcode = '22023';
    end if;
    insert into public.lease_occupants (lease_id, user_id, role, added_by)
    values (i.lease_id, me, i.occupant_role, i.invited_by)
    on conflict (lease_id, user_id) do update set role = excluded.role, removed_at = null;

  else
    raise exception 'wrong_kind' using errcode = '22023';
  end if;

  update public.invitations set accepted_at = now(), accepted_by = me where id = i.id;
  return coalesce(i.account_id, i.lease_id);
end;
$$;

-- Declining the landlord invitation closes the tenant's request.
create or replace function public.decline_invitation(p_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  rid uuid;
begin
  update public.invitations set declined_at = now()
  where token_hash = private.token_hash(p_token) and email = private.my_email()
    and accepted_at is null and declined_at is null and revoked_at is null
  returning lease_request_id into rid;
  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;
  if rid is not null then
    update public.lease_requests set status = 'declined', decided_at = now() where id = rid and status = 'pending_landlord';
  end if;
end;
$$;

create or replace function public.revoke_invitation(p_invitation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  i public.invitations;
begin
  select * into i from public.invitations where id = p_invitation_id for update;
  if not found
     or not ((i.account_id is not null and private.has_account_role(i.account_id, array['owner', 'admin']::public.account_role[]))
             or (i.kind = 'lease_tenant' and private.lease_access(i.lease_id) = 'landlord_manage')
             or (i.kind = 'lease_occupant' and private.is_tenant_admin(i.lease_id))
             or private.is_staff()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  -- A landlord invitation is withdrawn with the request (cancel_lease_request), never on its own.
  if i.kind = 'lease_landlord' then
    raise exception 'use_cancel_lease_request' using errcode = '22023';
  end if;
  update public.invitations set revoked_at = now()
  where id = p_invitation_id and accepted_at is null and declined_at is null and revoked_at is null;
end;
$$;

-- ---------- Access rules -------------------------------------------------------------------

alter table public.lease_requests enable row level security;
revoke all on public.lease_requests from anon, authenticated;
grant select on public.lease_requests to authenticated;
create policy "lease_requests_select_tenant_side_or_staff" on public.lease_requests for select to authenticated
  using (private.is_account_member(tenant_account_id) or private.is_staff());

revoke execute on function private.is_lease_request_admin(uuid) from public, anon, authenticated;
grant execute on function private.is_lease_request_admin(uuid) to authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.create_lease_request(text, text, text, text, text, date, integer, text, text, text, public.floor_type, smallint, text, date, integer, text, uuid)',
    'public.remind_lease_request(uuid)',
    'public.cancel_lease_request(uuid)',
    'public.confirm_lease_request(uuid)',
    'public.lease_request_preview(text)',
    'public.accept_landlord_invitation(text, uuid, date, integer, uuid, date, integer, smallint)',
    'public.invitation_preview(text)',
    'public.accept_invitation(text, uuid)',
    'public.decline_invitation(text)',
    'public.revoke_invitation(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
