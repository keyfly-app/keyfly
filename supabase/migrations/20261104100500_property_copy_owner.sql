-- Copying a property: the owner from "Tulajdon és kezelés" travels with that choice, not with "Kapcsolatok" –
-- so a copy without ownership never shows a "Tulajdonos" contact, and a copy with it always does.
create or replace function public.copy_property(
  p_source uuid,
  p_postal_code text, p_city text, p_street_name text, p_street_type text, p_house_number text,
  p_building text default null, p_staircase text default null, p_floor_type public.floor_type default null,
  p_floor_number smallint default null, p_door text default null,
  p_label text default null, p_own_ref text default null,
  p_features boolean default true, p_services boolean default true, p_contacts boolean default true, p_management boolean default false
) returns table (property_id uuid, public_code text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  src public.properties;
  pid uuid;
  code text;
  owner uuid;
begin
  select * into src from public.properties p where p.id = p_source and p.archived_at is null;
  if me is null or src.id is null or not private.can_manage_property(p_source)
     or not private.has_account_role(src.account_id, array['owner', 'admin', 'manager']::public.account_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  insert into public.properties (account_id, kind, other_kind_label, label, own_ref,
                                 postal_code, city, street_name, street_type, house_number,
                                 building, staircase, floor_type, floor_number, door, created_by, copied_from,
                                 area_m2, rooms, half_rooms, built_year, heating, energy_rating, parking, lift, furnishing)
  values (src.account_id, src.kind, src.other_kind_label, nullif(btrim(p_label), ''), nullif(btrim(p_own_ref), ''),
          btrim(p_postal_code), btrim(p_city), btrim(p_street_name), btrim(p_street_type), btrim(p_house_number),
          nullif(btrim(p_building), ''), nullif(btrim(p_staircase), ''), p_floor_type, p_floor_number, nullif(btrim(p_door), ''),
          me, src.id,
          case when p_features then src.area_m2 end, case when p_features then src.rooms end, case when p_features then src.half_rooms end,
          case when p_features then src.built_year end, case when p_features then src.heating end,
          case when p_features then src.energy_rating end, case when p_features then src.parking end,
          case when p_features then src.lift end, case when p_features then src.furnishing end)
  returning id, public_code into pid, code;

  if p_features then
    insert into public.property_outdoor (property_id, kind, area_m2) select pid, o.kind, o.area_m2 from public.property_outdoor o where o.property_id = src.id;
    insert into public.property_extras (property_id, extra_key, account_extra_id)
    select pid, e.extra_key, e.account_extra_id from public.property_extras e where e.property_id = src.id;
  end if;
  if p_services then
    insert into public.property_services (property_id, type_key, custom_label, provider_id, provider_name, network_provider_id, contact_id,
                                          settlement_key, fee_amount, fee_currency, reading_required, reading_frequency, reading_due, sort, created_by)
    select pid, s.type_key, s.custom_label, s.provider_id, s.provider_name, s.network_provider_id, s.contact_id,
           s.settlement_key, s.fee_amount, s.fee_currency, s.reading_required, s.reading_frequency, s.reading_due, s.sort, me
    from public.property_services s where s.property_id = src.id and s.ended_on is null;
  end if;
  select m.owner_contact_id into owner from public.property_management m where m.property_id = src.id;
  if p_contacts then
    insert into public.property_contacts (property_id, contact_id, role_key, role_label, tenant_visible, sort)
    select pid, c.contact_id, c.role_key, c.role_label, c.tenant_visible, c.sort from public.property_contacts c
    where c.property_id = src.id and (c.role_key is distinct from 'owner' or c.contact_id is distinct from owner);
  end if;
  if p_management then
    insert into public.property_management (property_id, owner_kind, owner_contact_id, responsible_user_id, common_charge)
    select pid, m.owner_kind, m.owner_contact_id, m.responsible_user_id, m.common_charge from public.property_management m where m.property_id = src.id;
    if owner is not null then
      insert into public.property_contacts (property_id, contact_id, role_key) values (pid, owner, 'owner') on conflict do nothing;
    end if;
  end if;
  insert into public.account_member_properties (account_id, user_id, property_id)
  select m.account_id, m.user_id, pid from public.account_members m
  where m.account_id = src.account_id and m.user_id = me and m.property_scope = 'selected'
  on conflict do nothing;
  return query select pid, code;
end;
$$;
