-- Property module: catalogue, Keyfly ID, features, contacts, services, meters, listing, photos – and who sees what.
-- Run with: scripts/test-db.sh. Self-contained: own users, everything rolled back. Uses the helpers from rls.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000ab001', 'lili@example.com',  '{"full_name":"Lili Landlord"}'),
  ('00000000-0000-0000-0000-0000000ab002', 'vera@example.com',  '{"full_name":"Vera Viewer"}'),
  ('00000000-0000-0000-0000-0000000ab003', 'tamas@example.com', '{"full_name":"Tamás Tenant"}'),
  ('00000000-0000-0000-0000-0000000ab004', 'olga@example.com',  '{"full_name":"Olga Outsider"}'),
  ('00000000-0000-0000-0000-0000000ab005', 'marci@example.com', '{"full_name":"Marci Manager"}');

set local role service_role;
create temp table pco as select public.create_company_account('00000000-0000-0000-0000-0000000ab001', 'Lili Ingatlan Kft.', '11223344-2-41', '1139 Budapest, Váci út 1.', 'Lili') as id;
reset role;
grant select on pco to authenticated;
insert into public.account_members (account_id, user_id, role) select id, '00000000-0000-0000-0000-0000000ab002', 'viewer' from pco;
insert into public.account_members (account_id, user_id, role) select id, '00000000-0000-0000-0000-0000000ab005', 'manager' from pco;
create temp table tacc as select id from public.accounts where personal_user_id = '00000000-0000-0000-0000-0000000ab003';
create temp table oacc as select id from public.accounts where personal_user_id = '00000000-0000-0000-0000-0000000ab004';
grant select on tacc, oacc to authenticated;

-- ---------- Catalogue ----------
set local role anon;
select tests.ok((select count(*) > 0 from public.catalog_items where list = 'property_type'), 'anyone reads the catalogue');
reset role;
select tests.act_as('00000000-0000-0000-0000-0000000ab001');
select tests.throws($$insert into public.catalog_items (list, key, label_hu, label_en) values ('heating', 'wood', 'Fa', 'Wood')$$, 'only staff adds to the catalogue');
update public.catalog_items set label_hu = 'X' where list = 'heating' and key = 'district';
select tests.ok((select label_hu = 'Távfűtés' from public.catalog_items where list = 'heating' and key = 'district'), '… or changes it');
reset role;
select tests.throws($$update public.catalog_items set key = 'gas2' where list = 'service_type' and key = 'gas'$$, 'catalogue keys never change');
select tests.ok((select count(*) = 22 from public.providers), 'the verified provider list is seeded');

-- ---------- Property: Keyfly ID, own ID, catalogue keys ----------
select tests.act_as('00000000-0000-0000-0000-0000000ab001');
insert into public.properties (id, account_id, kind, label, own_ref, postal_code, city, street_name, street_type, house_number, floor_type, door, created_by)
select '00000000-0000-0000-0000-0000000ab0e1', id, 'flat', 'Duna-parti lakás', 'B-12', '1138', 'Budapest', 'Hajóépítő', 'sétány', '4.', 'ground', '4', '00000000-0000-0000-0000-0000000ab001' from pco;
insert into public.properties (id, account_id, kind, own_ref, postal_code, city, street_name, street_type, house_number, created_by)
select '00000000-0000-0000-0000-0000000ab0e2', id, 'parking', 'G-07', '1138', 'Budapest', 'Hajóépítő', 'sétány', '4.', '00000000-0000-0000-0000-0000000ab001' from pco;
select tests.ok((select public_code ~ '^KF-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$' from public.properties where id = '00000000-0000-0000-0000-0000000ab0e1'), 'a property gets a Keyfly ID');
select tests.ok((select count(distinct public_code) = 2 from public.properties where id in ('00000000-0000-0000-0000-0000000ab0e1', '00000000-0000-0000-0000-0000000ab0e2')), '… a different one each');
select tests.throws($$update public.properties set public_code = 'KF-AAAAA' where id = '00000000-0000-0000-0000-0000000ab0e1'$$, 'the Keyfly ID never changes');
select tests.throws($$insert into public.properties (account_id, own_ref, postal_code, city, street_name, street_type, house_number, created_by)
  select id, 'b-12', '1138', 'Budapest', 'X', 'utca', '1.', '00000000-0000-0000-0000-0000000ab001' from pco$$, 'the own ID is unique in the account (any case)');
