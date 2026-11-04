-- save_property_owner: owner kind, an owner from the contacts or a new one, and the owner among the property's contacts.
-- Run with: scripts/test-db.sh. Self-contained: own users, everything rolled back. Uses the helpers from rls.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000ae001', 'olga@example.com', '{"full_name":"Olga Owner"}'),
  ('00000000-0000-0000-0000-0000000ae002', 'vera@example.com', '{"full_name":"Vera Viewer"}'),
  ('00000000-0000-0000-0000-0000000ae003', 'otto@example.com', '{"full_name":"Otto Outsider"}');

set local role service_role;
create temp table tco as select public.create_company_account('00000000-0000-0000-0000-0000000ae001', 'Olga Lakás Kft.', '24681357-2-42', '1139 Budapest, Váci út 5.', 'Olga') as id;
create temp table tco2 as select public.create_company_account('00000000-0000-0000-0000-0000000ae003', 'Otto Kft.', '11223344-2-43', '1051 Budapest, Nádor u. 1.', 'Otto') as id;
reset role;
grant select on tco, tco2 to authenticated;
insert into public.account_members (account_id, user_id, role) select id, '00000000-0000-0000-0000-0000000ae002', 'viewer' from tco;
create temp table r (k text primary key, v text);
grant select, insert, update on r to authenticated;

select tests.act_as('00000000-0000-0000-0000-0000000ae001');
insert into r select 'p1', property_id::text from public.create_property((select id from tco), 'flat', '1138', 'Budapest', 'Hajóépítő', 'sétány', '6.');
insert into public.contacts (id, account_id, name, created_by)
select '00000000-0000-0000-0000-0000000aec01', id, 'Kiss Anna', '00000000-0000-0000-0000-0000000ae001' from tco;

select public.save_property_owner((select v::uuid from r where k = 'p1'), 'self');
select tests.ok((select owner_kind = 'self' and owner_contact_id is null from public.property_management where property_id = (select v::uuid from r where k = 'p1')),
  'the first save creates the management row');

insert into r select 'c1', public.save_property_owner((select v::uuid from r where k = 'p1'), 'other', null,
  '{"name":" Teszt Tulajdonos ","phone":"+36 1 555 0101","email":"Tulaj@Example.com"}')::text;
select tests.ok((select name = 'Teszt Tulajdonos' and email = 'tulaj@example.com' and default_role_key = 'owner'
  from public.contacts where id = (select v::uuid from r where k = 'c1')), 'a new owner joins the account''s contacts');
select tests.ok((select owner_kind = 'other' and owner_contact_id = (select v::uuid from r where k = 'c1')
  from public.property_management where property_id = (select v::uuid from r where k = 'p1')), '… becomes the owner (the row is updated in place)');
select tests.ok((select count(*) = 1 from public.property_contacts where property_id = (select v::uuid from r where k = 'p1')
  and contact_id = (select v::uuid from r where k = 'c1') and role_key = 'owner'), '… and shows among the property''s contacts');

select public.save_property_owner((select v::uuid from r where k = 'p1'), 'other', '00000000-0000-0000-0000-0000000aec01');
select tests.ok((select owner_contact_id = '00000000-0000-0000-0000-0000000aec01' from public.property_management
  where property_id = (select v::uuid from r where k = 'p1')), 'an owner can be picked from the contacts');
select tests.ok((select count(*) = 0 from public.property_contacts where property_id = (select v::uuid from r where k = 'p1')
  and contact_id = (select v::uuid from r where k = 'c1')), 'the previous owner leaves the property''s contacts');
select tests.ok((select archived_at is null from public.contacts where id = (select v::uuid from r where k = 'c1')), '… but stays in the account''s list');

select public.save_property_owner((select v::uuid from r where k = 'p1'), 'other', '00000000-0000-0000-0000-0000000aec01');
select tests.ok((select count(*) = 1 from public.property_contacts where property_id = (select v::uuid from r where k = 'p1')
  and role_key = 'owner'), 'saving the same owner again adds no second link');

