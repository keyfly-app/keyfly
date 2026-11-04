-- =====================================================================
-- Property module, part 3: the tools behind the screens.
-- * save_service: a service with its identifiers and meters in one save (runs as the caller, RLS applies)
-- * copy_property: a new property from an existing one – features, services (without identifiers and meters),
--   contacts and ownership as chosen
-- * import_properties / undo_import: an Excel/CSV import in one go, undone as a whole (updated rows are restored)
-- =====================================================================

-- ---------- Services -----------------------------------------------------------------

-- p_service: {"type_key","custom_label","provider_id","provider_name","network_provider_id","contact_id","settlement_key",
--   "fee_amount","fee_currency","reading_required","reading_frequency","reading_due"}
-- p_identifiers: [{"label","value"}, …] – replaces the service's identifiers.
-- p_meters: [{"id"?, "name","tariff_key","unit_key","serial","registers","location"}, …] – meters left out are archived
-- (their readings will stay with them).
create or replace function public.save_service(
  p_property_id uuid, p_service_id uuid, p_service jsonb, p_identifiers jsonb default '[]', p_meters jsonb default '[]'
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  sid uuid := p_service_id;
  s jsonb := coalesce(p_service, '{}');
  m jsonb;
  keep uuid[] := '{}';
  mid uuid;
  n int := 0;
begin
  if not private.can_manage_property(p_property_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if sid is null then
    insert into public.property_services (property_id, type_key, custom_label, provider_id, provider_name, network_provider_id, contact_id,
                                          settlement_key, fee_amount, fee_currency, reading_required, reading_frequency, reading_due,
                                          sort, created_by)
    values (p_property_id, s ->> 'type_key', nullif(btrim(s ->> 'custom_label'), ''), (s ->> 'provider_id')::uuid,
            nullif(btrim(s ->> 'provider_name'), ''), (s ->> 'network_provider_id')::uuid, (s ->> 'contact_id')::uuid,
            coalesce(s ->> 'settlement_key', 'tenant_direct'), (s ->> 'fee_amount')::int, coalesce(s ->> 'fee_currency', 'HUF'),
            coalesce((s ->> 'reading_required')::boolean, false), s ->> 'reading_frequency', s ->> 'reading_due',
            coalesce((select max(x.sort) + 1 from public.property_services x where x.property_id = p_property_id), 0), auth.uid())
    returning id into sid;
  else
    update public.property_services x
       set type_key = s ->> 'type_key', custom_label = nullif(btrim(s ->> 'custom_label'), ''),
           provider_id = (s ->> 'provider_id')::uuid, provider_name = nullif(btrim(s ->> 'provider_name'), ''),
           network_provider_id = (s ->> 'network_provider_id')::uuid, contact_id = (s ->> 'contact_id')::uuid,
           settlement_key = coalesce(s ->> 'settlement_key', 'tenant_direct'), fee_amount = (s ->> 'fee_amount')::int,
           fee_currency = coalesce(s ->> 'fee_currency', 'HUF'), reading_required = coalesce((s ->> 'reading_required')::boolean, false),
           reading_frequency = s ->> 'reading_frequency', reading_due = s ->> 'reading_due'
     where x.id = sid and x.property_id = p_property_id;
    if not found then
      raise exception 'service_not_found' using errcode = '42501';
    end if;
  end if;

  delete from public.service_identifiers i where i.service_id = sid;
  insert into public.service_identifiers (service_id, label, value, sort)
  select sid, btrim(x.e ->> 'label'), btrim(x.e ->> 'value'), x.ord::int
  from jsonb_array_elements(coalesce(p_identifiers, '[]')) with ordinality as x (e, ord)
  where btrim(coalesce(x.e ->> 'label', '')) <> '' and btrim(coalesce(x.e ->> 'value', '')) <> '';

  for m in select * from jsonb_array_elements(coalesce(p_meters, '[]')) loop
    n := n + 1;
    if m ? 'id' and nullif(m ->> 'id', '') is not null then
      update public.meters x
         set name = btrim(m ->> 'name'), tariff_key = nullif(m ->> 'tariff_key', ''), unit_key = coalesce(nullif(m ->> 'unit_key', ''), 'kwh'),
             serial = nullif(btrim(m ->> 'serial'), ''), registers = coalesce((m ->> 'registers')::smallint, 1),
             location = nullif(btrim(m ->> 'location'), ''), sort = n, archived_at = null
       where x.id = (m ->> 'id')::uuid and x.service_id = sid
      returning x.id into mid;
      if mid is null then
        raise exception 'meter_not_found' using errcode = '42501';
      end if;
    else
      insert into public.meters (service_id, name, tariff_key, unit_key, serial, registers, location, sort)
      values (sid, btrim(m ->> 'name'), nullif(m ->> 'tariff_key', ''), coalesce(nullif(m ->> 'unit_key', ''), 'kwh'),
              nullif(btrim(m ->> 'serial'), ''), coalesce((m ->> 'registers')::smallint, 1), nullif(btrim(m ->> 'location'), ''), n)
      returning id into mid;
    end if;
    keep := keep || mid;
    mid := null;
  end loop;
  update public.meters x set archived_at = now() where x.service_id = sid and x.archived_at is null and not (x.id = any (keep));
  return sid;
end;
$$;

-- ---------- Copy -----------------------------------------------------------------

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
  if p_contacts then
    insert into public.property_contacts (property_id, contact_id, role_key, role_label, tenant_visible, sort)
    select pid, c.contact_id, c.role_key, c.role_label, c.tenant_visible, c.sort from public.property_contacts c where c.property_id = src.id;
  end if;
  if p_management then
    insert into public.property_management (property_id, owner_kind, owner_contact_id, responsible_user_id, common_charge)
    select pid, m.owner_kind, m.owner_contact_id, m.responsible_user_id, m.common_charge from public.property_management m where m.property_id = src.id;
  end if;
  insert into public.account_member_properties (account_id, user_id, property_id)
  select m.account_id, m.user_id, pid from public.account_members m
  where m.account_id = src.account_id and m.user_id = me and m.property_scope = 'selected'
  on conflict do nothing;
  return query select pid, code;
end;
$$;

-- ---------- Import -----------------------------------------------------------------

create table public.import_batch_changes (
  batch_id uuid not null references public.import_batches (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  before jsonb not null,
  primary key (batch_id, property_id)
);
comment on table public.import_batch_changes is 'Values an import overwrote, so undoing it restores them. Read and written only by the import functions.';
create index import_batch_changes_property_idx on public.import_batch_changes (property_id);
alter table public.import_batch_changes enable row level security;
revoke all on public.import_batch_changes from anon, authenticated;

-- p_rows: [{"postal_code","city","street_name","street_type","house_number","building","staircase","floor_type","floor_number",
--   "door","kind","label","own_ref","area_m2","rooms","half_rooms","parcel_number","update_id"?}, …], at most 500.
-- A row with update_id fills in that property's given values instead of adding a new one. One bad row fails the whole import.
create or replace function public.import_properties(p_account_id uuid, p_file_name text, p_rows jsonb)
returns table (batch_id uuid, created integer, updated integer)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  bid uuid;
  r jsonb;
  c int := 0;
  u int := 0;
  target uuid;
  cols constant text[] := array['postal_code', 'city', 'street_name', 'street_type', 'house_number', 'building', 'staircase', 'floor_type',
                                'floor_number', 'door', 'kind', 'label', 'own_ref', 'area_m2', 'rooms', 'half_rooms', 'parcel_number'];
begin
  if me is null or not private.has_account_role(p_account_id, array['owner', 'admin', 'manager']::public.account_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 500 then
    raise exception 'import_size' using errcode = '22023';
  end if;
  insert into public.import_batches (account_id, created_by, file_name, rows_total)
  values (p_account_id, me, left(coalesce(nullif(btrim(p_file_name), ''), 'import'), 200), jsonb_array_length(p_rows))
  returning id into bid;

  for r in select * from jsonb_array_elements(p_rows) loop
    target := nullif(r ->> 'update_id', '')::uuid;
    if target is not null then
      if not exists (select 1 from public.properties p where p.id = target and p.account_id = p_account_id and p.archived_at is null)
         or not private.can_manage_property(target) then
        raise exception 'not_allowed' using errcode = '42501';
      end if;
      insert into public.import_batch_changes (batch_id, property_id, before)
      select bid, p.id, (select jsonb_object_agg(k, to_jsonb(p) -> k) from unnest(cols) k) from public.properties p where p.id = target;
      update public.properties p set
        building = coalesce(nullif(btrim(r ->> 'building'), ''), p.building),
        staircase = coalesce(nullif(btrim(r ->> 'staircase'), ''), p.staircase),
        door = coalesce(nullif(btrim(r ->> 'door'), ''), p.door),
        kind = coalesce(nullif(r ->> 'kind', ''), p.kind),
        label = coalesce(nullif(btrim(r ->> 'label'), ''), p.label),
        own_ref = coalesce(nullif(btrim(r ->> 'own_ref'), ''), p.own_ref),
        area_m2 = coalesce((r ->> 'area_m2')::numeric, p.area_m2),
        rooms = coalesce((r ->> 'rooms')::smallint, p.rooms),
        half_rooms = coalesce((r ->> 'half_rooms')::smallint, p.half_rooms),
        parcel_number = coalesce(nullif(btrim(r ->> 'parcel_number'), ''), p.parcel_number)
      where p.id = target;
      u := u + 1;
    else
      insert into public.properties (account_id, kind, label, own_ref, postal_code, city, street_name, street_type, house_number,
                                     building, staircase, floor_type, floor_number, door, area_m2, rooms, half_rooms, parcel_number,
                                     import_batch_id, created_by)
      values (p_account_id, coalesce(nullif(r ->> 'kind', ''), 'flat'), nullif(btrim(r ->> 'label'), ''), nullif(btrim(r ->> 'own_ref'), ''),
              btrim(r ->> 'postal_code'), btrim(r ->> 'city'), btrim(r ->> 'street_name'), btrim(r ->> 'street_type'), btrim(r ->> 'house_number'),
              nullif(btrim(r ->> 'building'), ''), nullif(btrim(r ->> 'staircase'), ''), nullif(r ->> 'floor_type', '')::public.floor_type,
              (r ->> 'floor_number')::smallint, nullif(btrim(r ->> 'door'), ''), (r ->> 'area_m2')::numeric, (r ->> 'rooms')::smallint,
              (r ->> 'half_rooms')::smallint, nullif(btrim(r ->> 'parcel_number'), ''), bid, me)
      returning id into target;
      insert into public.account_member_properties (account_id, user_id, property_id)
      select m.account_id, m.user_id, target from public.account_members m
      where m.account_id = p_account_id and m.user_id = me and m.property_scope = 'selected'
      on conflict do nothing;
      c := c + 1;
    end if;
  end loop;
  update public.import_batches b set rows_imported = c + u where b.id = bid;
  return query select bid, c, u;
end;
$$;

-- Within a day, and while nothing hangs on the new properties: they go, overwritten values come back.
create or replace function public.undo_import(p_batch_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  b public.import_batches;
  ch record;
begin
  select * into b from public.import_batches x where x.id = p_batch_id;
  if b.id is null or not private.has_account_role(b.account_id, array['owner', 'admin', 'manager']::public.account_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if b.undone_at is not null or b.created_at < now() - interval '24 hours' then
    raise exception 'import_not_undoable' using errcode = '23514';
  end if;
  if exists (select 1 from public.leases l join public.properties p on p.id = l.property_id where p.import_batch_id = b.id) then
    raise exception 'import_in_use' using errcode = '23514';
  end if;
  delete from public.properties p where p.import_batch_id = b.id;
  for ch in select * from public.import_batch_changes x where x.batch_id = b.id loop
    update public.properties p set
      building = ch.before ->> 'building', staircase = ch.before ->> 'staircase', door = ch.before ->> 'door',
      kind = ch.before ->> 'kind', label = ch.before ->> 'label', own_ref = ch.before ->> 'own_ref',
      area_m2 = (ch.before ->> 'area_m2')::numeric, rooms = (ch.before ->> 'rooms')::smallint,
      half_rooms = (ch.before ->> 'half_rooms')::smallint, parcel_number = ch.before ->> 'parcel_number'
    where p.id = ch.property_id;
  end loop;
  update public.import_batches x set undone_at = now() where x.id = b.id;
end;
$$;

revoke execute on function public.save_service(uuid, uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_service(uuid, uuid, jsonb, jsonb, jsonb) to authenticated;
revoke execute on function public.copy_property(uuid, text, text, text, text, text, text, text, public.floor_type, smallint, text, text, text, boolean, boolean, boolean, boolean) from public, anon;
grant execute on function public.copy_property(uuid, text, text, text, text, text, text, text, public.floor_type, smallint, text, text, text, boolean, boolean, boolean, boolean) to authenticated;
revoke execute on function public.import_properties(uuid, text, jsonb) from public, anon;
grant execute on function public.import_properties(uuid, text, jsonb) to authenticated;
revoke execute on function public.undo_import(uuid) from public, anon;
grant execute on function public.undo_import(uuid) to authenticated;
