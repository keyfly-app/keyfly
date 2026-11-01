-- =====================================================================
-- Invitations: team members (account), tenants and occupants (lease), staff.
-- A link is single-use, bound to one email address, valid for 7 days
-- (staff: 48 hours). Only the SHA-256 hash of the token is stored.
-- All writes go through the functions below.
-- =====================================================================

create type public.invitation_kind as enum ('account_member', 'lease_tenant', 'lease_occupant');

create table public.invitations (
  id             uuid primary key default gen_random_uuid(),
  kind           public.invitation_kind not null,
  email          text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  account_id     uuid references public.accounts (id) on delete cascade,
  account_role   public.account_role,
  property_scope public.property_scope,
  lease_id       uuid references public.leases (id) on delete cascade,
  occupant_role  public.occupant_role,
  token_hash     bytea not null unique,
  invited_by     uuid references public.profiles (id) on delete set null,
  expires_at     timestamptz not null,
  accepted_at    timestamptz,
  accepted_by    uuid references public.profiles (id) on delete set null,
  declined_at    timestamptz,
  revoked_at     timestamptz,
  created_at     timestamptz not null default now(),
  constraint invitations_target check (
    (kind = 'account_member' and account_id is not null and account_role is not null and account_role <> 'owner'
       and property_scope is not null and lease_id is null and occupant_role is null)
    or (kind = 'lease_tenant' and lease_id is not null and account_id is null and account_role is null and occupant_role is null)
    or (kind = 'lease_occupant' and lease_id is not null and occupant_role is not null and account_id is null and account_role is null)
  ),
  constraint invitations_one_outcome check (num_nonnulls(accepted_at, declined_at, revoked_at) <= 1),
  constraint invitations_id_account_key unique (id, account_id)
);
comment on table public.invitations is 'Pending and past invitations. Only the token hash is stored; the token travels in the email link.';
create unique index invitations_open_key on public.invitations (kind, coalesce(account_id, lease_id), email)
  where accepted_at is null and declined_at is null and revoked_at is null;
create index invitations_lease_idx on public.invitations (lease_id);
create index invitations_account_idx on public.invitations (account_id);

create table public.invitation_properties (
  invitation_id uuid not null,
  account_id    uuid not null,
  property_id   uuid not null,
  primary key (invitation_id, property_id),
  foreign key (invitation_id, account_id) references public.invitations (id, account_id) on delete cascade,
  foreign key (property_id, account_id) references public.properties (id, account_id) on delete cascade
);

alter table public.invitations enable row level security;
alter table public.invitation_properties enable row level security;
revoke all on public.invitations, public.invitation_properties from anon, authenticated;

grant select (id, kind, email, account_id, account_role, property_scope, lease_id, occupant_role, invited_by,
              expires_at, accepted_at, declined_at, revoked_at, created_at) on public.invitations to authenticated;
create policy "invitations_select_inviting_side" on public.invitations for select to authenticated
  using (
    (account_id is not null and private.has_account_role(account_id, array['owner', 'admin']::public.account_role[]))
    or (kind = 'lease_tenant' and private.lease_access(lease_id) = 'landlord_manage')
    or (kind = 'lease_occupant' and private.is_tenant_admin(lease_id))
    or private.is_staff()
  );
grant select on public.invitation_properties to authenticated;
create policy "invitation_properties_select_owner_admin" on public.invitation_properties for select to authenticated
  using (private.has_account_role(account_id, array['owner', 'admin']::public.account_role[]) or private.is_staff());

-- ---------- Tokens ---------------------------------------------------------------

create or replace function private.new_token()
returns text language sql volatile set search_path = '' as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
$$;

create or replace function private.token_hash(token text)
returns bytea language sql immutable set search_path = '' as $$
  select sha256(convert_to(token, 'UTF8'));
$$;

create or replace function private.my_email()
returns text language sql stable security definer set search_path = '' as $$
  select lower(email) from auth.users where id = (select auth.uid()) and email_confirmed_at is not null;
$$;

-- ---------- Create -------------------------------------------------------------------

-- Team member. Owners and admins invite; plan seat limits count open invitations too.
create or replace function public.create_account_invitation(
  p_account_id uuid, p_email text, p_role public.account_role,
  p_scope public.property_scope default 'all', p_property_ids uuid[] default '{}'
) returns text language plpgsql security definer set search_path = '' as $$
declare
  acc public.accounts;
  token text := private.new_token();
  inv uuid;
  seats int;
  v_email text := lower(btrim(p_email));
