-- Company accounts: one company = one account, slugs, access requests, team list. Run with: scripts/test-db.sh
-- Self-contained: own users, everything rolled back. Uses the helpers from rls.test.sql.
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000cc01', 'anna@ceg.example', '{"full_name":"Kovács Anna"}'),
  ('00000000-0000-0000-0000-00000000cc02', 'eszter@ceg.example', '{"full_name":"Szabó Eszter"}'),
  ('00000000-0000-0000-0000-00000000cc03', 'idegen@ceg.example', '{"full_name":"Idegen Iván"}');

-- Anna adds her company: the server checks NAV and creates it with its own key.
set local role service_role;
create temp table co as select public.create_company_account('00000000-0000-0000-0000-00000000cc01', 'Duna Lakáskezelő Korlátolt Felelősségű Társaság', '34567812-2-41',
  p_registered_address => '1139 Budapest, Váci út 81.', p_name => 'Duna Lakáskezelő') as id;
select tests.throws($$select public.create_company_account('00000000-0000-0000-0000-00000000cc03', 'Duna Lakáskezelő Kft.', '34567812-1-41')$$, 'one tax number (first 8 digits) = one company account');
reset role;
grant select on co to authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000cc01');
select tests.throws($$select public.create_company_account('00000000-0000-0000-0000-00000000cc01', 'X Kft.', '99999999-2-41')$$, 'users cannot create companies directly');
select tests.ok((select slug from public.accounts where id = (select id from co)) = 'duna-lakaskezelo', 'the company gets a slug from its display name');
select tests.ok((select nav_verified_at is not null and plan = 'basic' from public.accounts where id = (select id from co)), 'a new company starts on Basic, NAV-verified');
select tests.ok((select role from public.account_members where account_id = (select id from co)) = 'owner', 'the creator is the owner');

-- Eszter finds it and asks for access.
select tests.act_as('00000000-0000-0000-0000-00000000cc02');
select tests.ok((select name = 'Duna Lakáskezelő' and not invitation_only and not i_am_member and slug is null and requested_at is null
                 from public.company_lookup('34567812')), 'the lookup shows the company, not its URL');
select tests.ok((select count(*) from public.company_lookup('3456781')) = 0, 'the lookup needs 8 digits');
select tests.ok((select count(*) from public.accounts where id = (select id from co)) = 0, 'a non-member cannot read the account row');
create temp table req as select public.request_company_access((select id from co), 'A pénzügyön dolgozom.') as id;
grant select on req to authenticated;
select tests.ok((select requested_at is not null from public.company_lookup('34567812')), 'the lookup shows the pending request');
select tests.throws($$select public.request_company_access((select id from co))$$, 'one pending request per user and company');
select tests.ok((select count(*) from public.account_access_requests) = 1, 'the requester sees her own request');
select tests.throws($$select public.decide_access_request((select id from req), true)$$, 'the requester cannot approve herself');
select tests.throws($$update public.account_access_requests set status = 'approved'$$, 'requests change only through the functions');

-- A stranger sees nothing of it.
select tests.act_as('00000000-0000-0000-0000-00000000cc03');
select tests.ok((select count(*) from public.account_access_requests) = 0, 'others do not see the request');
select tests.ok((select count(*) from public.account_access_requests_list((select id from co))) = 0, 'others get no request list');
select tests.ok((select count(*) from public.account_members_list((select id from co))) = 0, 'others get no team list');

-- Anna approves as manager.
select tests.act_as('00000000-0000-0000-0000-00000000cc01');
select tests.ok((select full_name = 'Szabó Eszter' and message = 'A pénzügyön dolgozom.' from public.account_access_requests_list((select id from co))), 'the owner sees who asks and why');
select tests.ok((select requester_email = 'eszter@ceg.example' and account_slug = 'duna-lakaskezelo'
                 from public.decide_access_request((select id from req), true, 'manager')), 'approving returns who to notify');
select tests.ok((select role from public.account_members where account_id = (select id from co) and user_id = '00000000-0000-0000-0000-00000000cc02') = 'manager', 'the requester is now a manager');
select tests.throws($$select public.decide_access_request((select id from req), false)$$, 'a decided request is closed');
select tests.ok((select count(*) from public.account_members_list((select id from co))) = 2, 'the team list shows both');

-- Eszter now sees the company and its URL.
select tests.act_as('00000000-0000-0000-0000-00000000cc02');
select tests.ok((select i_am_member and slug = 'duna-lakaskezelo' from public.company_lookup('34567812')), 'a member gets the URL');
select tests.ok((select count(*) from public.account_members_list((select id from co))) = 2, 'members see their team');
select tests.ok((select count(*) from public.account_access_requests_list((select id from co))) = 0, 'a manager does not see access requests');
select tests.throws($$select public.request_company_access((select id from co))$$, 'members do not request again');

-- Enterprise accounts are invitation-only.
reset role;
update public.accounts set plan = 'enterprise' where id = (select id from co);
select tests.act_as('00000000-0000-0000-0000-00000000cc03');
select tests.ok((select invitation_only from public.company_lookup('34567812')), 'the lookup says Enterprise is invitation-only');
select tests.throws($$select public.request_company_access((select id from co))$$, 'no access requests to Enterprise');

-- The retired "manager" view.
select tests.ok(not exists (select 1 from public.profiles where start_view = 'manager'), 'nobody is left on the manager view');

rollback;
\echo '=== COMPANY ACCOUNT TESTS PASSED ==='
