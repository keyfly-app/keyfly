-- Property type (canvas "Meghívás 1 – ingatlan típusa", approved 2026-11-02): the rented object is a property of any
-- kind – residential (flat, house, room) or commercial (office, retail unit, hospitality venue, warehouse / industrial,
-- garage / parking) or other. The tenant picks it in the lease request; it becomes the kind of the landlord's property.
-- Floors: any number from 1 to 99 already fits the schema (the form used to stop at 20).

alter type public.property_kind add value if not exists 'office';
alter type public.property_kind add value if not exists 'retail';
alter type public.property_kind add value if not exists 'hospitality';
alter type public.property_kind add value if not exists 'industrial';
alter type public.property_kind add value if not exists 'parking';
alter type public.property_kind add value if not exists 'other';

alter table public.lease_requests add column property_kind public.property_kind not null default 'flat';
comment on column public.lease_requests.property_kind is 'What the tenant rents (flat, house, room, office, …); copied to the new property.';

drop function public.create_lease_request(text, text, text, text, text, date, integer, text, text, text, public.floor_type, smallint, text, date, integer, text, uuid);

create or replace function public.create_lease_request(
  p_postal_code text, p_city text, p_street_name text, p_street_type text, p_house_number text,
  p_start_date date, p_monthly_rent integer, p_landlord_email text,
  p_building text default null, p_staircase text default null, p_floor_type public.floor_type default null,
  p_floor_number smallint default null, p_door text default null, p_end_date date default null,
  p_deposit_amount integer default null, p_landlord_name text default null, p_tenant_account_id uuid default null,
  p_property_kind public.property_kind default 'flat'
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

  insert into public.lease_requests (tenant_account_id, property_kind, postal_code, city, street_name, street_type, house_number,
                                     building, staircase, floor_type, floor_number, door,
                                     start_date, end_date, monthly_rent, deposit_amount, landlord_email, landlord_name,
                                     invitation_expires_at, created_by)
  values (tenant_acc, coalesce(p_property_kind, 'flat'), btrim(p_postal_code), btrim(p_city), btrim(p_street_name), btrim(p_street_type), btrim(p_house_number),
          nullif(btrim(p_building), ''), nullif(btrim(p_staircase), ''), p_floor_type, p_floor_number, nullif(btrim(p_door), ''),
          p_start_date, p_end_date, p_monthly_rent, p_deposit_amount, v_email, nullif(btrim(p_landlord_name), ''),
          v_expires, me)
  returning id into rid;

  insert into public.invitations (kind, email, lease_request_id, token_hash, invited_by, expires_at)
  values ('lease_landlord', v_email, rid, private.token_hash(v_token), me, v_expires);
  return query select rid, v_token, v_expires;
end;
$$;

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
    values (p_account_id, r.property_kind, r.postal_code, r.city, r.street_name, r.street_type, r.house_number,
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

revoke execute on function public.create_lease_request(text, text, text, text, text, date, integer, text, text, text, public.floor_type, smallint, text, date, integer, text, uuid, public.property_kind) from public, anon;
grant execute on function public.create_lease_request(text, text, text, text, text, date, integer, text, text, text, public.floor_type, smallint, text, date, integer, text, uuid, public.property_kind) to authenticated;
