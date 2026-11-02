-- Personal settings: two-step backup codes, email preferences, what blocks deleting one's account.
-- Run with: scripts/test-db.sh. Self-contained: own users, everything rolled back. Uses the helpers from rls.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000dd001', 'dora@example.com', '{"full_name":"Dóra Deák"}'),
  ('00000000-0000-0000-0000-0000000dd002', 'ede@example.com', '{"full_name":"Ede Erdős"}');

-- ---------- Backup codes ----------
select tests.act_as('00000000-0000-0000-0000-0000000dd001');
select tests.throws($$select public.set_recovery_codes(array_fill(repeat('a', 64), array[10]))$$, 'backup codes need the second factor');
select tests.act_as('00000000-0000-0000-0000-0000000dd001', true);
select tests.throws($$select public.set_recovery_codes(array_fill(repeat('a', 64), array[3]))$$, 'exactly ten codes');
select public.set_recovery_codes(array(select encode(sha256(('code-' || i)::bytea), 'hex') from generate_series(1, 10) i));
select tests.ok(public.recovery_codes_left() = 10, 'ten codes are stored');
select tests.throws($$select * from public.mfa_recovery_codes$$, 'the codes table is not readable');

-- Signing in with a code happens before the second factor.
select tests.act_as('00000000-0000-0000-0000-0000000dd001');
select tests.ok(public.consume_recovery_code(encode(sha256('code-3'::bytea), 'hex')), 'a backup code works');
select tests.ok(not public.consume_recovery_code(encode(sha256('code-3'::bytea), 'hex')), '… only once');
select tests.ok(not public.consume_recovery_code(encode(sha256('wrong'::bytea), 'hex')), 'a wrong code does not');
select tests.ok(public.recovery_codes_left() = 9, 'nine left');

-- Another person cannot use Dóra's codes.
select tests.act_as('00000000-0000-0000-0000-0000000dd002');
select tests.ok(not public.consume_recovery_code(encode(sha256('code-4'::bytea), 'hex')), 'codes belong to one person');
select tests.ok(public.recovery_codes_left() = 0, 'others see no codes');

-- Guessing stops after ten misses in an hour.
select tests.act_as('00000000-0000-0000-0000-0000000dd001');
select public.consume_recovery_code(encode(sha256(('guess-' || i)::bytea), 'hex')) from generate_series(1, 8) i; -- with the two misses above: ten
select tests.throws($$select public.consume_recovery_code(encode(sha256('code-5'::bytea), 'hex'))$$, 'ten misses lock backup codes for an hour');

select tests.throws($$select public.delete_recovery_codes()$$, 'turning two-step off needs the second factor');
select tests.act_as('00000000-0000-0000-0000-0000000dd001', true);
select public.delete_recovery_codes();
select tests.ok(public.recovery_codes_left() = 0, 'turning two-step off removes the codes');

-- ---------- Email preferences ----------
update public.profiles set email_prefs = '{"lease_changes": false}' where id = '00000000-0000-0000-0000-0000000dd001';
select tests.ok((select email_prefs->>'lease_changes' from public.profiles where id = '00000000-0000-0000-0000-0000000dd001') = 'false', 'one can change their email preferences');
select tests.throws($$update public.profiles set email_prefs = '[]' where id = '00000000-0000-0000-0000-0000000dd001'$$, 'preferences are an object');
update public.profiles set email_prefs = '{"lease_changes": true}' where id = '00000000-0000-0000-0000-0000000dd002';
reset role;
select tests.ok((select email_prefs = '{}' from public.profiles where id = '00000000-0000-0000-0000-0000000dd002'), 'nobody changes another person''s preferences');

-- ---------- Deleting one's account ----------
set local role service_role;
create temp table dco as select public.create_company_account('00000000-0000-0000-0000-0000000dd001', 'Deák Kft.', '55667788-2-41', p_name => 'Deák') as id;
reset role;
select tests.act_as('00000000-0000-0000-0000-0000000dd001');
select tests.ok(not exists (select 1 from public.account_deletion_blockers()), 'a company only Dóra works in does not block');
reset role;
insert into public.account_members (account_id, user_id, role) select id, '00000000-0000-0000-0000-0000000dd002', 'manager' from dco;
select tests.act_as('00000000-0000-0000-0000-0000000dd001');
select tests.ok((select kind = 'holder' and name = 'Deák' from public.account_deletion_blockers()), 'the account holder of a team must hand over first');

-- What the server does on delete: companies with nobody else go first, then the sign-in (profile cascades).
reset role;
delete from public.account_members where user_id = '00000000-0000-0000-0000-0000000dd002';
delete from public.accounts where id = (select id from dco);
delete from auth.users where id = '00000000-0000-0000-0000-0000000dd001';
select tests.ok(not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000dd001'), 'the profile goes with the sign-in');
select tests.ok(not exists (select 1 from public.accounts where personal_user_id = '00000000-0000-0000-0000-0000000dd001'), '… and the personal account');

rollback;
\echo '=== PERSONAL SETTINGS TESTS PASSED ==='
