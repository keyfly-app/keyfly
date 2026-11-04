-- Property screens: create_property, archive_property, save_property_features and the per-type field list.
-- Run with: scripts/test-db.sh. Self-contained: own users, everything rolled back. Uses the helpers from rls.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000ac001', 'pia@example.com',  '{"full_name":"Pia Owner"}'),
  ('00000000-0000-0000-0000-0000000ac002', 'vik@example.com',  '{"full_name":"Vik Viewer"}'),
  ('00000000-0000-0000-0000-0000000ac003', 'mia@example.com',  '{"full_name":"Mia Manager"}'),
  ('00000000-0000-0000-0000-0000000ac004', 'oto@example.com',  '{"full_name":"Oto Outsider"}');

set local role service_role;
create temp table uco as select public.create_company_account('00000000-0000-0000-0000-0000000ac001', 'Pia Ingatlan Kft.', '24681357-2-43', '1139 Budapest, Váci út 2.', 'Pia') as id;
reset role;
grant select on uco to authenticated;
update public.accounts set plan = 'enterprise' where id = (select id from uco); -- selected properties per member
insert into public.account_members (account_id, user_id, role) select id, '00000000-0000-0000-0000-0000000ac002', 'viewer' from uco;
insert into public.account_members (account_id, user_id, role, property_scope) select id, '00000000-0000-0000-0000-0000000ac003', 'manager', 'selected' from uco;
create temp table r (k text primary key, v text);
grant select, insert, update on r to authenticated;

-- ---------- Catalogue: the fields a type asks for ----------
select tests.ok((select meta -> 'fields' ? 'rooms' from public.catalog_items where list = 'property_type' and key = 'flat'), 'a flat asks for rooms');
select tests.ok((select jsonb_array_length(meta -> 'fields') = 0 from public.catalog_items where list = 'property_type' and key = 'parking'), 'a parking space asks for no extra fields');
select tests.ok((select bool_and(meta ? 'fields') from public.catalog_items where list = 'property_type'), 'every type says what it asks for');

-- ---------- create_property ----------
select tests.act_as('00000000-0000-0000-0000-0000000ac001');
insert into r select 'p1', public_code from public.create_property((select id from uco), 'flat', '1138', 'Budapest', 'Hajóépítő', 'sétány', '4.',
  p_staircase => 'C', p_floor_type => 'ground', p_door => '4', p_label => '  Duna-parti lakás ', p_own_ref => 'B-12');
select tests.ok((select v ~ '^KF-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$' from r where k = 'p1'), 'the owner adds a property and gets its Keyfly ID');
select tests.ok((select label = 'Duna-parti lakás' and own_ref = 'B-12' and staircase = 'C' and building is null and created_by = '00000000-0000-0000-0000-0000000ac001'
  from public.properties where public_code = (select v from r where k = 'p1')), '… trimmed, empty parts left out, created by them');
select tests.throws($$select public.create_property((select id from uco), 'flat', '1138', 'Budapest', 'X', 'utca', '1.', p_own_ref => 'b-12')$$, 'the own ID stays unique');
select tests.throws($$select public.create_property((select id from uco), 'castle', '1138', 'Budapest', 'X', 'utca', '1.')$$, 'the type comes from the catalogue');
insert into r select 'p2', public_code from public.create_property((select id from uco), 'flat', '1138', 'Budapest', 'X', 'utca', '1.', p_other_kind_label => 'Műterem');
select tests.ok((select other_kind_label is null from public.properties where public_code = (select v from r where k = 'p2')), 'an own type name is kept only for "other"');
insert into r select 'p3', public_code from public.create_property((select id from uco), 'other', '1138', 'Budapest', 'X', 'utca', '2.', p_other_kind_label => 'Műterem');
select tests.ok((select other_kind_label = 'Műterem' from public.properties where public_code = (select v from r where k = 'p3')), '… where it is the name of the type');

select tests.act_as('00000000-0000-0000-0000-0000000ac002');
select tests.throws($$select public.create_property((select id from uco), 'flat', '1138', 'Budapest', 'X', 'utca', '3.')$$, 'a viewer cannot add a property');
select tests.act_as('00000000-0000-0000-0000-0000000ac004');
select tests.throws($$select public.create_property((select id from uco), 'flat', '1138', 'Budapest', 'X', 'utca', '3.')$$, 'an outsider cannot add to the account');

select tests.act_as('00000000-0000-0000-0000-0000000ac003');
select tests.ok((select count(*) = 0 from public.properties), 'a manager with selected properties sees none at first');
insert into r select 'm1', public_code from public.create_property((select id from uco), 'office', '1139', 'Budapest', 'Váci', 'út', '81.');
select tests.ok((select count(*) = 1 from public.properties), '… and keeps seeing the one they add');

