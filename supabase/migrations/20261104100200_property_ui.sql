-- =====================================================================
-- Property module, part 2: what the screens need.
-- * property_type.meta.fields: which feature fields a type asks for (shaped in admin, never in code)
-- * create_property: one call that checks the role, writes the property and returns its Keyfly ID
-- * archive_property: hides a property that no lease depends on any more
-- * save_property_features: features, outdoor spaces and extras saved together (runs as the caller, RLS applies)
-- =====================================================================

update public.catalog_items set meta = meta || jsonb_build_object('fields', f.fields)
from (values
  ('flat',        '["rooms","outdoor","heating","energy_rating","lift","furnishing","parking","extras"]'::jsonb),
  ('house',       '["rooms","outdoor","heating","energy_rating","furnishing","parking","extras"]'::jsonb),
  ('office',      '["outdoor","heating","energy_rating","lift","furnishing","parking","extras"]'::jsonb),
  ('retail',      '["outdoor","heating","energy_rating","lift","furnishing","parking","extras"]'::jsonb),
  ('hospitality', '["outdoor","heating","energy_rating","lift","furnishing","parking","extras"]'::jsonb),
  ('industrial',  '["heating","energy_rating","lift","parking","extras"]'::jsonb),
  ('parking',     '[]'::jsonb),
  ('storage',     '[]'::jsonb),
  ('other',       '["rooms","outdoor","heating","energy_rating","lift","furnishing","parking","extras"]'::jsonb),
  ('room',        '["heating","furnishing","extras"]'::jsonb)
) as f (key, fields)
where catalog_items.list = 'property_type' and catalog_items.key = f.key;

comment on column public.catalog_items.meta is
  'List-specific settings, e.g. service_type {"group":"utility","unit":"kwh"}, reading_frequency {"months":1}, '
  'property_type {"fields":["rooms","heating",…],"asks_label":true}. Area and year built are asked for every type.';

-- ---------- Create -----------------------------------------------------------------

create or replace function public.create_property(
  p_account_id uuid, p_kind text,
  p_postal_code text, p_city text, p_street_name text, p_street_type text, p_house_number text,
  p_building text default null, p_staircase text default null, p_floor_type public.floor_type default null,
  p_floor_number smallint default null, p_door text default null,
  p_label text default null, p_own_ref text default null, p_other_kind_label text default null
) returns table (property_id uuid, public_code text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  pid uuid;
  code text;
begin
  if me is null or not private.has_account_role(p_account_id, array['owner', 'admin', 'manager']::public.account_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  insert into public.properties (account_id, kind, other_kind_label, label, own_ref,
                                 postal_code, city, street_name, street_type, house_number,
                                 building, staircase, floor_type, floor_number, door, created_by)
  values (p_account_id, p_kind,
          case when p_kind = 'other' then nullif(btrim(p_other_kind_label), '') end,
          nullif(btrim(p_label), ''), nullif(btrim(p_own_ref), ''),
          btrim(p_postal_code), btrim(p_city), btrim(p_street_name), btrim(p_street_type), btrim(p_house_number),
          nullif(btrim(p_building), ''), nullif(btrim(p_staircase), ''), p_floor_type, p_floor_number,
          nullif(btrim(p_door), ''), me)
  returning id, public_code into pid, code;
  -- A manager limited to selected properties keeps seeing what they add.
  insert into public.account_member_properties (account_id, user_id, property_id)
  select m.account_id, m.user_id, pid
  from public.account_members m
  where m.account_id = p_account_id and m.user_id = me and m.property_scope = 'selected'
  on conflict do nothing;
  return query select pid, code;
end;
$$;

-- ---------- Archive -----------------------------------------------------------------

create or replace function public.archive_property(p_property_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_manage_property(p_property_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if exists (select 1 from public.leases l where l.property_id = p_property_id and l.status in ('draft', 'pending', 'confirmed')) then
    raise exception 'property_has_lease' using errcode = '23514';
  end if;
  update public.properties set archived_at = now() where id = p_property_id and archived_at is null;
end;
$$;

-- ---------- Features ----------------------------------------------------------------

-- p_outdoor: [{"kind":"balcony","area_m2":6}, …]; p_extras: catalogue keys; p_account_extras: the account's own
-- extras by id; p_new_extras: own extras typed now (added to the account, reused on its other properties).
create or replace function public.save_property_features(
  p_property_id uuid,
  p_area_m2 numeric, p_rooms smallint, p_half_rooms smallint, p_built_year smallint,
  p_heating text, p_energy_rating text, p_parking text, p_lift boolean, p_furnishing text,
  p_outdoor jsonb default '[]', p_extras text[] default '{}', p_account_extras uuid[] default '{}', p_new_extras text[] default '{}'
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  acc uuid;
  label_ text;
  eid uuid;
  own uuid[] := coalesce(p_account_extras, '{}');
begin
  select p.account_id into acc from public.properties p where p.id = p_property_id;
  if acc is null or not private.can_manage_property(p_property_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.properties
     set area_m2 = p_area_m2, rooms = p_rooms, half_rooms = p_half_rooms, built_year = p_built_year,
         heating = p_heating, energy_rating = p_energy_rating, parking = p_parking, lift = p_lift, furnishing = p_furnishing
   where id = p_property_id;

  delete from public.property_outdoor o where o.property_id = p_property_id;
  insert into public.property_outdoor (property_id, kind, area_m2)
  select p_property_id, x.kind, x.area_m2
  from jsonb_to_recordset(coalesce(p_outdoor, '[]')) as x (kind text, area_m2 numeric);

  foreach label_ in array coalesce(p_new_extras, '{}') loop
    label_ := btrim(label_);
    continue when label_ = '';
    select e.id into eid from public.account_extras e where e.account_id = acc and lower(btrim(e.label)) = lower(label_);
    if eid is null then
      insert into public.account_extras (account_id, label, created_by) values (acc, label_, auth.uid()) returning id into eid;
    end if;
    own := own || eid;
    eid := null;
  end loop;

  delete from public.property_extras e where e.property_id = p_property_id;
  insert into public.property_extras (property_id, extra_key)
  select distinct p_property_id, k from unnest(coalesce(p_extras, '{}')) k;
  insert into public.property_extras (property_id, account_extra_id)
  select distinct p_property_id, x from unnest(own) x;
end;
$$;

revoke execute on function public.create_property(uuid, text, text, text, text, text, text, text, text, public.floor_type, smallint, text, text, text, text) from public, anon;
grant execute on function public.create_property(uuid, text, text, text, text, text, text, text, text, public.floor_type, smallint, text, text, text, text) to authenticated;
revoke execute on function public.archive_property(uuid) from public, anon;
grant execute on function public.archive_property(uuid) to authenticated;
revoke execute on function public.save_property_features(uuid, numeric, smallint, smallint, smallint, text, text, text, boolean, text, jsonb, text[], uuid[], text[]) from public, anon;
grant execute on function public.save_property_features(uuid, numeric, smallint, smallint, smallint, text, text, text, boolean, text, jsonb, text[], uuid[], text[]) to authenticated;
