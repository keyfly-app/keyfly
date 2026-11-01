-- Staff sign-in: invitation preview, staff list, two-factor reset. Run with: scripts/test-db.sh
-- Self-contained: own users, everything rolled back. Uses the helpers from rls.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000aa01', 'boss@keyfly.app',  '{"full_name":"Boss Superadmin"}'),
  ('00000000-0000-0000-0000-00000000aa02', 'other@keyfly.app', '{"full_name":"Other Superadmin"}'),
  ('00000000-0000-0000-0000-00000000aa03', 'reka@keyfly.app',  '{"full_name":"Kiss Réka"}'),
  ('00000000-0000-0000-0000-00000000aa04', 'tenant@example.com', '{"full_name":"Not Staff"}');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-00000000aa01', 'superadmin'),
  ('00000000-0000-0000-0000-00000000aa02', 'superadmin'),
  ('00000000-0000-0000-0000-00000000aa03', 'insurance');
insert into auth.mfa_factors (user_id) values
  ('00000000-0000-0000-0000-00000000aa01'), ('00000000-0000-0000-0000-00000000aa02'),
  ('00000000-0000-0000-0000-00000000aa03'), ('00000000-0000-0000-0000-00000000aa04');
insert into auth.sessions (user_id) values ('00000000-0000-0000-0000-00000000aa03'), ('00000000-0000-0000-0000-00000000aa03');

-- Invitation preview: the token holder sees the address before having an account.
select tests.act_as('00000000-0000-0000-0000-00000000aa01', true);
create temp table stok as select public.create_staff_invitation('david@keyfly.app', 'support') as t;
grant select on stok to anon, authenticated;
select tests.act_as(null);
select tests.ok((select email from public.staff_invitation_preview((select t from stok))) = 'david@keyfly.app', 'the invitation link shows its address before sign-up');
select tests.ok((select is_open from public.staff_invitation_preview((select t from stok))), '… and that it is still open');
select tests.ok((select inviter_name from public.staff_invitation_preview((select t from stok))) = 'Boss Superadmin', '… and who sent it');
select tests.ok((select count(*) from public.staff_invitation_preview('not-a-token')) = 0, 'a wrong token reveals nothing');
select tests.throws($$select public.staff_overview()$$, 'anon cannot list staff');
select tests.throws($$select public.reset_staff_mfa('00000000-0000-0000-0000-00000000aa03')$$, 'anon cannot reset 2FA');

-- Staff list: super admin with 2FA only.
select tests.act_as('00000000-0000-0000-0000-00000000aa01');
select tests.throws($$select public.staff_overview()$$, 'a super admin without the second factor cannot list staff');
select tests.act_as('00000000-0000-0000-0000-00000000aa03', true);
select tests.throws($$select public.staff_overview()$$, 'other staff cannot list staff');
select tests.act_as('00000000-0000-0000-0000-00000000aa01', true);
select tests.ok((select count(*) from public.staff_overview() where email like '%@keyfly.app') >= 3, 'a super admin lists staff');
select tests.ok((select has_2fa from public.staff_overview() where user_id = '00000000-0000-0000-0000-00000000aa03'), '… with their 2FA status');

-- Reset: super admin, aal2, someone else, staff only.
select tests.act_as('00000000-0000-0000-0000-00000000aa03', true);
select tests.throws($$select public.reset_staff_mfa('00000000-0000-0000-0000-00000000aa01')$$, 'other staff cannot reset 2FA');
select tests.act_as('00000000-0000-0000-0000-00000000aa01');
select tests.throws($$select public.reset_staff_mfa('00000000-0000-0000-0000-00000000aa03')$$, 'a super admin without the second factor cannot reset 2FA');
select tests.act_as('00000000-0000-0000-0000-00000000aa01', true);
select tests.throws($$select public.reset_staff_mfa('00000000-0000-0000-0000-00000000aa01')$$, 'nobody resets their own 2FA');
select tests.throws($$select public.reset_staff_mfa('00000000-0000-0000-0000-00000000aa04')$$, 'only staff 2FA can be reset here');
select public.reset_staff_mfa('00000000-0000-0000-0000-00000000aa03');
reset role;
select tests.ok((select count(*) from auth.mfa_factors where user_id = '00000000-0000-0000-0000-00000000aa03') = 0, 'the reset removes the authenticator');
select tests.ok((select count(*) from auth.sessions where user_id = '00000000-0000-0000-0000-00000000aa03') = 0, '… and signs them out everywhere');
select tests.ok((select count(*) from auth.mfa_factors where user_id = '00000000-0000-0000-0000-00000000aa01') = 1, '… and touches nobody else');
select tests.ok((select count(*) from audit.events where table_name = 'mfa_factors' and row_key = '00000000-0000-0000-0000-00000000aa03'
                  and actor_id = '00000000-0000-0000-0000-00000000aa01') = 1, 'the reset is in the audit log');
rollback;

select tests.ok(not has_function_privilege('anon', 'public.reset_staff_mfa(uuid)', 'execute'), 'anon has no execute on reset_staff_mfa');
select tests.ok(not has_function_privilege('anon', 'public.staff_overview()', 'execute'), 'anon has no execute on staff_overview');

\echo '=== STAFF 2FA TESTS PASSED ==='