select tests.throws($$insert into public.properties (account_id, kind, postal_code, city, street_name, street_type, house_number, created_by)
  select id, 'room', '1138', 'Budapest', 'X', 'utca', '1.', '00000000-0000-0000-0000-0000000ab001' from pco$$, 'a retired type is not offered any more');
select tests.throws($$insert into public.properties (account_id, kind, postal_code, city, street_name, street_type, house_number, created_by)
  select id, 'castle', '1138', 'Budapest', 'X', 'utca', '1.', '00000000-0000-0000-0000-0000000ab001' from pco$$, 'an unknown type is refused');
select tests.throws($$update public.properties set other_kind_label = 'Műterem' where id = '00000000-0000-0000-0000-0000000ab0e1'$$, 'the own type name only for "other"');
update public.properties set area_m2 = 54, rooms = 2, half_rooms = 1, built_year = 2008, heating = 'gas_boiler', energy_rating = 'BB',
  parking = 'street', lift = false, furnishing = 'partly' where id = '00000000-0000-0000-0000-0000000ab0e1';
select tests.ok((select heating = 'gas_boiler' and area_m2 = 54 from public.properties where id = '00000000-0000-0000-0000-0000000ab0e1'), 'the holder fills in the features');
select tests.throws($$update public.properties set heating = 'fireplace' where id = '00000000-0000-0000-0000-0000000ab0e1'$$, 'a feature value comes from the catalogue');

insert into public.property_outdoor (property_id, kind, area_m2) values ('00000000-0000-0000-0000-0000000ab0e1', 'balcony', 6);
insert into public.account_extras (id, account_id, label, created_by) select '00000000-0000-0000-0000-0000000ab0a1', id, 'Mosogatógép', '00000000-0000-0000-0000-0000000ab001' from pco;
insert into public.property_extras (property_id, extra_key) values ('00000000-0000-0000-0000-0000000ab0e1', 'air_con');
insert into public.property_extras (property_id, account_extra_id) values ('00000000-0000-0000-0000-0000000ab0e1', '00000000-0000-0000-0000-0000000ab0a1');
select tests.throws($$insert into public.account_extras (account_id, label, created_by) select id, 'mosogatógép', '00000000-0000-0000-0000-0000000ab001' from pco$$, 'an own extra once per account');
select tests.throws($$insert into public.property_extras (property_id, extra_key, account_extra_id) values ('00000000-0000-0000-0000-0000000ab0e1', 'step_free', '00000000-0000-0000-0000-0000000ab0a1')$$, 'an extra is either from the catalogue or the account''s own');

-- ---------- Contacts and management ----------
insert into public.contacts (id, account_id, name, phone, default_role_key, created_by)
select '00000000-0000-0000-0000-0000000ab0c1', id, 'Varga Péter', '+36 30 555 1234', 'caretaker', '00000000-0000-0000-0000-0000000ab001' from pco;
insert into public.contacts (id, account_id, name, email, created_by)
select '00000000-0000-0000-0000-0000000ab0c2', id, 'Szabó Éva', 'eva@example.com', '00000000-0000-0000-0000-0000000ab001' from pco;
insert into public.contacts (id, account_id, name, created_by)
select '00000000-0000-0000-0000-0000000ab0c3', id, 'Zöld Kert Bt.', '00000000-0000-0000-0000-0000000ab001' from pco;
insert into public.property_contacts (property_id, contact_id, role_key, tenant_visible) values
  ('00000000-0000-0000-0000-0000000ab0e1', '00000000-0000-0000-0000-0000000ab0c1', 'caretaker', true),
  ('00000000-0000-0000-0000-0000000ab0e1', '00000000-0000-0000-0000-0000000ab0c2', 'owner', false);
