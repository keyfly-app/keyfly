-- Property tools: save_service, copy_property, import_properties and undo_import.
-- Run with: scripts/test-db.sh. Self-contained: own users, everything rolled back. Uses the helpers from rls.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000ad001', 'ola@example.com', '{"full_name":"Ola Owner"}'),
  ('00000000-0000-0000-0000-0000000ad002', 'vic@example.com', '{"full_name":"Vic Viewer"}'),
  ('00000000-0000-0000-0000-0000000ad003', 'out@example.com', '{"full_name":"Out Sider"}');

set local role service_role;
create temp table tco as select public.create_company_account('00000000-0000-0000-0000-0000000ad001', 'Ola Ingatlan Kft.', '13579246-2-41', '1139 Budapest, Váci út 3.', 'Ola') as id;
reset role;
grant select on tco to authenticated;
insert into public.account_members (account_id, user_id, role) select id, '00000000-0000-0000-0000-0000000ad002', 'viewer' from tco;
create temp table r (k text primary key, v text);
grant select, insert, update on r to authenticated;

select tests.act_as('00000000-0000-0000-0000-0000000ad001');
insert into r select 'p1', property_id::text from public.create_property((select id from tco), 'flat', '1138', 'Budapest', 'Hajóépítő', 'sétány', '4.',
  p_floor_type => 'ground', p_door => '4.', p_label => 'Duna-parti lakás', p_own_ref => 'B-12');
select public.save_property_features((select v::uuid from r where k = 'p1'), 54, 2::smallint, 1::smallint, 2008::smallint,
  'gas_boiler', 'BB', 'street', false, 'partly', '[{"kind":"balcony","area_m2":6}]', '{air_con}', '{}', '{Mosogatógép}');
insert into public.contacts (id, account_id, name, phone, created_by)
select '00000000-0000-0000-0000-0000000adc01', id, 'Varga Péter', '+36 30 555 1234', '00000000-0000-0000-0000-0000000ad001' from tco;
insert into public.property_contacts (property_id, contact_id, role_key) select v::uuid, '00000000-0000-0000-0000-0000000adc01', 'caretaker' from r where k = 'p1';
insert into public.property_management (property_id, owner_kind, common_charge, note) select v::uuid, 'account', 18500, 'Kapukód a gondnoknál' from r where k = 'p1';

-- ---------- save_service ----------
insert into r select 's1', public.save_service((select v::uuid from r where k = 'p1'), null,
  jsonb_build_object('type_key', 'electricity', 'provider_id', (select id from public.providers where short_name = 'MVM Next'),
    'network_provider_id', (select id from public.providers where short_name = 'ELMŰ Hálózati'), 'settlement_key', 'tenant_direct',
    'reading_required', true, 'reading_frequency', 'monthly', 'reading_due', 'd5'),
  '[{"label":"Felhasználási hely azonosító","value":"HU000130F11"},{"label":"Ügyfélazonosító","value":"3001234567"},{"label":" ","value":"x"}]',
  '[{"name":"Villanyóra","tariff_key":"standard","unit_key":"kwh","serial":"22 345 678"},{"name":"Vezérelt óra","tariff_key":"offpeak","serial":"VZ 99","registers":2}]')::text;
select tests.ok((select count(*) = 2 from public.service_identifiers where service_id = (select v::uuid from r where k = 's1')), 'a service is saved with its identifiers (empty ones left out)');
select tests.ok((select count(*) = 2 from public.meters where service_id = (select v::uuid from r where k = 's1') and archived_at is null), '… and its meters');
insert into r select 'm1', id::text from public.meters where name = 'Villanyóra';
select public.save_service((select v::uuid from r where k = 'p1'), (select v::uuid from r where k = 's1'),
  jsonb_build_object('type_key', 'electricity', 'provider_name', 'Saját kereskedő', 'settlement_key', 'by_usage'),
  '[{"label":"Ügyfélazonosító","value":"3001234567"}]',
  jsonb_build_array(jsonb_build_object('id', (select v from r where k = 'm1'), 'name', 'Villanyóra – előszoba', 'tariff_key', 'standard', 'unit_key', 'kwh')));
select tests.ok((select provider_id is null and provider_name = 'Saját kereskedő' and settlement_key = 'by_usage' and not reading_required
  from public.property_services where id = (select v::uuid from r where k = 's1')), 'editing replaces the service''s values');
