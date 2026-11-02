-- Bank accounts and the SMS phone check.
-- Run with: scripts/test-db.sh. Self-contained: own users, everything rolled back. Uses the helpers from rls.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000ff001', 'ivett@example.com', '{"full_name":"Ivett Illés"}'),
  ('00000000-0000-0000-0000-0000000ff002', 'janos@example.com', '{"full_name":"János Jakab"}');
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000ff003', 'kata@example.com', null, '{"full_name":"Kata Kiss"}');

set local role service_role;
create temp table fco as select public.create_company_account('00000000-0000-0000-0000-0000000ff001', 'Illés Kft.', '77889900-2-41', '1139 Budapest, Váci út 81.', 'Illés') as id;
reset role;
grant select on fco to authenticated;
insert into public.account_members (account_id, user_id, role) select id, '00000000-0000-0000-0000-0000000ff002', 'manager' from fco;

-- ---------- IBAN check ----------
select tests.ok(private.iban_ok('HU08117730166111110900000000'), 'a valid Hungarian IBAN');
select tests.ok(private.iban_ok('DE89370400440532013000'), 'a valid German IBAN');
select tests.ok(not private.iban_ok('HU08117730166111110900000001'), 'a wrong check digit is caught');
select tests.ok(not private.iban_ok('HU0811773016611111090000'), 'a Hungarian IBAN has 28 characters');

-- ---------- Bank accounts ----------
select tests.act_as('00000000-0000-0000-0000-0000000ff001');
insert into public.bank_accounts (account_id, currency, iban, holder_name, created_by)
  select id, 'HUF', 'HU08117730166111110900000000', 'Illés Kft.', '00000000-0000-0000-0000-0000000ff001' from fco;
select tests.ok((select is_primary from public.bank_accounts where iban = 'HU08117730166111110900000000'), 'the first account in a currency is primary');
insert into public.bank_accounts (account_id, currency, iban, holder_name, is_primary, created_by)
  select id, 'HUF', 'DE89370400440532013000', 'Illés Kft.', true, '00000000-0000-0000-0000-0000000ff001' from fco;
select tests.ok((select count(*) = 1 and bool_and(iban = 'DE89370400440532013000') from public.bank_accounts where is_primary), 'a new primary releases the old one');
select tests.throws($$insert into public.bank_accounts (account_id, currency, iban, holder_name, created_by) select id, 'HUF', 'HU08117730166111110900000001', 'X', '00000000-0000-0000-0000-0000000ff001' from fco$$,
  'an invalid IBAN is refused');
delete from public.bank_accounts where iban = 'DE89370400440532013000';
select tests.ok((select is_primary from public.bank_accounts where iban = 'HU08117730166111110900000000'), 'deleting the primary promotes the next one');

-- A manager sees the accounts but cannot change them.
select tests.act_as('00000000-0000-0000-0000-0000000ff002');
select tests.ok((select count(*) = 1 from public.bank_accounts), 'members see the company''s bank accounts');
update public.bank_accounts set label = 'x';
delete from public.bank_accounts;
select tests.throws($$insert into public.bank_accounts (account_id, currency, iban, holder_name, created_by) select id, 'EUR', 'DE89370400440532013000', 'X', '00000000-0000-0000-0000-0000000ff002' from fco$$,
  'a manager cannot add one');
reset role;
select tests.ok((select count(*) = 1 and bool_and(label is null) from public.bank_accounts), 'a manager cannot change or delete them');

-- Personal account: only the person.
select tests.act_as('00000000-0000-0000-0000-0000000ff002');
insert into public.bank_accounts (account_id, currency, iban, holder_name, created_by)
  select id, 'EUR', 'DE89370400440532013000', 'János Jakab', '00000000-0000-0000-0000-0000000ff002' from public.accounts where personal_user_id = '00000000-0000-0000-0000-0000000ff002';
select tests.act_as('00000000-0000-0000-0000-0000000ff001');
select tests.ok(not exists (select 1 from public.bank_accounts where currency = 'EUR'), 'nobody else sees a personal bank account');

-- ---------- Phone check ----------
select tests.throws($$update public.profiles set phone = '+36301234567' where id = '00000000-0000-0000-0000-0000000ff001'$$, 'the phone is not written directly');
select public.start_phone_check('+36301234567', encode(sha256('123456'::bytea), 'hex'));
select tests.ok(public.confirm_phone_code(encode(sha256('000000'::bytea), 'hex')) = 'wrong', 'a wrong code');
select tests.ok(public.confirm_phone_code(encode(sha256('123456'::bytea), 'hex')) = 'ok', 'the right code');
select tests.ok((select phone = '+36301234567' and phone_verified_at is not null from public.profiles where id = '00000000-0000-0000-0000-0000000ff001'), 'the number is confirmed');
select tests.throws($$select public.confirm_phone_code(encode(sha256('123456'::bytea), 'hex'))$$, 'a code works once');

select public.start_phone_check('+36301234568', encode(sha256('111111'::bytea), 'hex'));
select public.confirm_phone_code(encode(sha256('000000'::bytea), 'hex')) from generate_series(1, 5);
select tests.throws($$select public.confirm_phone_code(encode(sha256('111111'::bytea), 'hex'))$$, 'five wrong tries end the code');
select public.start_phone_check('+36301234569', encode(sha256('222222'::bytea), 'hex'));
select tests.throws($$select public.start_phone_check('+36301234569', encode(sha256('1'::bytea), 'hex'))$$, 'at most three codes an hour');

select public.remove_phone();
select tests.ok((select phone is null and phone_verified_at is null from public.profiles where id = '00000000-0000-0000-0000-0000000ff001'), 'one can remove the number');

select tests.act_as('00000000-0000-0000-0000-0000000ff003');
select tests.throws($$select public.start_phone_check('+36301234567', encode(sha256('1'::bytea), 'hex'))$$, 'only with a confirmed email');
select tests.throws($$select * from public.phone_verifications$$, 'codes are not readable');

rollback;
\echo '=== BANK AND PHONE TESTS PASSED ==='
