-- Profile settings: photo path, the profile following the sign-in, active sessions. Run with: scripts/test-db.sh
-- Self-contained: own users, everything rolled back. Uses the helpers from rls.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;
insert into auth.users (id, email, encrypted_password, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000bb01', 'anna@example.com', 'hash-1', '{"full_name":"Kovács Anna"}'),
  ('00000000-0000-0000-0000-00000000bb02', 'peter@example.com', 'hash-2', '{"full_name":"Szabó Péter"}');
insert into auth.sessions (id, user_id, user_agent, ip) values
  ('00000000-0000-0000-0000-0000000055a1', '00000000-0000-0000-0000-00000000bb01', 'Mozilla/5.0 (Macintosh) Chrome/130', '192.0.2.10'),
  ('00000000-0000-0000-0000-0000000055a2', '00000000-0000-0000-0000-00000000bb01', 'Mozilla/5.0 (iPhone) Safari/18', '192.0.2.11'),
  ('00000000-0000-0000-0000-0000000055b1', '00000000-0000-0000-0000-00000000bb02', 'Mozilla/5.0 (Windows) Edge/130', '192.0.2.12');

-- Anna, signed in on session a1.
create or replace function pg_temp.as_anna() returns void language sql as $$
  select tests.act_as('00000000-0000-0000-0000-00000000bb01');
  select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000bb01', 'aal', 'aal1', 'session_id', '00000000-0000-0000-0000-0000000055a1')::text, true);
$$;

-- Profile photo: only a file in her own folder.
select pg_temp.as_anna();
update public.profiles set avatar_path = '00000000-0000-0000-0000-00000000bb01/Xy3kQ9pL2mN4.webp' where id = '00000000-0000-0000-0000-00000000bb01';
select tests.ok((select avatar_path from public.profiles where id = '00000000-0000-0000-0000-00000000bb01') like '%.webp', 'a user sets a photo in her own folder');
select tests.throws($$update public.profiles set avatar_path = '00000000-0000-0000-0000-00000000bb02/Xy3kQ9pL2mN4.webp' where id = '00000000-0000-0000-0000-00000000bb01'$$, 'a photo path in someone else''s folder is refused');
select tests.throws($$update public.profiles set avatar_path = '00000000-0000-0000-0000-00000000bb01/Xy3kQ9pL2mN4.png' where id = '00000000-0000-0000-0000-00000000bb01'$$, 'only WebP or JPEG photos');
select tests.throws($$update public.profiles set avatar_path = '00000000-0000-0000-0000-00000000bb01/../x.webp' where id = '00000000-0000-0000-0000-00000000bb01'$$, 'a crafted photo path is refused');
select tests.throws($$update public.profiles set password_changed_at = now() where id = '00000000-0000-0000-0000-00000000bb01'$$, 'the password date is not writable via the API');
select tests.throws($$update public.profiles set phone = '+36 30 123 4567' where id = '00000000-0000-0000-0000-00000000bb01'$$, 'the phone is set only through the SMS check (bank_phone.test.sql)');

-- Storage: own folder only.
select tests.throws($$insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000bb02/a1b2c3d4e5f6.webp')$$, 'a photo cannot be uploaded into another user''s folder');
insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000bb01/a1b2c3d4e5f6.webp');
select tests.ok((select count(*) from storage.objects where bucket_id = 'avatars') = 1, '… into her own it can');

-- The profile follows the sign-in (as Supabase Auth, i.e. the table owner).
select tests.act_as(null);
reset role;
update auth.users set email = 'anna.new@example.com' where id = '00000000-0000-0000-0000-00000000bb01';
select tests.ok((select email from public.profiles where id = '00000000-0000-0000-0000-00000000bb01') = 'anna.new@example.com', 'a confirmed email change reaches the profile');
update auth.users set encrypted_password = 'hash-1b' where id = '00000000-0000-0000-0000-00000000bb01';
select tests.ok((select password_changed_at from public.profiles where id = '00000000-0000-0000-0000-00000000bb01') is not null, 'a password change is dated');
select tests.ok((select password_changed_at from public.profiles where id = '00000000-0000-0000-0000-00000000bb02') is null, '… only for that user');

-- Sessions.
select tests.act_as(null);
select tests.throws($$select * from public.my_sessions()$$, 'anon cannot list sessions');
select pg_temp.as_anna();
select tests.ok((select count(*) from public.my_sessions()) = 2, 'a user lists only her own sessions');
select tests.ok((select is_current from public.my_sessions() where id = '00000000-0000-0000-0000-0000000055a1'), '… and sees which one she is using');
select tests.throws($$select public.end_my_session('00000000-0000-0000-0000-0000000055a1')$$, 'the current session cannot be ended here');
select tests.ok(not public.end_my_session('00000000-0000-0000-0000-0000000055b1'), 'someone else''s session cannot be ended');
reset role;
select tests.ok((select count(*) from auth.sessions where id = '00000000-0000-0000-0000-0000000055b1') = 1, '… it is still there');
select pg_temp.as_anna();
select tests.ok(public.end_my_session('00000000-0000-0000-0000-0000000055a2'), 'another session of hers can be ended');
select tests.ok((select count(*) from public.my_sessions()) = 1, '… and is gone from the list');

select tests.act_as(null);
reset role;
select tests.ok(not has_function_privilege('anon', 'public.my_sessions()', 'execute'), 'anon has no execute on my_sessions');
select tests.ok(not has_function_privilege('anon', 'public.end_my_session(uuid)', 'execute'), 'anon has no execute on end_my_session');
\echo '=== PROFILE SETTINGS TESTS PASSED ==='
rollback;