select public.save_property_owner((select v::uuid from r where k = 'p1'), 'account');
select tests.ok((select owner_kind = 'account' and owner_contact_id is null from public.property_management
  where property_id = (select v::uuid from r where k = 'p1')), 'back to the company as owner');
select tests.ok((select count(*) = 0 from public.property_contacts where property_id = (select v::uuid from r where k = 'p1') and role_key = 'owner'),
  '… and no owner contact is left on the property');

select tests.throws($$select public.save_property_owner((select v::uuid from r where k = 'p1'), 'other')$$, 'someone else needs a contact');
select tests.throws($$select public.save_property_owner((select v::uuid from r where k = 'p1'), 'nobody')$$, 'only known owner kinds');
select tests.act_as('00000000-0000-0000-0000-0000000ae003');
insert into public.contacts (id, account_id, name, created_by)
select '00000000-0000-0000-0000-0000000aec02', id, 'Idegen Kft.', '00000000-0000-0000-0000-0000000ae003' from tco2;
select tests.act_as('00000000-0000-0000-0000-0000000ae001');
select tests.throws($$select public.save_property_owner((select v::uuid from r where k = 'p1'), 'other', '00000000-0000-0000-0000-0000000aec02')$$,
  'a contact of another account cannot be the owner');

-- copy_property: the owner link follows "Tulajdon és kezelés"
select public.save_property_owner((select v::uuid from r where k = 'p1'), 'other', '00000000-0000-0000-0000-0000000aec01');
insert into public.contacts (id, account_id, name, created_by)
select '00000000-0000-0000-0000-0000000aec03', id, 'Gondnok Géza', '00000000-0000-0000-0000-0000000ae001' from tco;
insert into public.property_contacts (property_id, contact_id, role_key) select v::uuid, '00000000-0000-0000-0000-0000000aec03', 'caretaker' from r where k = 'p1';
insert into r select 'cp1', property_id::text from public.copy_property((select v::uuid from r where k = 'p1'), '1138', 'Budapest', 'Hajóépítő', 'sétány', '6.',
  p_door => '7.', p_contacts => true, p_management => false);
select tests.ok((select count(*) = 1 and bool_and(role_key = 'caretaker') from public.property_contacts where property_id = (select v::uuid from r where k = 'cp1')),
  'a copy without ownership takes the contacts but not the owner');
insert into r select 'cp2', property_id::text from public.copy_property((select v::uuid from r where k = 'p1'), '1138', 'Budapest', 'Hajóépítő', 'sétány', '6.',
  p_door => '8.', p_contacts => false, p_management => true);
select tests.ok((select owner_contact_id = '00000000-0000-0000-0000-0000000aec01' from public.property_management where property_id = (select v::uuid from r where k = 'cp2'))
  and (select count(*) = 1 from public.property_contacts where property_id = (select v::uuid from r where k = 'cp2') and role_key = 'owner'),
  'a copy with ownership brings the owner, also among the contacts');

select tests.act_as('00000000-0000-0000-0000-0000000ae002');
select tests.throws($$select public.save_property_owner((select v::uuid from r where k = 'p1'), 'self')$$, 'a viewer cannot change the owner');
select tests.throws($$select public.save_property_owner((select v::uuid from r where k = 'p1'), 'other', null, '{"name":"Új"}')$$,
  '… nor add an owner contact');
select tests.act_as('00000000-0000-0000-0000-0000000ae003');
select tests.throws($$select public.save_property_owner((select v::uuid from r where k = 'p1'), 'self')$$, 'an outsider cannot either');
select tests.act_as('00000000-0000-0000-0000-0000000ae001');
select tests.ok((select count(*) = 3 from public.contacts where account_id = (select id from tco)), 'refused saves leave no stray contact');

reset role;
rollback;
\echo '=== PROPERTY OWNER TESTS PASSED ==='
