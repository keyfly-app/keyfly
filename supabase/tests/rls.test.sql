-- Access-control tests. Run with: scripts/test-db.sh
-- Each block runs as one role (anon / a given user) and fails loudly if that role
-- can see or do something it must not.
\set ON_ERROR_STOP on
set client_min_messages = notice;

create schema if not exists tests;

create or replace function tests.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAIL: %', label; end if;
  raise notice 'ok  %', label;
end $$;

create or replace function tests.throws(stmt text, label text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'ok  % (%)', label, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % – did not raise', label;
end $$;

create or replace function tests.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  perform set_config('role', case when uid is null then 'anon' else 'authenticated' end, true);
end $$;

grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

-- ---------- Fixtures (as postgres, RLS bypassed) ----------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'anna@example.com',  '{"full_name":"Anna Kovács"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'bela@example.com',  '{"full_name":"Béla Nagy","locale":"en"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'peter@example.com', '{"full_name":"Péter Szabó"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'agent@example.com', '{"full_name":"Agency Agent"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'admin@example.com', '{"full_name":"Superadmin"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'help@example.com',  '{"full_name":"Support"}');

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'superadmin'),
  ('00000000-0000-0000-0000-0000000000d2', 'support');

insert into public.organizations (id, name, type) values
  ('00000000-0000-0000-0000-00000000f001', 'Example Agency', 'agency');
insert into public.organization_members (org_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000c1', 'agent');

insert into public.properties (id, owner_user_id, address_line) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000b1', 'Example street 12. 3/2');

insert into public.applications (id, tenant_id, property_id, referred_by_org_id, status, monthly_rent, deposit_months) values
  ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000f001', 'submitted', 350000, 3),
  ('00000000-0000-0000-0000-00000000a002', '00000000-0000-0000-0000-0000000000a2', null, null, 'submitted', 280000, 2),
  ('00000000-0000-0000-0000-00000000a003', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000e001', null, 'accepted', 350000, 3);

insert into public.policies (id, application_id, tenant_id, property_id, status, coverage_amount, premium_amount) values
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000a003', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000e001', 'active', 1050000, 5250);

-- ---------- Basics ------------------------------------------------------------

select tests.ok((select count(*) from public.profiles) = 6, 'sign-up creates a profile');
select tests.ok((select full_name from public.profiles where email = 'anna@example.com') = 'Anna Kovács', 'name is copied from sign-up metadata');
select tests.ok((select locale from public.profiles where email = 'bela@example.com') = 'en', 'locale is copied from sign-up metadata');
select tests.ok((select deposit_amount from public.applications where id = '00000000-0000-0000-0000-00000000a001') = 1050000, 'deposit = rent × months');
select tests.ok((select policy_number from public.policies limit 1) ~ '^KF-\d{4}-\d{6}$', 'policy number format KF-YYYY-000000');
select tests.ok((select count(*) from public.audit_log where entity = 'applications') >= 3, 'quote requests are audited');

-- ---------- Visitor (anon) ----------------------------------------------------

begin;
select tests.act_as(null);
select tests.throws('select * from public.applications', 'anon cannot read quote requests');
select tests.throws('select * from public.profiles', 'anon cannot read profiles');
insert into public.waitlist (email, segment, locale, privacy_notice_version, source) values ('new@example.com', 'tenant', 'hu', '2026-10-31', 'coming-soon');
select tests.ok(true, 'anon can join the waitlist');
insert into public.waitlist (email, segment, locale, privacy_notice_version, marketing_consent, marketing_consent_version) values ('news@example.com', 'landlord', 'en', '2026-10-31', true, 'newsletter-2026-10-31');
select tests.ok(true, 'anon can join with newsletter consent');
select tests.throws($$insert into public.waitlist (email, segment, privacy_notice_version, marketing_consent) values ('x@example.com', 'tenant', 'v1', true)$$, 'newsletter consent requires the consent text version');
select tests.throws('select * from public.waitlist', 'anon cannot read the waitlist');
select tests.throws($$insert into public.waitlist (email, segment, privacy_notice_version) values ('NEW@example.com', 'tenant', 'v1')$$, 'same email cannot join the same segment twice');
select tests.throws($$insert into public.waitlist (email, privacy_notice_version) values ('not-an-email', 'v1')$$, 'invalid email is rejected');
select tests.throws($$insert into public.waitlist (email, segment, privacy_notice_version, email_provider_contact_id) values ('y@example.com', 'tenant', 'v1', 'abc')$$, 'anon cannot set server-only columns');
rollback;

-- ---------- Tenant (Anna) -----------------------------------------------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.ok((select count(*) from public.applications) = 2, 'tenant sees only her 2 requests');
select tests.ok((select count(*) from public.profiles) = 1, 'tenant sees only her profile');
select tests.ok((select count(*) from public.policies) = 1, 'tenant sees her policy');
select tests.ok((select count(*) from public.properties) = 0, 'tenant cannot see the landlord property table');
select tests.ok((select count(*) from public.staff) = 0, 'tenant cannot see staff');
select tests.ok((select count(*) from public.audit_log) = 0, 'tenant cannot see the audit log');
update public.applications set monthly_rent = 360000 where id = '00000000-0000-0000-0000-00000000a001';
select tests.ok((select monthly_rent from public.applications where id = '00000000-0000-0000-0000-00000000a001') = 360000, 'tenant can edit a submitted request');
select tests.throws($$update public.applications set quoted_premium_monthly = 1 where id = '00000000-0000-0000-0000-00000000a001'$$, 'tenant cannot change the premium');
select tests.throws($$update public.applications set status = 'approved' where id = '00000000-0000-0000-0000-00000000a001'$$, 'tenant cannot approve herself');
select tests.throws($$insert into public.applications (tenant_id, monthly_rent) values ('00000000-0000-0000-0000-0000000000a2', 100000)$$, 'tenant cannot create a request for someone else');
select tests.throws($$insert into public.applications (tenant_id, monthly_rent, quoted_rate_pct) values ('00000000-0000-0000-0000-0000000000a1', 100000, 1)$$, 'tenant cannot set her own rate');
insert into public.applications (tenant_id, monthly_rent) values ('00000000-0000-0000-0000-0000000000a1', 300000);
select tests.ok(true, 'tenant can create her own request');
select tests.throws($$update public.profiles set email = 'x@y.hu' where id = '00000000-0000-0000-0000-0000000000a1'$$, 'tenant cannot change her login email');
update public.profiles set phone = '+36301234567', locale = 'en' where id = '00000000-0000-0000-0000-0000000000a1';
select tests.ok(true, 'tenant can change phone and language');
select tests.throws($$insert into public.claims (policy_id, submitted_by, reason, amount_claimed) values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1', 'x', 1000)$$, 'tenant cannot file a claim');
select tests.throws($$insert into public.verifications (application_id, method, status) values ('00000000-0000-0000-0000-00000000a001', 'manual', 'passed')$$, 'tenant cannot verify herself');
select tests.throws($$insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000000a1', 'superadmin')$$, 'tenant cannot make herself admin');
insert into storage.objects (bucket_id, name) values ('documents', '00000000-0000-0000-0000-0000000000a1/certificate.pdf');
select tests.ok(true, 'tenant can upload to her own folder');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('documents', '00000000-0000-0000-0000-0000000000a2/x.pdf')$$, 'tenant cannot upload to another folder');
rollback;

-- ---------- Another tenant (Béla) -----------------------------------------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
select tests.ok((select count(*) from public.applications) = 1, 'Béla sees only his request');
select tests.ok((select count(*) from public.policies) = 0, 'Béla cannot see Anna''s policy');
select tests.ok((select count(*) from public.claims) = 0, 'Béla sees no claims');
rollback;

-- ---------- Landlord (Péter) -----------------------------------------------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select tests.ok((select count(*) from public.applications) = 0, 'landlord cannot see tenant income data');
select tests.ok((select count(*) from public.properties) = 1, 'landlord sees his property');
select tests.ok((select count(*) from public.policies) = 1, 'landlord sees the policy on his property');
select tests.throws($$insert into public.claims (policy_id, submitted_by, reason, amount_claimed, amount_paid) values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'x', 1000, 1000)$$, 'landlord cannot set the paid amount');
insert into public.claims (policy_id, submitted_by, reason, amount_claimed) values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'Unpaid rent', 350000);
select tests.ok((select count(*) from public.claims) = 1, 'landlord can file and see a claim');
update public.claims set status = 'paid';
select tests.ok((select status from public.claims limit 1) = 'submitted', 'landlord cannot mark a claim as paid');
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.ok((select count(*) from public.claims) = 1, 'tenant sees the claim against her');
rollback;

-- ---------- Agency agent -----------------------------------------------------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000c1');
select tests.ok((select count(*) from public.applications) = 1, 'agency sees only the request it referred');
select tests.ok((select count(*) from public.organizations) = 1, 'agency sees its own organisation');
select tests.throws($$insert into public.organization_members (org_id, user_id, role) values ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a2', 'admin')$$, 'plain agent cannot add members');
rollback;

-- ---------- Staff ------------------------------------------------------------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000d2');
select tests.ok((select count(*) from public.applications) = 3, 'support staff sees everything');
select tests.ok((select count(*) from public.waitlist) >= 0, 'staff can read the waitlist');
select tests.throws($$insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000000a2', 'admin')$$, 'support cannot add staff');
rollback;

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000d1');
update public.applications
  set status = 'approved', quoted_rate_pct = 6, quoted_premium_monthly = 5250, quoted_premium_yearly = 63000,
      max_coverage = 1200000, offer_expires_at = now() + interval '7 days', decided_at = now()
  where id = '00000000-0000-0000-0000-00000000a001';
select tests.ok((select status from public.applications where id = '00000000-0000-0000-0000-00000000a001') = 'approved', 'superadmin can issue an offer');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000000c1', 'ops');
select tests.ok(true, 'superadmin can add staff');
select tests.ok((select count(*) from public.audit_log where entity = 'applications') >= 4, 'status changes are audited');
rollback;

-- ---------- Default privileges revoked -------------------------------------------

select tests.ok(not has_table_privilege('anon', 'public.applications', 'select'), 'anon has no select on applications');
select tests.ok(not has_table_privilege('anon', 'public.audit_log', 'insert'), 'anon cannot write the audit log');
select tests.ok(not has_column_privilege('authenticated', 'public.profiles', 'email', 'update'), 'login email is not updatable via the API');

\echo '=== ALL ACCESS-CONTROL TESTS PASSED ==='