select tests.ok((select count(*) = 1 from public.service_identifiers where service_id = (select v::uuid from r where k = 's1')), '… and its identifiers');
select tests.ok((select name = 'Villanyóra – előszoba' and archived_at is null from public.meters where id = (select v::uuid from r where k = 'm1')), 'a kept meter is updated in place');
select tests.ok((select count(*) = 1 from public.meters where service_id = (select v::uuid from r where k = 's1') and archived_at is not null), 'a meter left out is archived, not deleted');
select tests.throws($$select public.save_service((select v::uuid from r where k = 'p1'), null, '{"type_key":"internet","settlement_key":"by_usage"}')$$, 'the settlement must suit the service');
select tests.throws($$select public.save_service((select v::uuid from r where k = 'p1'), null, '{"type_key":"internet"}', '[]', '[{"name":"Óra"}]')$$, 'only utilities have meters');
insert into r select 's2', public.save_service((select v::uuid from r where k = 'p1'), null,
  '{"type_key":"gardening","contact_id":"00000000-0000-0000-0000-0000000adc01","settlement_key":"in_rent","fee_amount":25000}')::text;
update public.property_services set paused_from = '2026-11-01', paused_until = '2027-04-01' where id = (select v::uuid from r where k = 's2');
select tests.ok((select paused_until = '2027-04-01' from public.property_services where id = (select v::uuid from r where k = 's2')), 'a service is paused until a date');

select tests.act_as('00000000-0000-0000-0000-0000000ad002');
select tests.throws($$select public.save_service((select v::uuid from r where k = 'p1'), null, '{"type_key":"internet"}')$$, 'a viewer cannot add a service');
select tests.act_as('00000000-0000-0000-0000-0000000ad003');
select tests.throws($$select public.save_service((select v::uuid from r where k = 'p1'), (select v::uuid from r where k = 's1'), '{"type_key":"gas"}')$$, 'an outsider cannot change one');

-- ---------- copy_property ----------
select tests.act_as('00000000-0000-0000-0000-0000000ad001');
insert into r select 'c1', property_id::text from public.copy_property((select v::uuid from r where k = 'p1'), '1138', 'Budapest', 'Hajóépítő', 'sétány', '4.',
  p_floor_type => 'numbered', p_floor_number => 1::smallint, p_door => '7.', p_own_ref => 'B-14');
select tests.ok((select kind = 'flat' and area_m2 = 54 and heating = 'gas_boiler' and own_ref = 'B-14' and floor_number = 1 and copied_from = (select v::uuid from r where k = 'p1')
  from public.properties where id = (select v::uuid from r where k = 'c1')), 'a copy takes the type and the features, with its own unit and ID');
select tests.ok((select count(*) = 1 from public.property_outdoor where property_id = (select v::uuid from r where k = 'c1'))
  and (select count(*) = 2 from public.property_extras where property_id = (select v::uuid from r where k = 'c1')), '… the outdoor spaces and extras');
select tests.ok((select count(*) = 2 from public.property_services where property_id = (select v::uuid from r where k = 'c1')), '… the services');
select tests.ok((select count(*) = 0 from public.service_identifiers i join public.property_services s on s.id = i.service_id where s.property_id = (select v::uuid from r where k = 'c1'))
  and (select count(*) = 0 from public.meters m join public.property_services s on s.id = m.service_id where s.property_id = (select v::uuid from r where k = 'c1')), '… without identifiers and meters');
select tests.ok((select count(*) = 1 from public.property_contacts where property_id = (select v::uuid from r where k = 'c1')), '… and the contacts');
select tests.ok((select count(*) = 0 from public.property_management where property_id = (select v::uuid from r where k = 'c1')), 'ownership only when asked');
insert into r select 'c2', property_id::text from public.copy_property((select v::uuid from r where k = 'p1'), '1138', 'Budapest', 'Hajóépítő', 'sétány', '4.',
  p_door => '8.', p_features => false, p_services => false, p_contacts => false, p_management => true);
select tests.ok((select area_m2 is null from public.properties where id = (select v::uuid from r where k = 'c2'))
  and (select common_charge = 18500 and note is null from public.property_management where property_id = (select v::uuid from r where k = 'c2')), 'a bare copy keeps only what was chosen; never the internal note');