insert into public.property_contacts (property_id, contact_id, role_label) values ('00000000-0000-0000-0000-0000000ab0e1', '00000000-0000-0000-0000-0000000ab0c1', 'Kulcsos');
select tests.throws($$insert into public.property_contacts (property_id, contact_id, role_key, role_label) values ('00000000-0000-0000-0000-0000000ab0e1', '00000000-0000-0000-0000-0000000ab0c3', 'gardener', 'Kertész')$$, 'a role is from the list or typed, not both');
insert into public.property_management (property_id, owner_kind, owner_contact_id, responsible_user_id, common_charge, note)
values ('00000000-0000-0000-0000-0000000ab0e1', 'other', '00000000-0000-0000-0000-0000000ab0c2', '00000000-0000-0000-0000-0000000ab005', 18500, 'A kapukód a gondnoknál van.');
select tests.throws($$update public.property_management set responsible_user_id = '00000000-0000-0000-0000-0000000ab004' where property_id = '00000000-0000-0000-0000-0000000ab0e1'$$, 'the responsible colleague is a member of the account');
select tests.throws($$update public.property_management set owner_kind = 'self' where property_id = '00000000-0000-0000-0000-0000000ab0e1'$$, 'an owner contact only when the owner is someone else');

-- ---------- Services, identifiers, meters ----------
insert into public.property_services (id, property_id, type_key, provider_id, network_provider_id, settlement_key, reading_required, reading_frequency, reading_due, created_by)
values ('00000000-0000-0000-0000-0000000ab051', '00000000-0000-0000-0000-0000000ab0e1', 'electricity',
        (select id from public.providers where short_name = 'MVM Next'), (select id from public.providers where short_name = 'ELMŰ Hálózati'),
        'tenant_direct', true, 'monthly', 'd5', '00000000-0000-0000-0000-0000000ab001');
insert into public.service_identifiers (service_id, label, value) values ('00000000-0000-0000-0000-0000000ab051', 'Felhasználási hely azonosító', 'HU000130F11-S00000000000000123456');
insert into public.meters (service_id, name, tariff_key, unit_key, serial, registers) values
  ('00000000-0000-0000-0000-0000000ab051', 'Villanyóra', 'standard', 'kwh', '22 345 678', 1),
  ('00000000-0000-0000-0000-0000000ab051', 'Vezérelt óra', 'offpeak', 'kwh', 'VZ 99 1201', 2);