begin
  if not private.has_account_role(p_account_id, array['owner', 'admin']::public.account_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into acc from public.accounts where id = p_account_id for update;
  if acc.kind = 'person' then
    raise exception 'personal_account_single_member' using errcode = '23514';
  end if;
  if (acc.plan = 'basic') or (acc.plan = 'pro' and p_role = 'admin') or p_role = 'owner' then
    raise exception 'role_not_in_plan' using errcode = '23514';
  end if;
  if p_role in ('owner', 'admin') and p_scope <> 'all' then
    raise exception 'scope_only_for_managers_and_viewers' using errcode = '23514';
  end if;
  -- Re-sending replaces the open invitation to the same address.
  update public.invitations set revoked_at = now()
  where kind = 'account_member' and account_id = p_account_id and invitations.email = v_email
    and accepted_at is null and declined_at is null and revoked_at is null;
  select (select count(*) from public.account_members where account_id = p_account_id)
       + (select count(*) from public.invitations i where i.account_id = p_account_id and i.accepted_at is null
            and i.declined_at is null and i.revoked_at is null and i.expires_at > now())
    into seats;
  if acc.plan = 'pro' and seats >= 3 then
    raise exception 'plan_member_limit' using errcode = '23514';
  end if;
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

-- Tenant (by the landlord side) or occupant / co-tenant (by the tenant side).
create or replace function public.create_lease_invitation(
  p_lease_id uuid, p_email text, p_kind public.invitation_kind, p_occupant_role public.occupant_role default null
) returns text language plpgsql security definer set search_path = '' as $$
declare
  l public.leases;
  token text := private.new_token();
  access private.lease_access_level := private.lease_access(p_lease_id);
  v_email text := lower(btrim(p_email));
begin
  select * into l from public.leases where id = p_lease_id for update;
  if p_kind = 'lease_tenant' then
    if access is distinct from 'landlord_manage' then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
    if l.status not in ('draft', 'pending') or l.tenant_account_id is not null then
      raise exception 'lease_already_has_a_tenant' using errcode = '22023';
    end if;
    -- Sending the invitation is the landlord's confirmation of the terms.
    update public.leases set status = 'pending', landlord_confirmed_at = now() where id = p_lease_id;
  elsif p_kind = 'lease_occupant' then
    if not private.is_tenant_admin(p_lease_id) then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
    if public.lease_phase(l) not in ('upcoming', 'active') then
      raise exception 'lease_not_open_for_occupants' using errcode = '22023';
    end if;
  else
    raise exception 'wrong_kind' using errcode = '22023';
  end if;

  update public.invitations set revoked_at = now()
  where kind = p_kind and lease_id = p_lease_id and invitations.email = v_email
    and accepted_at is null and declined_at is null and revoked_at is null;
  insert into public.invitations (kind, email, lease_id, occupant_role, token_hash, invited_by, expires_at)
  values (p_kind, v_email, p_lease_id, case when p_kind = 'lease_occupant' then p_occupant_role end,
          private.token_hash(token), auth.uid(), now() + interval '7 days');
  return token;
end;
$$;

create or replace function public.create_staff_invitation(p_email text, p_role public.staff_role)
returns text language plpgsql security definer set search_path = '' as $$
declare
  token text := private.new_token();
  v_email text := lower(btrim(p_email));
begin
  if not private.has_staff_role(array['superadmin']::public.staff_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.staff_invitations set revoked_at = now()
  where staff_invitations.email = v_email and accepted_at is null and revoked_at is null;
  insert into public.staff_invitations (email, role, token_hash, invited_by, expires_at)
  values (v_email, p_role, private.token_hash(token), auth.uid(), now() + interval '48 hours');
  return token;
end;
$$;

-- ---------- Read before accepting ----------------------------------------------------

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
              then concat_ws(' ', p.street_name, p.street_type, p.house_number) || ', ' || p.postal_code || ' ' || p.city end,
         case when i.open_ and i.mine then l.monthly_rent end,
         case when i.open_ and i.mine then l.start_date end,
         case when i.open_ and i.mine then l.end_date end,
         case when i.open_ and i.mine then i.occupant_role end,
         i.expires_at, i.open_, i.mine,
         left(i.email, 1) || '•••@' || split_part(i.email, '@', 2)
  from inv i
  left join public.profiles inviter on inviter.id = i.invited_by
  left join public.accounts acc on acc.id = i.account_id
  left join public.leases l on l.id = i.lease_id
  left join public.accounts lacc on lacc.id = l.account_id
  left join public.properties p on p.id = l.property_id;
$$;

-- ---------- Accept, decline, revoke ---------------------------------------------------

-- p_tenant_account_id: for a lease invitation, which of my accounts rents (default: my personal account).
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
  end if;

  update public.invitations set accepted_at = now(), accepted_by = me where id = i.id;
  return coalesce(i.account_id, i.lease_id);
end;
$$;

create or replace function public.decline_invitation(p_token text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.invitations set declined_at = now()
  where token_hash = private.token_hash(p_token) and email = private.my_email()
    and accepted_at is null and declined_at is null and revoked_at is null;
  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
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
  update public.invitations set revoked_at = now()
  where id = p_invitation_id and accepted_at is null and declined_at is null and revoked_at is null;
end;
$$;

-- Staff: email must match, the address must be @keyfly.app; 2FA is required by is_staff().
create or replace function public.accept_staff_invitation(p_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  i public.staff_invitations;
  me uuid := auth.uid();
begin
  select * into i from public.staff_invitations where token_hash = private.token_hash(p_token) for update;
  if not found or me is null or i.accepted_at is not null or i.revoked_at is not null or i.expires_at <= now() then
    raise exception 'invitation_closed' using errcode = '22023';
  end if;
  if i.email is distinct from private.my_email() then
    raise exception 'invitation_for_another_email' using errcode = '42501';
  end if;
  insert into public.staff (user_id, role, invited_by) values (me, i.role, i.invited_by)
  on conflict (user_id) do update set role = excluded.role, disabled_at = null, invited_by = excluded.invited_by;
  update public.staff_invitations set accepted_at = now() where id = i.id;
end;
$$;

revoke execute on function private.new_token(), private.token_hash(text), private.my_email() from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.create_account_invitation(uuid, text, public.account_role, public.property_scope, uuid[])',
    'public.create_lease_invitation(uuid, text, public.invitation_kind, public.occupant_role)',
    'public.create_staff_invitation(text, public.staff_role)',
    'public.invitation_preview(text)',
    'public.accept_invitation(text, uuid)',
    'public.decline_invitation(text)',
    'public.revoke_invitation(uuid)',
    'public.accept_staff_invitation(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
