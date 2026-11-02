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

-- ---------- Audit log: no full account number, no holder name ----------
reset role;
select tests.ok(not exists (select 1 from audit.events where table_name = 'bank_accounts' and (changes::text like '%HU08117730%' or changes ? 'holder_name')),
  'the audit log keeps neither the full account number nor the holder');
select tests.ok(exists (select 1 from audit.events where table_name = 'bank_accounts' and changes ->> 'iban' = '…0000'), '… only its last four characters');

-- ---------- Phone check (Twilio Verify checks the code; the server confirms) ----------
select tests.act_as('00000000-0000-0000-0000-0000000ff001');
select tests.throws($$update public.profiles set phone = '+36301234567' where id = '00000000-0000-0000-0000-0000000ff001'$$, 'the phone is not written directly');
select public.start_phone_check('+36301234567');
select tests.ok(public.pending_phone() = '+36301234567', 'the number waiting for its code');
select tests.throws($$select public.set_confirmed_phone('00000000-0000-0000-0000-0000000ff001', '+36301234567')$$, 'a person cannot confirm the number');
reset role;
set local role service_role;
select tests.ok(not public.set_confirmed_phone('00000000-0000-0000-0000-0000000ff001', '+36309999999'), 'only the number the code went to');
select tests.ok(public.set_confirmed_phone('00000000-0000-0000-0000-0000000ff001', '+36301234567'), 'the server confirms it');
select tests.ok(not public.set_confirmed_phone('00000000-0000-0000-0000-0000000ff001', '+36301234567'), '… once');
reset role;
select tests.ok((select phone = '+36301234567' and phone_verified_at is not null from public.profiles where id = '00000000-0000-0000-0000-0000000ff001'), 'the number is confirmed');

select tests.act_as('00000000-0000-0000-0000-0000000ff001');
select public.start_phone_check('+36301234568');
select public.start_phone_check('+36301234569');
select tests.throws($$select public.start_phone_check('+36301234569')$$, 'at most three codes an hour');

select public.remove_phone();
select tests.ok((select phone is null and phone_verified_at is null from public.profiles where id = '00000000-0000-0000-0000-0000000ff001'), 'one can remove the number');
select tests.ok(public.pending_phone() is null, '… and the pending check goes too');

select tests.act_as('00000000-0000-0000-0000-0000000ff003');
select tests.throws($$select public.start_phone_check('+36301234567')$$, 'only with a confirmed email');
select tests.throws($$select * from public.phone_verifications$$, 'pending numbers are not readable');

rollback;
\echo '=== BANK AND PHONE TESTS PASSED ==='
