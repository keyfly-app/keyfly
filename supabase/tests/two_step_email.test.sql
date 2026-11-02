-- Two-step code by email, and the email sign-in method for Google sign-ups.
-- Run with: scripts/test-db.sh. Self-contained: own users, everything rolled back. Uses the helpers from rls.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;
insert into auth.users (id, email, raw_user_meta_data, encrypted_password) values
  ('00000000-0000-0000-0000-0000000ee001', 'lili@example.com', '{"full_name":"Lili Lakatos"}', null),
  ('00000000-0000-0000-0000-0000000ee002', 'mate@example.com', '{"full_name":"Máté Molnár"}', 'hash');
insert into auth.mfa_factors (user_id) values ('00000000-0000-0000-0000-0000000ee001');
insert into auth.sessions (id, user_id) values ('00000000-0000-0000-0000-00000005e001', '00000000-0000-0000-0000-0000000ee001');

create or replace function pg_temp.as_session(uid uuid, sid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'aal', 'aal1', 'session_id', sid)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- ---------- Sending ----------
select pg_temp.as_session('00000000-0000-0000-0000-0000000ee001', '00000000-0000-0000-0000-00000005e001');
select public.start_two_step_email(repeat('a', 64));
select tests.throws($$select public.start_two_step_email(repeat('b', 64))$$, 'a new code only after 60 seconds');
select tests.throws($$select * from public.two_step_email_codes$$, 'the codes cannot be read');

select tests.act_as('00000000-0000-0000-0000-0000000ee002');
select tests.throws($$select public.start_two_step_email(repeat('a', 64))$$, 'no code without two-step verification');

-- ---------- Checking ----------
select pg_temp.as_session('00000000-0000-0000-0000-0000000ee001', '00000000-0000-0000-0000-00000005e001');
select tests.ok(not public.two_step_pass_ok(), 'no pass before the code');
select tests.ok(public.confirm_two_step_email(repeat('c', 64)) = 'wrong', 'a wrong code');
select tests.ok(public.confirm_two_step_email(repeat('a', 64)) = 'ok', 'the right code');
select tests.ok(public.two_step_pass_ok(), 'this session passes the gate');
select tests.ok(public.confirm_two_step_email(repeat('a', 64)) = 'expired', 'a code works once');

reset role;
delete from public.two_step_email_sends;
select pg_temp.as_session('00000000-0000-0000-0000-0000000ee001', '00000000-0000-0000-0000-00000005e001');
select public.start_two_step_email(repeat('d', 64));
select public.confirm_two_step_email(repeat('c', 64)) from generate_series(1, 4);
select tests.ok(public.confirm_two_step_email(repeat('c', 64)) = 'expired', 'five wrong tries end the code');
select tests.ok(public.confirm_two_step_email(repeat('d', 64)) = 'expired', '… even the right code is refused then');

-- Another session of the same person does not pass.
reset role;
insert into auth.sessions (id, user_id) values ('00000000-0000-0000-0000-00000005e002', '00000000-0000-0000-0000-0000000ee001');
select pg_temp.as_session('00000000-0000-0000-0000-0000000ee001', '00000000-0000-0000-0000-00000005e002');
select tests.ok(not public.two_step_pass_ok(), 'the pass belongs to one session');

-- Ending the session ends the pass.
reset role;
delete from auth.sessions where id = '00000000-0000-0000-0000-00000005e001';
select tests.ok(not exists (select 1 from public.two_step_passes), 'signing out removes the pass');

-- Turning the email option off.
select pg_temp.as_session('00000000-0000-0000-0000-0000000ee001', '00000000-0000-0000-0000-00000005e002');
select public.set_two_step_email(false);
reset role;
delete from public.two_step_email_sends;
select pg_temp.as_session('00000000-0000-0000-0000-0000000ee001', '00000000-0000-0000-0000-00000005e002');
select tests.throws($$select public.start_two_step_email(repeat('e', 64))$$, 'no code by email when it is turned off');

-- ---------- Email sign-in method ----------
reset role;
select tests.throws($$set local role authenticated; select public.add_email_identity('00000000-0000-0000-0000-0000000ee002')$$, 'only the server adds sign-in methods');
reset role;
set local role service_role;
select tests.ok(not public.add_email_identity('00000000-0000-0000-0000-0000000ee001'), 'not without a password');
select tests.ok(public.add_email_identity('00000000-0000-0000-0000-0000000ee002'), 'with a password it is added');
select tests.ok(public.add_email_identity('00000000-0000-0000-0000-0000000ee002'), '… once');
reset role;
select tests.ok((select count(*) = 1 from auth.identities where user_id = '00000000-0000-0000-0000-0000000ee002' and provider = 'email'), 'one email identity');

rollback;
\echo '=== TWO-STEP EMAIL TESTS PASSED ==='