insert into public.property_services (id, property_id, type_key, contact_id, settlement_key, fee_amount, created_by)
values ('00000000-0000-0000-0000-0000000ab052', '00000000-0000-0000-0000-0000000ab0e1', 'gardening', '00000000-0000-0000-0000-0000000ab0c3', 'in_rent', 25000, '00000000-0000-0000-0000-0000000ab001');
select tests.throws($$insert into public.property_services (property_id, type_key, settlement_key, created_by) values ('00000000-0000-0000-0000-0000000ab0e1', 'internet', 'by_usage', '00000000-0000-0000-0000-0000000ab001')$$, '"by usage" only for utilities');
select tests.throws($$insert into public.property_services (property_id, type_key, reading_required, reading_frequency, reading_due, created_by) values ('00000000-0000-0000-0000-0000000ab0e1', 'internet', true, 'monthly', 'd5', '00000000-0000-0000-0000-0000000ab001')$$, 'only utilities are read');
select tests.throws($$insert into public.property_services (property_id, type_key, reading_required, created_by) values ('00000000-0000-0000-0000-0000000ab0e1', 'gas', true, '00000000-0000-0000-0000-0000000ab001')$$, 'reading needs a frequency and a due day');
select tests.throws($$insert into public.meters (service_id, name) values ('00000000-0000-0000-0000-0000000ab052', 'Óra')$$, 'meters only for utilities');
select tests.throws($$insert into public.meters (service_id, name, registers) values ('00000000-0000-0000-0000-0000000ab051', 'Óra', 3)$$, 'a meter has one or two registers');
select tests.throws($$insert into public.property_services (property_id, type_key, provider_id, provider_name, created_by) values ('00000000-0000-0000-0000-0000000ab0e1', 'gas', (select id from public.providers where short_name = 'MVM Next'), 'MVM', '00000000-0000-0000-0000-0000000ab001')$$, 'the provider is from the list or typed, not both');
select tests.throws($$insert into public.property_services (property_id, type_key, custom_label, created_by) values ('00000000-0000-0000-0000-0000000ab0e1', 'gas', 'Gáz 2', '00000000-0000-0000-0000-0000000ab001')$$, 'an own name only for the "other" types');
update public.property_services set paused_from = current_date, paused_until = current_date + 150 where id = '00000000-0000-0000-0000-0000000ab052';
select tests.throws($$update public.property_services set paused_until = current_date - 1 where id = '00000000-0000-0000-0000-0000000ab052'$$, 'a pause ends after it starts');

-- ---------- Listing, links, photos ----------
insert into public.property_listing (property_id, asking_rent, currency, deposit_months, min_term_months, pets, smoking, est_bills, parking_property_id, parking_rent, title)
values ('00000000-0000-0000-0000-0000000ab0e1', 280000, 'HUF', 2, 12, 'on_request', 'no', 22000, '00000000-0000-0000-0000-0000000ab0e2', 35000, 'Napfényes lakás');
select tests.throws($$update public.property_listing set currency = 'USD' where property_id = '00000000-0000-0000-0000-0000000ab0e1'$$, 'rent in HUF or EUR');
select tests.throws($$update public.property_listing set available_now = false where property_id = '00000000-0000-0000-0000-0000000ab0e1'$$, 'not available now needs a date');
insert into public.property_links (property_id, label, url) values ('00000000-0000-0000-0000-0000000ab0e1', 'ingatlan.com', 'https://ingatlan.com/34123456');
select tests.throws($$insert into public.property_links (property_id, label, url) values ('00000000-0000-0000-0000-0000000ab0e1', 'x', 'javascript:alert(1)')$$, 'links are web addresses');
create temp table mp as select (select id from pco)::text || '/00000000-0000-0000-0000-0000000ab0e1/a1.webp' as p;
grant select on mp to authenticated;
insert into storage.objects (bucket_id, name) values ('property-media', (select p from mp));
insert into public.property_media (property_id, path, is_cover, created_by) values ('00000000-0000-0000-0000-0000000ab0e1', (select p from mp), true, '00000000-0000-0000-0000-0000000ab001');
select tests.throws($$insert into public.property_media (property_id, path, created_by) values ('00000000-0000-0000-0000-0000000ab0e2', (select p from mp), '00000000-0000-0000-0000-0000000ab001')$$, 'a photo lives in its own property''s folder');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('property-media', '00000000-0000-0000-0000-0000000ab004/00000000-0000-0000-0000-0000000ab0e1/x.webp')$$, 'no upload into another account''s folder');

-- ---------- Cross-account references ----------
reset role;
insert into public.contacts (id, account_id, name) select '00000000-0000-0000-0000-0000000ab0c9', id, 'Idegen' from oacc;
select tests.act_as('00000000-0000-0000-0000-0000000ab001');
select tests.throws($$insert into public.property_contacts (property_id, contact_id, role_key) values ('00000000-0000-0000-0000-0000000ab0e1', '00000000-0000-0000-0000-0000000ab0c9', 'caretaker')$$, 'a contact of another account cannot be linked');