-- ---------- save_property_features ----------
select tests.act_as('00000000-0000-0000-0000-0000000ac001');
insert into r select 'p1id', id::text from public.properties where public_code = (select v from r where k = 'p1');
select public.save_property_features((select v::uuid from r where k = 'p1id'), 54, 2::smallint, 1::smallint, 2008::smallint,
  'gas_boiler', 'BB', 'street', false, 'partly',
  '[{"kind":"balcony","area_m2":6},{"kind":"garden","area_m2":null}]', '{air_con,fitted_kitchen}', '{}', '{Mosogatógép," mosogatógép ",Szauna}');
select tests.ok((select area_m2 = 54 and rooms = 2 and half_rooms = 1 and heating = 'gas_boiler' and lift = false
  from public.properties where id = (select v::uuid from r where k = 'p1id')), 'features are saved');
select tests.ok((select count(*) = 2 from public.property_outdoor where property_id = (select v::uuid from r where k = 'p1id')), '… with the outdoor spaces');
select tests.ok((select count(*) = 2 from public.account_extras where account_id = (select id from uco)), 'typed extras join the account once each (any case)');
select tests.ok((select count(*) = 4 from public.property_extras where property_id = (select v::uuid from r where k = 'p1id')), '… and the property has catalogue and own extras');

select public.save_property_features((select v::uuid from r where k = 'p1id'), 55, 2::smallint, null, 2008::smallint,
  'gas_boiler', null, null, null, null, '[]', '{air_con}',
  array[(select id from public.account_extras where label = 'Szauna')], '{}');
select tests.ok((select area_m2 = 55 and half_rooms is null and energy_rating is null from public.properties where id = (select v::uuid from r where k = 'p1id')), 'saving again replaces the values');
select tests.ok((select count(*) = 0 from public.property_outdoor where property_id = (select v::uuid from r where k = 'p1id')), '… and the outdoor spaces');
select tests.ok((select count(*) = 2 from public.property_extras where property_id = (select v::uuid from r where k = 'p1id')), '… and the extras');
select tests.ok((select count(*) = 2 from public.account_extras where account_id = (select id from uco)), 'own extras stay with the account for its other properties');
select tests.throws($$select public.save_property_features((select v::uuid from r where k = 'p1id'), 55, null, null, null, 'fireplace', null, null, null, null)$$, 'feature values come from the catalogue');
select tests.throws($$select public.save_property_features((select v::uuid from r where k = 'p1id'), 55, null, null, null, null, null, null, null, null, '[{"kind":"roof"}]')$$, 'outdoor kinds come from the catalogue');

select tests.act_as('00000000-0000-0000-0000-0000000ac002');
select tests.throws($$select public.save_property_features((select v::uuid from r where k = 'p1id'), 1, null, null, null, null, null, null, null, null)$$, 'a viewer cannot change the features');
select tests.act_as('00000000-0000-0000-0000-0000000ac003');
select tests.throws($$select public.save_property_features((select v::uuid from r where k = 'p1id'), 1, null, null, null, null, null, null, null, null)$$, 'a manager cannot change a property outside their selection');

-- ---------- archive_property ----------
select tests.act_as('00000000-0000-0000-0000-0000000ac002');
select tests.throws($$select public.archive_property((select v::uuid from r where k = 'p1id'))$$, 'a viewer cannot archive');
select tests.act_as('00000000-0000-0000-0000-0000000ac001');
insert into public.leases (property_id, account_id, status, start_date, monthly_rent, created_by)
select v::uuid, (select id from uco), 'draft', '2026-12-01', 280000, '00000000-0000-0000-0000-0000000ac001' from r where k = 'p1id';
select tests.throws($$select public.archive_property((select v::uuid from r where k = 'p1id'))$$, 'a property with a lease in progress stays');
reset role;
delete from public.leases where property_id = (select v::uuid from r where k = 'p1id');
select tests.act_as('00000000-0000-0000-0000-0000000ac001');
select public.archive_property((select v::uuid from r where k = 'p1id'));
select tests.ok((select archived_at is not null from public.properties where id = (select v::uuid from r where k = 'p1id')), 'otherwise it is archived');
insert into r select 'p4', public_code from public.create_property((select id from uco), 'flat', '1138', 'Budapest', 'Y', 'utca', '1.', p_own_ref => 'B-12');
select tests.ok((select count(*) = 1 from r where k = 'p4'), 'an archived property''s own ID can be used again');

rollback;
\echo '=== PROPERTY UI TESTS PASSED ==='
