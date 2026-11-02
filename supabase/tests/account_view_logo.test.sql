-- View per account and the company logo (v2.5).
-- Run with: scripts/test-db.sh. Self-contained: own users, everything rolled back. Uses the helpers from rls.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000ff001', 'hanna@example.com', '{"full_name":"Hanna Hegedűs"}'),
  ('00000000-0000-0000-0000-0000000ff002', 'imre@example.com', '{"full_name":"Imre Illés"}'),
  ('00000000-0000-0000-0000-0000000ff003', 'jozsef@example.com', '{"full_name":"József Juhász"}');

set local role service_role;
create temp table vco as select public.create_company_account('00000000-0000-0000-0000-0000000ff001', 'Hegedűs Kft.', '55667788-2-41', '1139 Budapest, Váci út 81.', 'Hegedűs') as id;
reset role;
grant select on vco to authenticated;
insert into public.account_members (account_id, user_id, role) select id, '00000000-0000-0000-0000-0000000ff002', 'manager' from vco;

-- ---------- View ----------
select tests.act_as('00000000-0000-0000-0000-0000000ff002');
select public.set_account_view((select id from vco), 'tenant');
select tests.ok((select view = 'tenant' from public.account_members where account_id = (select id from vco) and user_id = '00000000-0000-0000-0000-0000000ff002'),
  'a member picks their own View');
select tests.ok((select view is null from public.account_members where account_id = (select id from vco) and user_id = '00000000-0000-0000-0000-0000000ff001'),
  '… the holder''s View stays');
select tests.throws($$select public.set_account_view((select id from vco), 'manager')$$, 'only tenant or landlord');
select tests.throws($$update public.account_members set view = 'tenant' where account_id = (select id from vco)$$, 'the column is changed only through the function');

select tests.act_as('00000000-0000-0000-0000-0000000ff003');
select tests.throws($$select public.set_account_view((select id from vco), 'tenant')$$, 'an outsider has no View there');

-- ---------- Logo ----------
reset role;
create temp table lpath as select (select id from vco)::text || '/a1b2c3d4e5f6.webp' as p;
grant select on lpath to authenticated;

select tests.act_as('00000000-0000-0000-0000-0000000ff002');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('company-logos', (select p from lpath))$$, 'a manager cannot upload the logo');

select tests.act_as('00000000-0000-0000-0000-0000000ff001');
insert into storage.objects (bucket_id, name) values ('company-logos', (select p from lpath));
update public.accounts set logo_path = (select p from lpath) where id = (select id from vco);
select tests.ok((select logo_path is not null from public.accounts where id = (select id from vco)), 'the holder uploads and sets the logo');
select tests.throws($$update public.accounts set logo_path = '00000000-0000-0000-0000-0000000ff001/a1b2c3d4e5f6.webp' where id = (select id from vco)$$,
  'the logo stays in the company''s own folder');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('company-logos', 'not-a-uuid/a1b2c3d4e5f6.webp')$$, 'a folder that is no account is refused');

select tests.act_as('00000000-0000-0000-0000-0000000ff002');
select tests.ok((select count(*) = 1 from storage.objects where bucket_id = 'company-logos'), 'every member sees the logo');
update public.accounts set logo_path = null where id = (select id from vco);
select tests.ok((select logo_path is not null from public.accounts where id = (select id from vco)), '… but cannot remove it');

select tests.act_as('00000000-0000-0000-0000-0000000ff003');
select tests.ok((select count(*) = 0 from storage.objects where bucket_id = 'company-logos'), 'outsiders do not see it');

reset role;
select tests.throws($$update public.accounts set logo_path = (select personal_user_id::text from public.accounts where kind = 'person' limit 1) || '/a1b2c3d4e5f6.webp'
  where kind = 'person'$$, 'personal accounts have no logo');

rollback;
\echo '=== ACCOUNT VIEW AND LOGO TESTS PASSED ==='