-- ---------- A lease: the tenant's view ----------
reset role;
insert into public.leases (id, property_id, account_id, tenant_account_id, status, start_date, end_date, monthly_rent, landlord_confirmed_at, tenant_confirmed_at)
select '00000000-0000-0000-0000-0000000ab011', '00000000-0000-0000-0000-0000000ab0e1', (select id from pco), (select id from tacc), 'confirmed', current_date - 10, current_date + 300, 280000, now(), now();

select tests.act_as('00000000-0000-0000-0000-0000000ab003');
select tests.ok((select count(*) = 1 from public.properties where id = '00000000-0000-0000-0000-0000000ab0e1'), 'the tenant sees the home');
select tests.ok((select count(*) = 0 from public.property_management), '… never the landlord''s management data or note');
select tests.ok((select count(*) = 1 from public.property_services), '… sees the utilities only');
select tests.ok((select count(*) = 2 from public.meters), '… with their meters');
select tests.ok((select count(*) = 1 from public.service_identifiers), '… and identifiers');
select tests.ok((select count(*) = 1 from public.property_contacts), '… only the contact links shared with the tenant');
select tests.ok((select count(*) = 1 from public.contacts), '… and only that contact');
select tests.ok((select count(*) = 1 from public.property_outdoor) and (select count(*) = 2 from public.property_extras), '… and the features');
select tests.ok((select count(*) = 1 from public.account_extras), '… including the account''s own extra used there');
select tests.ok((select count(*) = 0 from public.property_listing) and (select count(*) = 0 from public.property_links) and (select count(*) = 0 from public.property_media), '… not the listing or the photos');
update public.properties set area_m2 = 60 where id = '00000000-0000-0000-0000-0000000ab0e1';
select tests.ok((select area_m2 = 54 from public.properties where id = '00000000-0000-0000-0000-0000000ab0e1'), 'the tenant cannot change the property');
select tests.throws($$insert into public.meters (service_id, name) values ('00000000-0000-0000-0000-0000000ab051', 'Hamis óra')$$, '… nor add a meter');

-- ---------- A viewer, a manager, an outsider ----------
select tests.act_as('00000000-0000-0000-0000-0000000ab002');
select tests.ok((select count(*) = 2 from public.property_services) and (select count(*) = 1 from public.property_management), 'a viewer sees everything of the account');
select tests.throws($$insert into public.property_services (property_id, type_key, created_by) values ('00000000-0000-0000-0000-0000000ab0e1', 'gas', '00000000-0000-0000-0000-0000000ab002')$$, '… but adds nothing');
select tests.throws($$insert into public.contacts (account_id, name, created_by) select id, 'X', '00000000-0000-0000-0000-0000000ab002' from pco$$, '… not even a contact');

select tests.act_as('00000000-0000-0000-0000-0000000ab005');
insert into public.property_services (property_id, type_key, provider_name, settlement_key, fee_amount, created_by)
values ('00000000-0000-0000-0000-0000000ab0e1', 'internet', 'Helyi Net Kft.', 'tenant_direct', 9990, '00000000-0000-0000-0000-0000000ab005');
select tests.ok((select count(*) = 3 from public.property_services), 'a manager adds a service with a typed provider name');

select tests.act_as('00000000-0000-0000-0000-0000000ab004');
select tests.ok((select count(*) = 0 from public.properties where account_id = (select id from pco)), 'an outsider sees no property');
select tests.ok((select count(*) = 0 from public.contacts where account_id = (select id from pco)), '… no contact');
select tests.ok((select count(*) = 0 from public.property_services) and (select count(*) = 0 from public.meters), '… no service or meter');
select tests.ok((select count(*) = 0 from storage.objects where bucket_id = 'property-media'), '… no photo');

rollback;
\echo '=== PROPERTY MODULE TESTS PASSED ==='
