-- =====================================================================
-- Property module (canvas „Ingatlanok modul”, approved 2026-11-04).
--
-- 1. Catalogue: every option list (property types, heating, extras, service types, meter tariffs, reading schedules,
--    settlement methods, contact roles, …) is a row in public.catalog_items with HU/EN labels, order and an active
--    flag, so admin.keyfly.app can shape them later. Code depends on stable keys only. Columns that hold a key are
--    checked by private.check_catalog() on write (an inactive item may stay where it was used, but is not offered).
--    The property_kind enum becomes text + catalogue ('storage' is new, 'room' is retired: a flat is the smallest unit).
-- 2. Provider catalogue (utilities, telecom), curated by Keyfly; users may always type their own name instead.
-- 3. Property data: Keyfly ID (KF-XXXXX), own ID, features, outdoor spaces, extras (global + the account's own).
--    Landlord-only data (note, owner, responsible colleague, common charge) lives in property_management, which
--    tenants never see.
-- 4. Contacts (account level) and their roles at a property; "the tenant can see it" per link.
-- 5. Services (utilities and other services) with identifiers, meters, reading schedule, settlement and pause.
-- 6. Listing: rental terms, text, links; photos in the private property-media bucket.
-- 7. Import batches (undo an import as a whole).
-- =====================================================================

-- ---------- 1. Catalogue ----------------------------------------------------------------------------------------

create table public.catalog_items (
  list       text not null check (list ~ '^[a-z_]{2,40}$'),
  key        text not null check (key ~ '^[A-Za-z0-9_+]{1,40}$'),
  label_hu   text not null check (length(btrim(label_hu)) between 1 and 80),
  label_en   text not null check (length(btrim(label_en)) between 1 and 80),
  short_hu   text check (length(short_hu) <= 40),
  short_en   text check (length(short_en) <= 40),
  icon       text check (icon ~ '^[a-z_]{1,30}$'),
  sort       integer not null default 0,
  active     boolean not null default true,
  meta       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (list, key)
);
comment on table public.catalog_items is 'Every option list of the app, editable from admin later. Keys are stable; labels, order and active may change.';
comment on column public.catalog_items.meta is 'List-specific settings, e.g. service_type {"group":"utility","unit":"kwh"}, reading_frequency {"months":1}.';
create trigger catalog_items_updated_at before update on public.catalog_items for each row execute function public.set_updated_at();

-- Keys never change: rows that use them would break.
create or replace function private.catalog_key_fixed()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.list <> old.list or new.key <> old.key then
    raise exception 'catalog_key_is_fixed' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger catalog_items_key_fixed before update on public.catalog_items for each row execute function private.catalog_key_fixed();

-- Generic key check. Arguments: pairs of 'column:list'. A new or changed value must be an active item of the list.
create or replace function private.check_catalog()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  i int;
  col text;
  lst text;
  v text;
  ov text;
begin
  for i in 0 .. tg_nargs - 1 loop
    col := split_part(tg_argv[i], ':', 1);
    lst := split_part(tg_argv[i], ':', 2);
    v := to_jsonb(new) ->> col;
    if v is null then continue; end if;
    if tg_op = 'UPDATE' then
      ov := to_jsonb(old) ->> col;
      if ov is not distinct from v then continue; end if;
    end if;
    if not exists (select 1 from public.catalog_items c where c.list = lst and c.key = v and c.active) then
      raise exception 'unknown_%', lst using errcode = '23503';
    end if;
  end loop;
  return new;
end;
$$;

insert into public.catalog_items (list, key, label_hu, label_en, short_hu, short_en, icon, sort, active, meta) values
  -- property types (3 × 3 on the form)
  ('property_type', 'flat',        'Lakás',            'Flat',            null, null, 'home',     10, true,  '{}'),
  ('property_type', 'house',       'Ház',              'House',           null, null, 'home',     20, true,  '{}'),
  ('property_type', 'office',      'Iroda',            'Office',          null, null, 'building', 30, true,  '{}'),
  ('property_type', 'retail',      'Üzlet',            'Retail',          null, null, 'store',    40, true,  '{}'),
  ('property_type', 'hospitality', 'Vendéglátó',       'Hospitality',     null, null, 'cup',      50, true,  '{}'),
  ('property_type', 'industrial',  'Raktár, ipari',    'Warehouse',       null, null, 'box',      60, true,  '{}'),
  ('property_type', 'parking',     'Garázs, parkoló',  'Garage, parking', null, null, 'car',      70, true,  '{}'),
  ('property_type', 'storage',     'Tároló',           'Storage unit',    null, null, 'storage',  80, true,  '{}'),
  ('property_type', 'other',       'Egyéb',            'Other',           null, null, 'grid',     90, true,  '{"asks_label": true}'),
  ('property_type', 'room',        'Szoba',            'Room',            null, null, 'home',     95, false, '{}'),
  -- outdoor spaces
  ('outdoor_kind', 'balcony', 'Erkély',      'Balcony',      null, null, null, 10, true, '{}'),
  ('outdoor_kind', 'terrace', 'Terasz',      'Terrace',      null, null, null, 20, true, '{}'),
  ('outdoor_kind', 'garden',  'Udvar, kert', 'Garden, yard', null, null, null, 30, true, '{}'),
  -- heating
  ('heating', 'gas_boiler',    'Gáz, cirkó',   'Gas, combi boiler',   null, null, null, 10, true, '{}'),
  ('heating', 'gas_convector', 'Gázkonvektor', 'Gas convector',       null, null, null, 20, true, '{}'),
  ('heating', 'district',      'Távfűtés',     'District heating',    null, null, null, 30, true, '{}'),
  ('heating', 'central',       'Házközponti',  'Central (building)',  null, null, null, 40, true, '{}'),
  ('heating', 'electric',      'Elektromos',   'Electric',            null, null, null, 50, true, '{}'),
  ('heating', 'heat_pump',     'Hőszivattyú',  'Heat pump',           null, null, null, 60, true, '{}'),
  ('heating', 'other',         'Egyéb',        'Other',               null, null, null, 90, true, '{}'),
  -- parking
  ('parking', 'street',      'Utcán',           'On the street',      null, null, null, 10, true, '{}'),
  ('parking', 'courtyard',   'Udvari beálló',   'Courtyard space',    null, null, null, 20, true, '{}'),
  ('parking', 'garage',      'Garázs',          'Garage',             null, null, null, 30, true, '{}'),
  ('parking', 'underground', 'Teremgarázs',     'Underground garage', null, null, null, 40, true, '{}'),
  ('parking', 'none',        'Nincs',           'None',               null, null, null, 90, true, '{}'),
  -- furnishing
  ('furnishing', 'yes',    'Igen',    'Yes',    null, null, null, 10, true, '{}'),
  ('furnishing', 'partly', 'Részben', 'Partly', null, null, null, 20, true, '{}'),
  ('furnishing', 'no',     'Nem',     'No',     null, null, null, 30, true, '{}'),
  -- energy rating (Hungarian certificate classes)
  ('energy_rating', 'AA++', 'AA++', 'AA++', null, null, null, 10, true, '{}'),
  ('energy_rating', 'AA+',  'AA+',  'AA+',  null, null, null, 20, true, '{}'),
  ('energy_rating', 'AA',   'AA',   'AA',   null, null, null, 30, true, '{}'),
  ('energy_rating', 'BB',   'BB',   'BB',   null, null, null, 40, true, '{}'),
  ('energy_rating', 'CC',   'CC',   'CC',   null, null, null, 50, true, '{}'),
  ('energy_rating', 'DD',   'DD',   'DD',   null, null, null, 60, true, '{}'),
  ('energy_rating', 'EE',   'EE',   'EE',   null, null, null, 70, true, '{}'),
  ('energy_rating', 'FF',   'FF',   'FF',   null, null, null, 80, true, '{}'),
  ('energy_rating', 'GG',   'GG',   'GG',   null, null, null, 90, true, '{}'),
  ('energy_rating', 'HH',   'HH',   'HH',   null, null, null, 100, true, '{}'),
  ('energy_rating', 'II',   'II',   'II',   null, null, null, 110, true, '{}'),
  ('energy_rating', 'JJ',   'JJ',   'JJ',   null, null, null, 120, true, '{}'),
  -- extras (the account may add its own in account_extras)
  ('property_extra', 'air_con',        'Légkondi',          'Air conditioning', null, null, null, 10, true, '{}'),
  ('property_extra', 'fitted_kitchen', 'Gépesített konyha', 'Fitted kitchen',   null, null, null, 20, true, '{}'),
  ('property_extra', 'step_free',      'Akadálymentes',     'Step-free',        null, null, null, 30, true, '{}'),
  ('property_extra', 'garden_access',  'Kertkapcsolatos',   'Garden access',    null, null, null, 40, true, '{}'),
  -- service types: utilities and other services
  ('service_type', 'electricity',   'Villany',        'Electricity',   null, null, 'bolt',    10, true, '{"group": "utility", "unit": "kwh", "tariffs": true}'),
  ('service_type', 'gas',           'Gáz',            'Gas',           null, null, 'flame',   20, true, '{"group": "utility", "unit": "m3"}'),
  ('service_type', 'water',         'Víz',            'Water',         null, null, 'drop',    30, true, '{"group": "utility", "unit": "m3"}'),
  ('service_type', 'district_heat', 'Távfűtés',       'District heat', null, null, 'thermo',  40, true, '{"group": "utility", "unit": "gj"}'),
  ('service_type', 'utility_other', 'Egyéb közmű',    'Other utility', 'Egyéb', 'Other', 'grid', 50, true, '{"group": "utility", "unit": "kwh", "asks_label": true}'),
  ('service_type', 'internet',      'Internet',       'Internet',      null, null, 'wifi',    110, true, '{"group": "other"}'),
  ('service_type', 'tv',            'TV',             'TV',            null, null, 'tv',      120, true, '{"group": "other"}'),
  ('service_type', 'phone',         'Telefon',        'Phone',         null, null, 'phone',   130, true, '{"group": "other"}'),
  ('service_type', 'alarm',         'Riasztó',        'Alarm',         null, null, 'alarm',   140, true, '{"group": "other"}'),
  ('service_type', 'camera',        'Kamera',         'Camera',        null, null, 'camera',  150, true, '{"group": "other"}'),
  ('service_type', 'cleaning',      'Takarítás',      'Cleaning',      null, null, 'spark',   160, true, '{"group": "other"}'),
  ('service_type', 'gardening',     'Kertészet',      'Gardening',     null, null, 'leaf',    170, true, '{"group": "other"}'),
  ('service_type', 'other',         'Egyéb',          'Other',         null, null, 'grid',    190, true, '{"group": "other", "asks_label": true}'),
  -- meter units
  ('meter_unit', 'kwh', 'kWh', 'kWh', null, null, null, 10, true, '{}'),
  ('meter_unit', 'm3',  'm³',  'm³',  null, null, null, 20, true, '{}'),
  ('meter_unit', 'gj',  'GJ',  'GJ',  null, null, null, 30, true, '{}'),
  -- electricity tariffs
  ('meter_tariff', 'standard',  'Általános',           'Standard',            null, null, null, 10, true, '{}'),
  ('meter_tariff', 'offpeak',   'Vezérelt (éjszakai)', 'Off-peak (night)',    null, null, null, 20, true, '{}'),
  ('meter_tariff', 'heat_pump', 'H-tarifa',            'Heat-pump (H) tariff', null, null, null, 30, true, '{}'),
  ('meter_tariff', 'ev',        'E-autó töltés',       'EV charging',         null, null, null, 40, true, '{}'),
  ('meter_tariff', 'other',     'Egyéb',               'Other',               null, null, null, 90, true, '{}'),
  -- reading schedule
  ('reading_frequency', 'monthly',     'Havonta',      'Monthly',        null, null, null, 10, true, '{"months": 1}'),
  ('reading_frequency', 'bimonthly',   'Kéthavonta',   'Every 2 months', null, null, null, 20, true, '{"months": 2}'),
  ('reading_frequency', 'quarterly',   'Negyedévente', 'Quarterly',      null, null, null, 30, true, '{"months": 3}'),
  ('reading_frequency', 'half_yearly', 'Félévente',    'Every 6 months', null, null, null, 40, true, '{"months": 6}'),
  ('reading_frequency', 'yearly',      'Évente',       'Yearly',         null, null, null, 50, true, '{"months": 12}'),
  ('reading_due', 'd5',   'Minden hónap 5-éig',     'By the 5th of the month',  '5-éig',  'by the 5th',  null, 10, true, '{"day": 5}'),
  ('reading_due', 'd10',  'Minden hónap 10-éig',    'By the 10th of the month', '10-éig', 'by the 10th', null, 20, true, '{"day": 10}'),
  ('reading_due', 'd20',  'Minden hónap 20-áig',    'By the 20th of the month', '20-áig', 'by the 20th', null, 30, true, '{"day": 20}'),
  ('reading_due', 'last', 'A hónap utolsó napjáig', 'By the last day of the month', 'hó végéig', 'by month end', null, 40, true, '{"day": 0}'),
  -- settlement
  ('settlement', 'tenant_direct', 'Bérlő fizeti a szolgáltatónak',                    'Tenant pays the provider',                           'Bérlő fizeti',       'Tenant pays',  null, 10, true, '{"groups": ["utility", "other"]}'),
  ('settlement', 'by_usage',      'Bérbeadó fizeti, a bérlő fogyasztás szerint téríti', 'Landlord pays, the tenant repays by usage',          'Fogyasztás szerint', 'By usage',     null, 20, true, '{"groups": ["utility"]}'),
  ('settlement', 'flat_rate',     'Bérbeadó fizeti, a bérlő fix havi összeget fizet',  'Landlord pays, the tenant pays a fixed monthly sum', 'Átalány',            'Flat rate',    null, 30, true, '{"groups": ["utility", "other"]}'),
  ('settlement', 'in_rent',       'Benne van a bérleti díjban',                       'Included in the rent',                               'Bérleti díjban',     'In the rent',  null, 40, true, '{"groups": ["utility", "other"]}'),
  -- identifier suggestions
  ('identifier', 'supply_point', 'Felhasználási hely azonosító', 'Supply point ID', null, null, null, 10, true, '{"groups": ["utility"]}'),
  ('identifier', 'customer_id',  'Ügyfélazonosító',              'Customer ID',     null, null, null, 20, true, '{"groups": ["utility"]}'),
  ('identifier', 'customer_no',  'Ügyfélszám',                   'Customer number', null, null, null, 30, true, '{"groups": ["other"]}'),
  ('identifier', 'contract_no',  'Szerződésszám',                'Contract number', null, null, null, 40, true, '{"groups": ["utility", "other"]}'),
  -- contact roles
  ('contact_role', 'condo_manager', 'Közös képviselő', 'Building manager', null, null, null, 10, true, '{}'),
  ('contact_role', 'caretaker',     'Gondnok',         'Caretaker',        null, null, null, 20, true, '{}'),
  ('contact_role', 'owner',         'Tulajdonos',      'Owner',            null, null, null, 30, true, '{}'),
  ('contact_role', 'maintenance',   'Karbantartó',     'Maintenance',      null, null, null, 40, true, '{}'),
  ('contact_role', 'gardener',      'Kertész',         'Gardener',         null, null, null, 50, true, '{}'),
  ('contact_role', 'cleaner',       'Takarító',        'Cleaner',          null, null, null, 60, true, '{}'),
  -- rental terms
  ('pets', 'yes',        'Igen',    'Yes',        null, null, null, 10, true, '{}'),
  ('pets', 'on_request', 'Kérésre', 'On request', null, null, null, 20, true, '{}'),
  ('pets', 'no',         'Nem',     'No',         null, null, null, 30, true, '{}'),
  ('smoking', 'no',      'Nem',       'No',             null, null, null, 10, true, '{}'),
  ('smoking', 'balcony', 'Erkélyen',  'On the balcony', null, null, null, 20, true, '{}'),
  ('smoking', 'yes',     'Igen',      'Yes',            null, null, null, 30, true, '{}');

-- ---------- 1b. property_kind enum → text + catalogue ----------------------------------------------------------

drop function public.invitation_teaser(text);
drop function public.lease_request_preview(text);
drop function public.create_lease_request(text, text, text, text, text, date, integer, text, text, text, public.floor_type, smallint, text, date, integer, text, uuid, public.property_kind);

alter table public.properties alter column kind drop default;
alter table public.properties alter column kind type text using kind::text;
alter table public.properties alter column kind set default 'flat';
alter table public.lease_requests alter column property_kind drop default;
alter table public.lease_requests alter column property_kind type text using property_kind::text;
alter table public.lease_requests alter column property_kind set default 'flat';
drop type public.property_kind;

create trigger properties_catalog before insert or update on public.properties
  for each row execute function private.check_catalog('kind:property_type');
create trigger lease_requests_catalog before insert or update on public.lease_requests
  for each row execute function private.check_catalog('property_kind:property_type');

create or replace function public.invitation_teaser(p_token text)
returns table (
  kind public.invitation_kind, inviter_name text, street text, house_number text, postal_code text, city text,
  expires_at timestamptz, is_open boolean, masked_email text, property_kind text
) language sql stable security definer set search_path = '' as $$
  with inv as (
    select i.*,
           i.accepted_at is null and i.declined_at is null and i.revoked_at is null and i.expires_at > now() as open_
    from public.invitations i
    where i.token_hash = private.token_hash(p_token)
  )
  select i.kind,
         case when show then coalesce(inviter.full_name, tenant_acc.name) end,
         case when show then concat_ws(' ', r.street_name, r.street_type) end,
         case when show then r.house_number end,
         case when show then r.postal_code end,
         case when show then r.city end,
         i.expires_at,
         i.open_ and (r.id is null or r.status = 'pending_landlord'),
         left(i.email, 1) || '•••@' || split_part(i.email, '@', 2),
         case when show then r.property_kind end
  from inv i
  left join public.lease_requests r on r.id = i.lease_request_id
  left join public.accounts tenant_acc on tenant_acc.id = r.tenant_account_id
  left join public.profiles inviter on inviter.id = i.invited_by
  cross join lateral (select i.kind = 'lease_landlord' and i.open_ and r.status = 'pending_landlord' as show) s;
$$;

create or replace function public.lease_request_preview(p_token text)
returns table (
  request_id uuid, tenant_name text, postal_code text, city text, street_name text, street_type text, house_number text,
  building text, staircase text, floor_type public.floor_type, floor_number smallint, door text,
  start_date date, end_date date, monthly_rent integer, deposit_amount integer, expires_at timestamptz,
  property_kind text
) language sql stable security definer set search_path = '' as $$
  select r.id, coalesce(tenant.full_name, tenant_acc.name), r.postal_code, r.city, r.street_name, r.street_type, r.house_number,
         r.building, r.staircase, r.floor_type, r.floor_number, r.door,
         r.start_date, r.end_date, r.monthly_rent, r.deposit_amount, i.expires_at, r.property_kind
  from public.invitations i
  join public.lease_requests r on r.id = i.lease_request_id
  join public.accounts tenant_acc on tenant_acc.id = r.tenant_account_id
  left join public.profiles tenant on tenant.id = i.invited_by
  where i.token_hash = private.token_hash(p_token) and i.kind = 'lease_landlord'
    and (select auth.uid()) is not null and i.email = private.my_email()
    and i.accepted_at is null and i.declined_at is null and i.revoked_at is null and i.expires_at > now()
    and r.status = 'pending_landlord';
$$;

create or replace function public.create_lease_request(
  p_postal_code text, p_city text, p_street_name text, p_street_type text, p_house_number text,
  p_start_date date, p_monthly_rent integer, p_landlord_email text,
  p_building text default null, p_staircase text default null, p_floor_type public.floor_type default null,
  p_floor_number smallint default null, p_door text default null, p_end_date date default null,
  p_deposit_amount integer default null, p_landlord_name text default null, p_tenant_account_id uuid default null,
  p_property_kind text default 'flat'
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

revoke execute on function public.invitation_teaser(text) from public;
grant execute on function public.invitation_teaser(text) to anon, authenticated;
revoke execute on function public.lease_request_preview(text) from public, anon;
grant execute on function public.lease_request_preview(text) to authenticated;
revoke execute on function public.create_lease_request(text, text, text, text, text, date, integer, text, text, text, public.floor_type, smallint, text, date, integer, text, uuid, text) from public, anon;
grant execute on function public.create_lease_request(text, text, text, text, text, date, integer, text, text, text, public.floor_type, smallint, text, date, integer, text, uuid, text) to authenticated;

-- ---------- 2. Provider catalogue -------------------------------------------------------------------------------

create table public.providers (
  id            uuid primary key default gen_random_uuid(),
  service_types text[] not null check (cardinality(service_types) >= 1),
  role          text not null default 'supplier' check (role in ('supplier', 'network')),
  legal_name    text not null check (length(btrim(legal_name)) between 2 and 160),
  short_name    text not null check (length(btrim(short_name)) between 1 and 60),
  former_names  text[] not null default '{}',
  website       text check (website ~ '^https://[^\s]+$'),
  phone         text check (length(phone) <= 40),
  fault_phone   text check (length(fault_phone) <= 40),
  postcode_prefixes text[] not null default '{}',
  verified_at   date,
  source_url    text check (source_url ~ '^https://[^\s]+$'),
  active        boolean not null default true,
  sort          integer not null default 0,
  updated_at    timestamptz not null default now()
);
comment on table public.providers is 'Curated provider catalogue (utilities, telecom). Phone numbers only from official sources, with verified_at.';
comment on column public.providers.role is 'supplier: bills the service; network: the distribution network (outages, connection).';
comment on column public.providers.postcode_prefixes is 'Where the provider is offered first for an address (e.g. {1} = Budapest). Empty = no address suggestion.';
create trigger providers_updated_at before update on public.providers for each row execute function public.set_updated_at();
create index providers_types_idx on public.providers using gin (service_types);

insert into public.providers (service_types, role, legal_name, short_name, former_names, website, postcode_prefixes, verified_at, source_url, sort) values
  ('{electricity,gas}', 'supplier', 'MVM Next Energiakereskedelmi Zrt.', 'MVM Next', '{"E.ON","ELMŰ","ÉMÁSZ","NKM","Főgáz"}', 'https://www.mvmnext.hu', '{}', '2026-11-04', 'https://www.mvmnext.hu/garantalt-szolgaltatasok', 10),
  ('{electricity}', 'network', 'ELMŰ Hálózati Kft.', 'ELMŰ Hálózati', '{}', null, '{1}', '2026-11-04', 'https://www.economx.hu/magyar-gazdasag/2025/07/16/mvm-eon-szamla-informatikai-atallas-812769/', 20),
  ('{electricity}', 'network', 'E.ON Dél-dunántúli Áramhálózati Zrt.', 'E.ON Dél-dunántúli Áramhálózati', '{}', null, '{}', '2026-11-04', 'https://magyarhirlap.hu/belfold/20260519-80-millio-forint-birsagot-szabtak-ki-a-villamos-energiat-eloszto-cegekre', 21),
  ('{electricity}', 'network', 'E.ON Észak-dunántúli Áramhálózati Zrt.', 'E.ON Észak-dunántúli Áramhálózati', '{}', null, '{}', '2026-11-04', 'https://magyarhirlap.hu/belfold/20260519-80-millio-forint-birsagot-szabtak-ki-a-villamos-energiat-eloszto-cegekre', 22),
  ('{electricity}', 'network', 'OPUS TITÁSZ Áramhálózati Zrt.', 'OPUS TITÁSZ', '{}', null, '{}', '2026-11-04', 'https://magyarhirlap.hu/belfold/20260519-80-millio-forint-birsagot-szabtak-ki-a-villamos-energiat-eloszto-cegekre', 23),
  ('{electricity}', 'network', 'MVM Démász Áramhálózati Kft.', 'MVM Démász', '{}', null, '{}', '2026-11-04', 'https://magyarhirlap.hu/belfold/20260519-80-millio-forint-birsagot-szabtak-ki-a-villamos-energiat-eloszto-cegekre', 24),
  ('{electricity}', 'network', 'MVM Émász Áramhálózati Kft.', 'MVM Émász', '{}', 'https://mvmemaszhalozat.hu', '{}', '2026-11-04', 'https://magyarhirlap.hu/belfold/20260519-80-millio-forint-birsagot-szabtak-ki-a-villamos-energiat-eloszto-cegekre', 25),
  ('{gas}', 'network', 'MVM Főgáz Földgázhálózati Kft.', 'MVM Főgáz Földgázhálózati', '{}', null, '{1}', '2026-11-04', 'https://szamoldki.hu/hu/hirek/foldgazeloszto-tarsasagok-magyarorszagon-10-ceg-amely-a-halozatot-mukodteti', 30),
  ('{gas}', 'network', 'MVM Égáz-Dégáz Földgázhálózati Zrt.', 'MVM Égáz-Dégáz', '{}', null, '{}', '2026-11-04', 'https://szamoldki.hu/hu/hirek/foldgazeloszto-tarsasagok-magyarorszagon-10-ceg-amely-a-halozatot-mukodteti', 31),
  ('{gas}', 'network', 'OPUS TIGÁZ Zrt.', 'OPUS TIGÁZ', '{}', null, '{}', '2026-11-04', 'https://szamoldki.hu/hu/hirek/foldgazeloszto-tarsasagok-magyarorszagon-10-ceg-amely-a-halozatot-mukodteti', 32),
  ('{gas}', 'network', 'E.ON Dél-dunántúli Gázhálózati Zrt.', 'E.ON Dél-dunántúli Gázhálózati', '{}', null, '{}', '2026-11-04', 'https://szamoldki.hu/hu/hirek/foldgazeloszto-tarsasagok-magyarorszagon-10-ceg-amely-a-halozatot-mukodteti', 33),
  ('{gas}', 'network', 'E.ON Közép-dunántúli Gázhálózati Zrt.', 'E.ON Közép-dunántúli Gázhálózati', '{}', null, '{}', '2026-11-04', 'https://szamoldki.hu/hu/hirek/foldgazeloszto-tarsasagok-magyarorszagon-10-ceg-amely-a-halozatot-mukodteti', 34),
  ('{gas}', 'network', 'MAGÁZ Magyar Gázszolgáltató Kft.', 'MAGÁZ', '{}', null, '{}', '2026-11-04', 'https://szamoldki.hu/hu/hirek/foldgazeloszto-tarsasagok-magyarorszagon-10-ceg-amely-a-halozatot-mukodteti', 35),
  ('{gas}', 'network', 'E.GAS Gázelosztó Kft.', 'E.GAS', '{}', null, '{}', '2026-11-04', 'https://szamoldki.hu/hu/hirek/foldgazeloszto-tarsasagok-magyarorszagon-10-ceg-amely-a-halozatot-mukodteti', 36),
  ('{gas}', 'network', 'Natural Gas Service Kft.', 'Natural Gas Service', '{}', null, '{}', '2026-11-04', 'https://szamoldki.hu/hu/hirek/foldgazeloszto-tarsasagok-magyarorszagon-10-ceg-amely-a-halozatot-mukodteti', 37),
  ('{gas}', 'network', 'Ózdi Energiaszolgáltató és Kereskedelmi Kft.', 'Ózdi Energiaszolgáltató', '{}', null, '{}', '2026-11-04', 'https://szamoldki.hu/hu/hirek/foldgazeloszto-tarsasagok-magyarorszagon-10-ceg-amely-a-halozatot-mukodteti', 38),
  ('{gas}', 'network', 'Csepeli Erőmű Kft.', 'Csepeli Erőmű', '{}', null, '{}', '2026-11-04', 'https://szamoldki.hu/hu/hirek/foldgazeloszto-tarsasagok-magyarorszagon-10-ceg-amely-a-halozatot-mukodteti', 39),
  ('{water}', 'supplier', 'Fővárosi Vízművek Zrt.', 'Fővárosi Vízművek', '{}', 'https://vizmuvek.hu', '{1}', '2026-11-04', 'https://vizmuvek.hu', 40),
  ('{district_heat}', 'supplier', 'Budapesti Távhőszolgáltató Zrt. (FŐTÁV)', 'FŐTÁV', '{}', 'https://fotav.budapestikozmuvek.hu', '{1}', '2026-11-04', 'https://fotav.budapestikozmuvek.hu', 50),
  ('{internet,tv,phone}', 'supplier', 'Magyar Telekom Nyrt.', 'Telekom', '{"T-Home","T-Mobile"}', 'https://www.telekom.hu', '{}', '2026-11-04', 'https://www.telekom.hu', 60),
  ('{internet,tv,phone}', 'supplier', 'One Magyarország Zrt.', 'One', '{"Vodafone","DIGI","Invitech","UPC"}', 'https://www.one.hu', '{}', '2026-11-04', 'https://multimedia.one.hu/pdf/one/lakossagi/sajto/sajtokozlemeny-one-beolvadas-20250930.pdf', 61),
  ('{internet,tv,phone}', 'supplier', 'Yettel Magyarország Zrt.', 'Yettel', '{"Telenor"}', 'https://www.yettel.hu', '{}', '2026-11-04', 'https://www.yettel.hu', 62);

-- ---------- 3. Property data -------------------------------------------------------------------------------------

-- Keyfly ID: KF- and five characters without look-alikes (no 0/O, 1/I/L).
create or replace function private.new_property_code()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code text;
begin
  loop
    code := 'KF-';
    for i in 1 .. 5 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.properties p where p.public_code = code);
  end loop;
  return code;
end;
$$;

create table public.import_batches (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.accounts (id) on delete cascade,
  created_by    uuid references public.profiles (id) on delete set null,
  file_name     text not null check (length(file_name) <= 200),
  rows_total    integer not null check (rows_total >= 0),
  rows_imported integer not null default 0 check (rows_imported >= 0),
  created_at    timestamptz not null default now(),
  undone_at     timestamptz
);
comment on table public.import_batches is 'One Excel/CSV import; undone as a whole (its properties are removed while nothing hangs on them).';
create index import_batches_account_idx on public.import_batches (account_id);

alter table public.properties
  add column public_code      text,
  add column own_ref          text check (length(btrim(own_ref)) between 1 and 30),
  add column other_kind_label text check (length(btrim(other_kind_label)) between 1 and 40),
  add column area_m2          numeric(8, 2) check (area_m2 > 0 and area_m2 < 100000),
  add column rooms            smallint check (rooms between 0 and 50),
  add column half_rooms       smallint check (half_rooms between 0 and 50),
  add column built_year       smallint check (built_year between 1500 and 2100),
  add column heating          text,
  add column energy_rating    text,
  add column parking          text,
  add column lift             boolean,
  add column furnishing       text,
  add column import_batch_id  uuid references public.import_batches (id) on delete set null,
  add column copied_from      uuid references public.properties (id) on delete set null;

update public.properties set public_code = private.new_property_code() where public_code is null;
alter table public.properties
  alter column public_code set not null,
  add constraint properties_public_code_key unique (public_code),
  add constraint properties_public_code_format check (public_code ~ '^KF-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$'),
  add constraint properties_other_label check (other_kind_label is null or kind = 'other');
create unique index properties_own_ref_key on public.properties (account_id, lower(btrim(own_ref))) where own_ref is not null and archived_at is null;
create index properties_import_batch_idx on public.properties (import_batch_id) where import_batch_id is not null;
create index properties_copied_from_idx on public.properties (copied_from) where copied_from is not null;

comment on column public.properties.public_code is 'Keyfly ID shown to people (KF-XXXXX); never reused.';
comment on column public.properties.own_ref is 'The account''s own ID for the property (e.g. B-12); unique per account among live properties.';
comment on column public.properties.label is 'Name; empty = the short address is shown.';

drop trigger properties_catalog on public.properties;
create trigger properties_catalog before insert or update on public.properties
  for each row execute function private.check_catalog('kind:property_type', 'heating:heating', 'energy_rating:energy_rating',
                                                      'parking:parking', 'furnishing:furnishing');

-- The public code is assigned by the database and never changes.
create or replace function private.property_code_fixed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.public_code := private.new_property_code();
  elsif new.public_code is distinct from old.public_code then
    raise exception 'public_code_is_fixed' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger properties_code before insert or update on public.properties for each row execute function private.property_code_fixed();

create table public.property_outdoor (
  property_id uuid not null references public.properties (id) on delete cascade,
  kind        text not null,
  area_m2     numeric(7, 2) check (area_m2 > 0 and area_m2 < 10000),
  primary key (property_id, kind)
);
comment on table public.property_outdoor is 'Balcony, terrace, garden … with the size when known.';
create trigger property_outdoor_catalog before insert or update on public.property_outdoor
  for each row execute function private.check_catalog('kind:outdoor_kind');

create table public.account_extras (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  label      text not null check (length(btrim(label)) between 1 and 40),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
comment on table public.account_extras is 'Extras an account adds itself (e.g. Mosogatógép); offered on all of its properties.';
create unique index account_extras_label_key on public.account_extras (account_id, lower(btrim(label)));

create table public.property_extras (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid not null references public.properties (id) on delete cascade,
  extra_key        text,
  account_extra_id uuid references public.account_extras (id) on delete cascade,
  constraint property_extras_one_source check ((extra_key is null) <> (account_extra_id is null))
);
create unique index property_extras_key on public.property_extras (property_id, extra_key) where extra_key is not null;
create unique index property_extras_account_key on public.property_extras (property_id, account_extra_id) where account_extra_id is not null;
create index property_extras_account_extra_idx on public.property_extras (account_extra_id) where account_extra_id is not null;
create trigger property_extras_catalog before insert or update on public.property_extras
  for each row execute function private.check_catalog('extra_key:property_extra');

-- ---------- 4. Contacts ------------------------------------------------------------------------------------------

create table public.contacts (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts (id) on delete cascade,
  name        text not null check (length(btrim(name)) between 1 and 120),
  email       text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  phone       text check (length(btrim(phone)) between 3 and 40),
  address     text check (length(address) <= 200),
  note        text check (length(note) <= 500),
  default_role_key   text,
  default_role_label text check (length(btrim(default_role_label)) between 1 and 40),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz
);
comment on table public.contacts is 'People and firms of an account (building manager, caretaker, gardener, owner …); picked per property.';
create index contacts_account_idx on public.contacts (account_id);
create trigger contacts_updated_at before update on public.contacts for each row execute function public.set_updated_at();
create trigger contacts_catalog before insert or update on public.contacts
  for each row execute function private.check_catalog('default_role_key:contact_role');

create table public.property_contacts (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references public.properties (id) on delete cascade,
  contact_id     uuid not null references public.contacts (id) on delete cascade,
  role_key       text,
  role_label     text check (length(btrim(role_label)) between 1 and 40),
  tenant_visible boolean not null default false,
  sort           integer not null default 0,
  created_at     timestamptz not null default now(),
  constraint property_contacts_role check ((role_key is null) <> (role_label is null))
);
comment on column public.property_contacts.role_label is 'An own role typed by the user (e.g. Kulcsos) instead of a catalogue role.';
create unique index property_contacts_once on public.property_contacts (property_id, contact_id, coalesce(role_key, ''), coalesce(lower(role_label), ''));
create index property_contacts_contact_idx on public.property_contacts (contact_id);
create trigger property_contacts_catalog before insert or update on public.property_contacts
  for each row execute function private.check_catalog('role_key:contact_role');

-- Landlord-only data of a property: tenants never read this table.
create table public.property_management (
  property_id         uuid primary key references public.properties (id) on delete cascade,
  owner_kind          text check (owner_kind in ('self', 'account', 'other')),
  owner_contact_id    uuid references public.contacts (id) on delete set null,
  responsible_user_id uuid references public.profiles (id) on delete set null,
  common_charge       integer check (common_charge >= 0 and common_charge < 100000000),
  note                text check (length(note) <= 2000),
  updated_at          timestamptz not null default now(),
  constraint property_management_owner check (owner_contact_id is null or owner_kind = 'other')
);
comment on table public.property_management is 'Owner, responsible colleague, common charge (HUF / month) and the internal note. Landlord side only.';
create index property_management_owner_idx on public.property_management (owner_contact_id) where owner_contact_id is not null;
create index property_management_responsible_idx on public.property_management (responsible_user_id) where responsible_user_id is not null;
create trigger property_management_updated_at before update on public.property_management for each row execute function public.set_updated_at();

-- ---------- 5. Services, identifiers, meters --------------------------------------------------------------------

create table public.property_services (
  id                  uuid primary key default gen_random_uuid(),
  property_id         uuid not null references public.properties (id) on delete cascade,
  type_key            text not null,
  custom_label        text check (length(btrim(custom_label)) between 1 and 60),
  provider_id         uuid references public.providers (id) on delete set null,
  provider_name       text check (length(btrim(provider_name)) between 1 and 120),
  network_provider_id uuid references public.providers (id) on delete set null,
  contact_id          uuid references public.contacts (id) on delete set null,
  settlement_key      text not null default 'tenant_direct',
  fee_amount          integer check (fee_amount >= 0 and fee_amount < 100000000),
  fee_currency        text not null default 'HUF' check (fee_currency in ('HUF', 'EUR')),
  reading_required    boolean not null default false,
  reading_frequency   text,
  reading_due         text,
  paused_from         date,
  paused_until        date,
  ended_on            date,
  sort                integer not null default 0,
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint property_services_reading check (not reading_required or (reading_frequency is not null and reading_due is not null)),
  constraint property_services_pause check (paused_until is null or (paused_from is not null and paused_until >= paused_from)),
  constraint property_services_provider check (provider_id is null or provider_name is null)
);
comment on table public.property_services is 'A utility or other service of a property. provider_id (catalogue) or provider_name (typed) or contact_id (e.g. the gardener).';
comment on column public.property_services.fee_amount is 'Monthly fee: the provider''s fee for other services; the fixed sum the tenant pays for flat_rate.';
comment on column public.property_services.paused_from is 'Paused from this day (until paused_until, or until resumed); a paused service is left out of settlement.';
create index property_services_property_idx on public.property_services (property_id);
create index property_services_provider_idx on public.property_services (provider_id) where provider_id is not null;
create index property_services_network_idx on public.property_services (network_provider_id) where network_provider_id is not null;
create index property_services_contact_idx on public.property_services (contact_id) where contact_id is not null;
create trigger property_services_updated_at before update on public.property_services for each row execute function public.set_updated_at();
create trigger property_services_catalog before insert or update on public.property_services
  for each row execute function private.check_catalog('type_key:service_type', 'settlement_key:settlement',
                                                      'reading_frequency:reading_frequency', 'reading_due:reading_due');

create or replace function private.service_group(type_key text)
returns text language sql stable security definer set search_path = '' as $$
  select c.meta ->> 'group' from public.catalog_items c where c.list = 'service_type' and c.key = type_key;
$$;

-- Rules that depend on the service type: settlement must suit the group; only utilities are read; custom label only
-- for "other" types.
create or replace function private.check_service()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  grp text := private.service_group(new.type_key);
  asks boolean := coalesce((select (c.meta ->> 'asks_label')::boolean from public.catalog_items c where c.list = 'service_type' and c.key = new.type_key), false);
begin
  if not exists (select 1 from public.catalog_items c where c.list = 'settlement' and c.key = new.settlement_key and c.meta -> 'groups' ? grp) then
    raise exception 'settlement_not_for_this_service' using errcode = '22023';
  end if;
  if new.reading_required and grp <> 'utility' then
    raise exception 'only_utilities_are_read' using errcode = '22023';
  end if;
  if new.custom_label is not null and not asks then
    raise exception 'custom_label_only_for_other' using errcode = '22023';
  end if;
  if new.network_provider_id is not null and grp <> 'utility' then
    raise exception 'network_only_for_utilities' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger property_services_rules before insert or update on public.property_services for each row execute function private.check_service();

create table public.service_identifiers (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.property_services (id) on delete cascade,
  label      text not null check (length(btrim(label)) between 1 and 60),
  value      text not null check (length(btrim(value)) between 1 and 120),
  sort       integer not null default 0
);
comment on table public.service_identifiers is 'The landlord''s own identifiers of a service (supply point ID, customer number …), label + value.';
create index service_identifiers_service_idx on public.service_identifiers (service_id);

create table public.meters (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.property_services (id) on delete cascade,
  name        text not null check (length(btrim(name)) between 1 and 60),
  tariff_key  text,
  unit_key    text not null default 'kwh',
  serial      text check (length(btrim(serial)) between 1 and 40),
  registers   smallint not null default 1 check (registers in (1, 2)),
  location    text check (length(btrim(location)) between 1 and 80),
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);
comment on column public.meters.registers is '2 = a day / night meter read as two values.';
create index meters_service_idx on public.meters (service_id);
create trigger meters_catalog before insert or update on public.meters
  for each row execute function private.check_catalog('tariff_key:meter_tariff', 'unit_key:meter_unit');

create or replace function private.check_meter()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(private.service_group((select s.type_key from public.property_services s where s.id = new.service_id)), '') <> 'utility' then
    raise exception 'meters_only_for_utilities' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger meters_rules before insert or update on public.meters for each row execute function private.check_meter();

-- ---------- 6. Listing and photos --------------------------------------------------------------------------------

create table public.property_listing (
  property_id         uuid primary key references public.properties (id) on delete cascade,
  asking_rent         integer check (asking_rent > 0 and asking_rent < 1000000000),
  currency            text not null default 'HUF' check (currency in ('HUF', 'EUR')),
  deposit_months      smallint check (deposit_months between 0 and 12),
  available_now       boolean not null default true,
  available_from      date,
  min_term_months     smallint check (min_term_months between 1 and 120),
  pets                text,
  smoking             text,
  est_bills           integer check (est_bills >= 0 and est_bills < 100000000),
  parking_property_id uuid references public.properties (id) on delete set null,
  parking_rent        integer check (parking_rent >= 0 and parking_rent < 100000000),
  title               text check (length(btrim(title)) between 1 and 120),
  description         text check (length(description) <= 3000),
  updated_at          timestamptz not null default now(),
  constraint property_listing_available check (available_now or available_from is not null),
  constraint property_listing_parking_not_self check (parking_property_id is distinct from property_id)
);
comment on table public.property_listing is 'Rental terms and the listing text. Amounts per month; est_bills and parking_rent in the listing currency.';
create index property_listing_parking_idx on public.property_listing (parking_property_id) where parking_property_id is not null;
create trigger property_listing_updated_at before update on public.property_listing for each row execute function public.set_updated_at();
create trigger property_listing_catalog before insert or update on public.property_listing
  for each row execute function private.check_catalog('pets:pets', 'smoking:smoking');

create table public.property_links (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  label       text not null check (length(btrim(label)) between 1 and 60),
  url         text not null check (url ~ '^https?://[^\s]+$' and length(url) <= 500),
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);
comment on table public.property_links is 'Listing links (ingatlan.com, Jófogás, a virtual tour or a video).';
create index property_links_property_idx on public.property_links (property_id);

create table public.property_media (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  path        text not null unique check (length(path) <= 300),
  is_cover    boolean not null default false,
  sort        integer not null default 0,
  width       integer check (width > 0),
  height      integer check (height > 0),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
comment on table public.property_media is 'Photos of a property in the private property-media bucket (<account>/<property>/<file>).';
create index property_media_property_idx on public.property_media (property_id, sort);
create unique index property_media_one_cover on public.property_media (property_id) where is_cover;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-media', 'property-media', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- The second folder of a storage path as a property id (account/property/file).
create or replace function private.storage_property(name text)
returns uuid language sql immutable set search_path = '' as $$
  select case when (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then (storage.foldername(name))[2]::uuid end;
$$;

-- A photo path belongs to its property's account folder.
create or replace function private.media_path_ok(prop uuid, path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.properties p
                 where p.id = prop and private.storage_account(path) = p.account_id and private.storage_property(path) = p.id);
$$;
alter table public.property_media add constraint property_media_path_format check (path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9_.-]{1,80}$');

create policy "property_media_select" on storage.objects for select to authenticated
  using (bucket_id = 'property-media' and (private.can_see_property(private.storage_property(name)) or private.is_staff()));
create policy "property_media_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'property-media' and private.can_manage_property(private.storage_property(name))
              and private.media_path_ok(private.storage_property(name), name));
create policy "property_media_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'property-media' and private.can_manage_property(private.storage_property(name)));

-- ---------- Same-account rules ----------------------------------------------------------------------------------

-- Contacts, colleagues, parking spaces and extras referenced from a property must belong to its account.
create or replace function private.property_account(prop uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select account_id from public.properties where id = prop;
$$;

create or replace function private.check_same_account()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  acc uuid := private.property_account(new.property_id);
begin
  if tg_table_name = 'property_contacts' then
    if (select c.account_id from public.contacts c where c.id = new.contact_id) is distinct from acc then
      raise exception 'contact_not_in_account' using errcode = '42501';
    end if;
  elsif tg_table_name = 'property_services' then
    if new.contact_id is not null and (select c.account_id from public.contacts c where c.id = new.contact_id) is distinct from acc then
      raise exception 'contact_not_in_account' using errcode = '42501';
    end if;
  elsif tg_table_name = 'property_management' then
    if new.owner_contact_id is not null and (select c.account_id from public.contacts c where c.id = new.owner_contact_id) is distinct from acc then
      raise exception 'contact_not_in_account' using errcode = '42501';
    end if;
    if new.responsible_user_id is not null
       and not exists (select 1 from public.account_members m where m.account_id = acc and m.user_id = new.responsible_user_id) then
      raise exception 'responsible_not_in_account' using errcode = '42501';
    end if;
  elsif tg_table_name = 'property_listing' then
    if new.parking_property_id is not null and private.property_account(new.parking_property_id) is distinct from acc then
      raise exception 'parking_not_in_account' using errcode = '42501';
    end if;
  elsif tg_table_name = 'property_extras' then
    if new.account_extra_id is not null and (select e.account_id from public.account_extras e where e.id = new.account_extra_id) is distinct from acc then
      raise exception 'extra_not_in_account' using errcode = '42501';
    end if;
  elsif tg_table_name = 'property_media' then
    if not private.media_path_ok(new.property_id, new.path) then
      raise exception 'media_path_not_of_property' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger property_contacts_same_account before insert or update on public.property_contacts for each row execute function private.check_same_account();
create trigger property_services_same_account before insert or update on public.property_services for each row execute function private.check_same_account();
create trigger property_management_same_account before insert or update on public.property_management for each row execute function private.check_same_account();
create trigger property_listing_same_account before insert or update on public.property_listing for each row execute function private.check_same_account();
create trigger property_extras_same_account before insert or update on public.property_extras for each row execute function private.check_same_account();
create trigger property_media_same_account before insert or update on public.property_media for each row execute function private.check_same_account();

-- Children never move to another property.
create or replace function private.property_id_fixed()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.property_id <> old.property_id then
    raise exception 'property_id_is_fixed' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger property_services_property_fixed before update on public.property_services for each row execute function private.property_id_fixed();
create trigger property_contacts_property_fixed before update on public.property_contacts for each row execute function private.property_id_fixed();
create trigger property_media_property_fixed before update on public.property_media for each row execute function private.property_id_fixed();
create trigger property_links_property_fixed before update on public.property_links for each row execute function private.property_id_fixed();

create or replace function private.service_property(sid uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select property_id from public.property_services where id = sid;
$$;

-- Tenants see utilities (with their identifiers and meters) and the contacts shared with them; nothing else here.
create or replace function private.tenant_sees_service(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.property_services s
                 where s.id = sid and private.service_group(s.type_key) = 'utility' and s.ended_on is null
                   and private.has_tenant_view_of_property(s.property_id));
$$;

-- ---------- Access ----------------------------------------------------------------------------------------------

alter table public.catalog_items enable row level security;
alter table public.providers enable row level security;
alter table public.import_batches enable row level security;
alter table public.property_outdoor enable row level security;
alter table public.account_extras enable row level security;
alter table public.property_extras enable row level security;
alter table public.contacts enable row level security;
alter table public.property_contacts enable row level security;
alter table public.property_management enable row level security;
alter table public.property_services enable row level security;
alter table public.service_identifiers enable row level security;
alter table public.meters enable row level security;
alter table public.property_listing enable row level security;
alter table public.property_links enable row level security;
alter table public.property_media enable row level security;

revoke all on public.catalog_items, public.providers, public.import_batches, public.property_outdoor, public.account_extras,
  public.property_extras, public.contacts, public.property_contacts, public.property_management, public.property_services,
  public.service_identifiers, public.meters, public.property_listing, public.property_links, public.property_media
  from anon, authenticated;

-- Catalogue: everyone reads (labels on signed-out invitation pages too); staff edits; rows are never deleted.
grant select on public.catalog_items to anon, authenticated;
grant insert, update (label_hu, label_en, short_hu, short_en, icon, sort, active, meta) on public.catalog_items to authenticated;
create policy "catalog_select_all" on public.catalog_items for select to anon, authenticated using (true);
create policy "catalog_insert_staff" on public.catalog_items for insert to authenticated with check (private.is_staff());
create policy "catalog_update_staff" on public.catalog_items for update to authenticated using (private.is_staff()) with check (private.is_staff());

grant select on public.providers to authenticated;
grant insert, update on public.providers to authenticated;
create policy "providers_select" on public.providers for select to authenticated using (active or private.is_staff());
create policy "providers_insert_staff" on public.providers for insert to authenticated with check (private.is_staff());
create policy "providers_update_staff" on public.providers for update to authenticated using (private.is_staff()) with check (private.is_staff());

grant select on public.import_batches to authenticated;
create policy "import_batches_select" on public.import_batches for select to authenticated
  using (private.has_account_role(account_id, array['owner', 'admin', 'manager']::public.account_role[]) or private.is_staff());

-- Properties: the new columns are writable by managers (the policy on properties already limits rows).
grant update (own_ref, other_kind_label, area_m2, rooms, half_rooms, built_year, heating, energy_rating, parking, lift, furnishing)
  on public.properties to authenticated;

-- Children of a property: landlord side reads within its scope, managers write.
grant select, insert, delete on public.property_outdoor to authenticated;
grant update (area_m2) on public.property_outdoor to authenticated;
create policy "outdoor_select" on public.property_outdoor for select to authenticated
  using (private.can_see_property(property_id) or private.has_tenant_view_of_property(property_id) or private.is_staff());
create policy "outdoor_insert" on public.property_outdoor for insert to authenticated with check (private.can_manage_property(property_id));
create policy "outdoor_update" on public.property_outdoor for update to authenticated using (private.can_manage_property(property_id)) with check (private.can_manage_property(property_id));
create policy "outdoor_delete" on public.property_outdoor for delete to authenticated using (private.can_manage_property(property_id));

grant select, insert, delete on public.account_extras to authenticated;
create policy "account_extras_select" on public.account_extras for select to authenticated
  using (private.is_account_member(account_id) or private.is_staff()
         or exists (select 1 from public.property_extras pe where pe.account_extra_id = account_extras.id and private.has_tenant_view_of_property(pe.property_id)));
create policy "account_extras_insert" on public.account_extras for insert to authenticated
  with check (private.has_account_role(account_id, array['owner', 'admin', 'manager']::public.account_role[]) and created_by = (select auth.uid()));
create policy "account_extras_delete" on public.account_extras for delete to authenticated
  using (private.has_account_role(account_id, array['owner', 'admin', 'manager']::public.account_role[]));

grant select, insert, delete on public.property_extras to authenticated;
create policy "property_extras_select" on public.property_extras for select to authenticated
  using (private.can_see_property(property_id) or private.has_tenant_view_of_property(property_id) or private.is_staff());
create policy "property_extras_insert" on public.property_extras for insert to authenticated with check (private.can_manage_property(property_id));
create policy "property_extras_delete" on public.property_extras for delete to authenticated using (private.can_manage_property(property_id));

grant select, insert on public.contacts to authenticated;
grant update (name, email, phone, address, note, default_role_key, default_role_label, archived_at) on public.contacts to authenticated;
create policy "contacts_select" on public.contacts for select to authenticated
  using (private.is_account_member(account_id) or private.is_staff()
         or exists (select 1 from public.property_contacts pc
                    where pc.contact_id = contacts.id and pc.tenant_visible and private.has_tenant_view_of_property(pc.property_id)));
create policy "contacts_insert" on public.contacts for insert to authenticated
  with check (private.has_account_role(account_id, array['owner', 'admin', 'manager']::public.account_role[]) and created_by = (select auth.uid()));
create policy "contacts_update" on public.contacts for update to authenticated
  using (private.has_account_role(account_id, array['owner', 'admin', 'manager']::public.account_role[]))
  with check (private.has_account_role(account_id, array['owner', 'admin', 'manager']::public.account_role[]));

grant select, insert, delete on public.property_contacts to authenticated;
grant update (role_key, role_label, tenant_visible, sort) on public.property_contacts to authenticated;
create policy "property_contacts_select" on public.property_contacts for select to authenticated
  using (private.can_see_property(property_id) or private.is_staff()
         or (tenant_visible and private.has_tenant_view_of_property(property_id)));
create policy "property_contacts_insert" on public.property_contacts for insert to authenticated with check (private.can_manage_property(property_id));
create policy "property_contacts_update" on public.property_contacts for update to authenticated using (private.can_manage_property(property_id)) with check (private.can_manage_property(property_id));
create policy "property_contacts_delete" on public.property_contacts for delete to authenticated using (private.can_manage_property(property_id));

grant select, insert on public.property_management to authenticated;
grant update (owner_kind, owner_contact_id, responsible_user_id, common_charge, note) on public.property_management to authenticated;
create policy "management_select" on public.property_management for select to authenticated
  using (private.can_see_property(property_id) or private.is_staff());
create policy "management_insert" on public.property_management for insert to authenticated with check (private.can_manage_property(property_id));
create policy "management_update" on public.property_management for update to authenticated using (private.can_manage_property(property_id)) with check (private.can_manage_property(property_id));

grant select, insert, delete on public.property_services to authenticated;
grant update (type_key, custom_label, provider_id, provider_name, network_provider_id, contact_id, settlement_key, fee_amount, fee_currency,
              reading_required, reading_frequency, reading_due, paused_from, paused_until, ended_on, sort)
  on public.property_services to authenticated;
create policy "services_select" on public.property_services for select to authenticated
  using (private.can_see_property(property_id) or private.is_staff() or private.tenant_sees_service(id));
create policy "services_insert" on public.property_services for insert to authenticated
  with check (private.can_manage_property(property_id) and created_by = (select auth.uid()));
create policy "services_update" on public.property_services for update to authenticated using (private.can_manage_property(property_id)) with check (private.can_manage_property(property_id));
create policy "services_delete" on public.property_services for delete to authenticated using (private.can_manage_property(property_id));

grant select, insert, delete on public.service_identifiers to authenticated;
grant update (label, value, sort) on public.service_identifiers to authenticated;
create policy "identifiers_select" on public.service_identifiers for select to authenticated
  using (private.can_see_property(private.service_property(service_id)) or private.is_staff() or private.tenant_sees_service(service_id));
create policy "identifiers_insert" on public.service_identifiers for insert to authenticated with check (private.can_manage_property(private.service_property(service_id)));
create policy "identifiers_update" on public.service_identifiers for update to authenticated
  using (private.can_manage_property(private.service_property(service_id))) with check (private.can_manage_property(private.service_property(service_id)));
create policy "identifiers_delete" on public.service_identifiers for delete to authenticated using (private.can_manage_property(private.service_property(service_id)));

grant select, insert, delete on public.meters to authenticated;
grant update (name, tariff_key, unit_key, serial, registers, location, sort, archived_at) on public.meters to authenticated;
create policy "meters_select" on public.meters for select to authenticated
  using (private.can_see_property(private.service_property(service_id)) or private.is_staff() or private.tenant_sees_service(service_id));
create policy "meters_insert" on public.meters for insert to authenticated with check (private.can_manage_property(private.service_property(service_id)));
create policy "meters_update" on public.meters for update to authenticated
  using (private.can_manage_property(private.service_property(service_id))) with check (private.can_manage_property(private.service_property(service_id)));
create policy "meters_delete" on public.meters for delete to authenticated using (private.can_manage_property(private.service_property(service_id)));

grant select, insert on public.property_listing to authenticated;
grant update (asking_rent, currency, deposit_months, available_now, available_from, min_term_months, pets, smoking, est_bills,
              parking_property_id, parking_rent, title, description) on public.property_listing to authenticated;
create policy "listing_select" on public.property_listing for select to authenticated using (private.can_see_property(property_id) or private.is_staff());
create policy "listing_insert" on public.property_listing for insert to authenticated with check (private.can_manage_property(property_id));
create policy "listing_update" on public.property_listing for update to authenticated using (private.can_manage_property(property_id)) with check (private.can_manage_property(property_id));

grant select, insert, delete on public.property_links to authenticated;
grant update (label, url, sort) on public.property_links to authenticated;
create policy "links_select" on public.property_links for select to authenticated using (private.can_see_property(property_id) or private.is_staff());
create policy "links_insert" on public.property_links for insert to authenticated with check (private.can_manage_property(property_id));
create policy "links_update" on public.property_links for update to authenticated using (private.can_manage_property(property_id)) with check (private.can_manage_property(property_id));
create policy "links_delete" on public.property_links for delete to authenticated using (private.can_manage_property(property_id));

grant select, insert, delete on public.property_media to authenticated;
grant update (is_cover, sort) on public.property_media to authenticated;
create policy "media_select" on public.property_media for select to authenticated using (private.can_see_property(property_id) or private.is_staff());
create policy "media_insert" on public.property_media for insert to authenticated
  with check (private.can_manage_property(property_id) and created_by = (select auth.uid()));
create policy "media_update" on public.property_media for update to authenticated using (private.can_manage_property(property_id)) with check (private.can_manage_property(property_id));
create policy "media_delete" on public.property_media for delete to authenticated using (private.can_manage_property(property_id));

revoke execute on function private.check_catalog(), private.catalog_key_fixed(), private.new_property_code(), private.property_code_fixed(),
  private.service_group(text), private.check_service(), private.check_meter(), private.storage_property(text), private.media_path_ok(uuid, text),
  private.property_account(uuid), private.check_same_account(), private.property_id_fixed(), private.service_property(uuid),
  private.tenant_sees_service(uuid) from public, anon;
grant execute on function private.service_group(text), private.storage_property(text), private.media_path_ok(uuid, text),
  private.property_account(uuid), private.service_property(uuid), private.tenant_sees_service(uuid) to authenticated;
