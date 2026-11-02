-- Company details and personal addresses (settings hub round).
-- Run with: scripts/test-db.sh. Self-contained: own users, everything rolled back. Uses the helpers from rls.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000ee001', 'flora@example.com', '{"full_name":"Flóra Fehér"}'),
  ('00000000-0000-0000-0000-0000000ee002', 'gergo@example.com', '{"full_name":"Gergő Gál"}');

set local role service_role;
create temp table eco as select public.create_company_account('00000000-0000-0000-0000-0000000ee001', 'Fehér Kft.', '66778899-2-41', '1139 Budapest, Váci út 81.', 'Fehér') as id;
reset role;
grant select on eco to authenticated;
insert into public.account_members (account_id, user_id, role) select id, '00000000-0000-0000-0000-0000000ee002', 'manager' from eco;

-- ---------- Company ----------
select tests.ok((select office_address = '{"postal_code":"1139","city":"Budapest","street":"Váci út 81."}' from public.accounts where id = (select id from eco)),
  'the NAV address is split into the registered office');

select tests.act_as('00000000-0000-0000-0000-0000000ee001');
update public.accounts set tax_number = '66778899-1-42', eu_vat_number = 'HU66778899', company_reg_number = '01-09-123456',
  office_address = '{"postal_code":"1052","city":"Budapest","street":"Deák Ferenc tér 3."}',
  mailing_address = '{"postal_code":"1385","city":"Budapest","street":"Pf. 862"}',
  contact_email = 'iroda@feher.hu', contact_phone = '+36 1 234 5678'
where id = (select id from eco);
select tests.ok((select registered_address = '1052 Budapest, Deák Ferenc tér 3.' and tax_number = '66778899-1-42' from public.accounts where id = (select id from eco)),
  'the holder changes the details; the one-line address follows');
select tests.throws($$update public.accounts set tax_number = '11223344-2-41' where id = (select id from eco)$$, 'the first eight digits of the tax number stay');
select tests.throws($$update public.accounts set office_address = '{"postal_code":"113","city":"Budapest","street":"Váci út 81."}' where id = (select id from eco)$$, 'a Hungarian postal code has four digits');
select tests.throws($$update public.accounts set office_address = '{"postal_code":"1139","city":"Budapest","street":"Váci út 81.","x":1}' where id = (select id from eco)$$, 'no unknown address keys');
select tests.throws($$update public.accounts set eu_vat_number = 'HU123' where id = (select id from eco)$$, 'EU VAT number format');
select tests.throws($$update public.accounts set registered_address = 'anything' where id = (select id from eco)$$, 'the one-line address is not written directly');

select tests.act_as('00000000-0000-0000-0000-0000000ee002');
update public.accounts set contact_phone = '+36 30 000 0000' where id = (select id from eco);
reset role;
select tests.ok((select contact_phone = '+36 1 234 5678' from public.accounts where id = (select id from eco)), 'a manager cannot change the company details');

-- ---------- People ----------
select tests.act_as('00000000-0000-0000-0000-0000000ee001');
update public.profiles set home_address = '{"country":"HU","postal_code":"1137","city":"Budapest","street":"Pozsonyi út 12.","unit":"3. em. 8."}',
  mailing_address = '{"country":"AT","postal_code":"A-1010","city":"Wien","street":"Graben 1"}'
where id = '00000000-0000-0000-0000-0000000ee001';
select tests.ok((select home_address->>'city' = 'Budapest' and mailing_address->>'country' = 'AT' from public.profiles where id = '00000000-0000-0000-0000-0000000ee001'),
  'one can add a home and a mailing address, abroad too');
select tests.throws($$update public.profiles set home_address = '{"postal_code":"1137","city":"Budapest","street":"Pozsonyi út 12."}' where id = '00000000-0000-0000-0000-0000000ee001'$$,
  'a personal address names its country');
select tests.act_as('00000000-0000-0000-0000-0000000ee002');
update public.profiles set home_address = '{"country":"HU","postal_code":"1011","city":"Budapest","street":"Fő utca 1."}' where id = '00000000-0000-0000-0000-0000000ee001';
reset role;
select tests.ok((select home_address->>'postal_code' = '1137' from public.profiles where id = '00000000-0000-0000-0000-0000000ee001'), 'nobody changes another person''s address');

-- ---------- Trusted devices ----------
select tests.act_as('00000000-0000-0000-0000-0000000ee001');
select tests.throws($$select public.trust_device(repeat('a', 64), 'Chrome · macOS')$$, 'marking a device needs the code just entered');
select tests.act_as('00000000-0000-0000-0000-0000000ee001', true);
select public.trust_device(repeat('a', 64), 'Chrome · macOS');
select tests.act_as('00000000-0000-0000-0000-0000000ee001');
select tests.ok(public.trusted_device_ok(repeat('a', 64)), 'a marked browser skips the code');
select tests.ok(not public.trusted_device_ok(repeat('b', 64)), 'another browser does not');
select tests.throws($$select token_hash from public.trusted_devices$$, 'the token hash is not readable');
select tests.ok((select count(*) = 1 from public.trusted_devices), 'one sees their own devices');
select tests.act_as('00000000-0000-0000-0000-0000000ee002');
select tests.ok(not public.trusted_device_ok(repeat('a', 64)), 'a token works only for its owner');
select tests.ok((select count(*) = 0 from public.trusted_devices), 'others see none');
delete from public.trusted_devices;
select tests.act_as('00000000-0000-0000-0000-0000000ee001');
select tests.ok((select count(*) = 1 from public.trusted_devices), 'others cannot remove them');
delete from public.trusted_devices;
select tests.ok(not public.trusted_device_ok(repeat('a', 64)), 'a removed device asks for the code again');

-- ---------- Cégeim: own pending requests ----------
reset role;
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000ee003', 'hedi@example.com', '{"full_name":"Hédi Horváth"}');
select tests.act_as('00000000-0000-0000-0000-0000000ee003');
select public.request_company_access((select id from eco), null);
select tests.ok((select name = 'Fehér' from public.my_access_requests()), 'one sees the company one asked to join');
select public.cancel_access_request((select id from public.my_access_requests()));
select tests.ok(not exists (select 1 from public.my_access_requests()), 'a withdrawn request is gone');
select tests.act_as('00000000-0000-0000-0000-0000000ee002');
select tests.ok(not exists (select 1 from public.my_access_requests()), 'others'' requests stay hidden');

-- ---------- Deleting one's account: lease records block it ----------
select tests.act_as('00000000-0000-0000-0000-0000000ee002');
select tests.ok(not exists (select 1 from public.account_deletion_blockers() where kind = 'records'), 'no records, no block');
reset role;
insert into public.properties (account_id, postal_code, city, street_name, street_type, house_number)
  select id, '1061', 'Budapest', 'Király', 'utca', '12.' from public.accounts where personal_user_id = '00000000-0000-0000-0000-0000000ee002';
select tests.act_as('00000000-0000-0000-0000-0000000ee002');
select tests.ok(exists (select 1 from public.account_deletion_blockers() where kind = 'records'), 'a property of one''s own account blocks self-service deletion');

rollback;
\echo '=== COMPANY PROFILE TESTS PASSED ==='