select tests.throws($$select public.copy_property((select v::uuid from r where k = 'p1'), '1138', 'Budapest', 'X', 'utca', '1.', p_own_ref => 'b-12')$$, 'the own ID stays unique');
select tests.act_as('00000000-0000-0000-0000-0000000ad002');
select tests.throws($$select public.copy_property((select v::uuid from r where k = 'p1'), '1138', 'Budapest', 'X', 'utca', '1.')$$, 'a viewer cannot copy');

-- ---------- import ----------
select tests.act_as('00000000-0000-0000-0000-0000000ad001');
insert into r select 'b1', batch_id::text from public.import_properties((select id from tco), 'ingatlanok.xlsx', jsonb_build_array(
  jsonb_build_object('postal_code', '1134', 'city', 'Budapest', 'street_name', 'Lehel', 'street_type', 'utca', 'house_number', '12.', 'floor_type', 'numbered', 'floor_number', 2, 'door', '3.', 'kind', 'flat', 'own_ref', 'B-08', 'area_m2', 48, 'rooms', 2),
  jsonb_build_object('postal_code', '1139', 'city', 'Budapest', 'street_name', 'Váci', 'street_type', 'út', 'house_number', '81.', 'kind', 'office', 'own_ref', 'I-04', 'area_m2', 120),
  jsonb_build_object('update_id', (select v from r where k = 'p1'), 'parcel_number', '29431/0/A/3', 'area_m2', 55)));
select tests.ok((select rows_total = 3 and rows_imported = 3 from public.import_batches where id = (select v::uuid from r where k = 'b1')), 'an import records its rows');
select tests.ok((select count(*) = 2 from public.properties where import_batch_id = (select v::uuid from r where k = 'b1')), 'new rows become properties of the batch');
select tests.ok((select parcel_number = '29431/0/A/3' and area_m2 = 55 and label = 'Duna-parti lakás' from public.properties where id = (select v::uuid from r where k = 'p1')), 'a duplicate row updates only the values it gives');
select tests.throws($$select public.import_properties((select id from tco), 'x.csv', '[{"postal_code":"1134","city":"Budapest","street_name":"X","street_type":"utca","house_number":"1.","kind":"castle"}]')$$, 'one bad row fails the whole import');
select tests.ok((select count(*) = 1 from public.import_batches where account_id = (select id from tco)), '… and leaves nothing behind');
select tests.throws($$select public.import_properties((select id from tco), 'x.csv', '[]')$$, 'an empty import is refused');

select tests.act_as('00000000-0000-0000-0000-0000000ad002');
select tests.throws($$select public.import_properties((select id from tco), 'x.csv', '[{"postal_code":"1134","city":"Budapest","street_name":"X","street_type":"utca","house_number":"1."}]')$$, 'a viewer cannot import');
select tests.throws($$select public.undo_import((select v::uuid from r where k = 'b1'))$$, '… nor undo one');

select tests.act_as('00000000-0000-0000-0000-0000000ad001');
select public.undo_import((select v::uuid from r where k = 'b1'));
select tests.ok((select count(*) = 0 from public.properties where import_batch_id = (select v::uuid from r where k = 'b1')), 'undo removes the imported properties');
select tests.ok((select parcel_number is null and area_m2 = 54 from public.properties where id = (select v::uuid from r where k = 'p1')), '… and restores what it overwrote');
select tests.throws($$select public.undo_import((select v::uuid from r where k = 'b1'))$$, 'an import is undone once');

reset role;
insert into r select 'b9', id::text from public.import_batches order by created_at desc limit 1;
insert into public.import_batch_changes (batch_id, property_id, before)
select (select v::uuid from r where k = 'b9'), (select v::uuid from r where k = 'p1'), '{}' on conflict do nothing;
update public.import_batches set created_at = now() - interval '3 days' where id = (select v::uuid from r where k = 'b9');
select private.purge_import_changes();
select tests.ok((select count(*) = 0 from public.import_batch_changes where batch_id = (select v::uuid from r where k = 'b9')),
  'the values an import overwrote are purged once it can no longer be undone');
select tests.ok((select count(*) = 1 from public.import_batches where id = (select v::uuid from r where k = 'b9')), '… the import history stays');

rollback;
\echo '=== PROPERTY TOOLS TESTS PASSED ==='
