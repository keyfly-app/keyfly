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

-- mfa = true signs in with a second factor (aal2), which staff rights require.
create or replace function tests.act_as(uid uuid, mfa boolean default false) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  perform set_config('request.jwt.claims',
    case when uid is null then '' else json_build_object('sub', uid, 'aal', case when mfa then 'aal2' else 'aal1' end)::text end, true);
  perform set_config('role', case when uid is null then 'anon' else 'authenticated' end, true);
end $$;

grant usage on schema tests to anon, authenticated, service_role;
grant execute on all functions in schema tests to anon, authenticated, service_role;

-- ---------- Fixtures (as postgres, RLS bypassed) ----------------------------
-- Users: a1 Anna (tenant), a2 Béla (Anna's co-tenant), b1 Péter (private landlord),
-- c1 Duna owner (company, referral partner), e1 Duna admin, e2 Duna manager (one property),
-- e3 Duna viewer, f1 Olga (occupant), f2 Nándor (past tenant), g1 Gábor (no relation),
-- d1 superadmin, d2 support, h1 future staff member.

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'anna@example.com',    '{"full_name":"Anna Kovács","consents":{"terms":"terms-1","privacy":"privacy-1","marketing":"x"}}'),
  ('00000000-0000-0000-0000-0000000000a2', 'bela@example.com',    '{"full_name":"Béla Nagy","locale":"en"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'peter@example.com',   '{"full_name":"Péter Szabó"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'duna@example.com',    '{"full_name":"Duna Owner"}'),
  ('00000000-0000-0000-0000-0000000000e1', 'eszter@example.com',  '{"full_name":"Eszter Admin"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'kristof@example.com', '{"full_name":"Kristóf Manager"}'),
  ('00000000-0000-0000-0000-0000000000e3', 'lili@example.com',    '{"full_name":"Lili Viewer"}'),
  ('00000000-0000-0000-0000-0000000000f1', 'olga@example.com',    '{"full_name":"Olga Occupant"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'nandor@example.com',  '{"full_name":"Nándor Past"}'),
  ('00000000-0000-0000-0000-0000000000f3', 'gabor@example.com',   '{}'),
  ('00000000-0000-0000-0000-0000000000d1', 'admin@keyfly.app',    '{"full_name":"Superadmin"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'help@keyfly.app',     '{"full_name":"Support"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'new@keyfly.app',      '{"full_name":"New Staff"}');

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'superadmin'),
  ('00000000-0000-0000-0000-0000000000d2', 'support');

create temp table fx (name text primary key, id uuid);
grant select on fx to anon, authenticated;
insert into fx select 'acc_' || split_part(p.email, '@', 1), a.id
from public.accounts a join public.profiles p on p.id = a.personal_user_id;

insert into public.accounts (id, kind, name, legal_name, tax_number, plan, is_referral_partner) values
  ('00000000-0000-0000-0000-00000000c0c0', 'company', 'Duna Ingatlankezelő', 'Duna Ingatlankezelő Kft.', '12345678-2-42', 'enterprise', true);
insert into public.account_members (account_id, user_id, role, property_scope) values
  ('00000000-0000-0000-0000-00000000c0c0', '00000000-0000-0000-0000-0000000000c1', 'owner', 'all'),
  ('00000000-0000-0000-0000-00000000c0c0', '00000000-0000-0000-0000-0000000000e1', 'admin', 'all'),
  ('00000000-0000-0000-0000-00000000c0c0', '00000000-0000-0000-0000-0000000000e2', 'manager', 'selected'),
  ('00000000-0000-0000-0000-00000000c0c0', '00000000-0000-0000-0000-0000000000e3', 'viewer', 'all');

insert into public.properties (id, account_id, postal_code, city, street_name, street_type, house_number, floor_type, floor_number, door, parcel_number) values
  ('00000000-0000-0000-0000-00000000e001', (select id from fx where name = 'acc_peter'), '1061', 'Budapest', 'Király', 'utca', '12.', 'numbered', 3, '8.', '29431/0/A/3'),
  ('00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000c0c0', '1061', 'Budapest', 'Andrássy', 'út', '5.', 'numbered', 2, '4.', null),
  ('00000000-0000-0000-0000-00000000e003', '00000000-0000-0000-0000-00000000c0c0', '1133', 'Budapest', 'Váci', 'út', '18.', 'ground', null, '1.', null);
insert into public.account_member_properties (account_id, user_id, property_id) values
  ('00000000-0000-0000-0000-00000000c0c0', '00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000e002');

-- L0 closed (Nándor, past), L1 active (Anna + co-tenant Béla + occupant Olga), L2 closing (Anna at Duna), L3 draft (Duna).
insert into public.leases (id, property_id, account_id, tenant_account_id, status, start_date, end_date, monthly_rent,
                           landlord_confirmed_at, tenant_confirmed_at, closed_at) values
  ('00000000-0000-0000-0000-0000000001a0', '00000000-0000-0000-0000-00000000e001', (select id from fx where name = 'acc_peter'),
   (select id from fx where name = 'acc_nandor'), 'closed', current_date - 800, current_date - 31, 250000, now(), now(), now()),
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-00000000e001', (select id from fx where name = 'acc_peter'),
   (select id from fx where name = 'acc_anna'), 'confirmed', current_date - 30, current_date + 300, 280000, now(), now(), null),
  ('00000000-0000-0000-0000-0000000001a2', '00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000c0c0',
   (select id from fx where name = 'acc_anna'), 'confirmed', current_date - 400, current_date - 10, 320000, now(), now(), null),
  ('00000000-0000-0000-0000-0000000001a3', '00000000-0000-0000-0000-00000000e003', '00000000-0000-0000-0000-00000000c0c0',
   null, 'draft', current_date + 30, null, 300000, null, null, null);
select private.snapshot_lease_parties('00000000-0000-0000-0000-0000000001a1');
select private.snapshot_lease_parties('00000000-0000-0000-0000-0000000001a0');
insert into public.lease_occupants (lease_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000a2', 'co_tenant'),
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000f1', 'occupant');

insert into public.applications (id, tenant_id, property_id, referred_by_account_id, status, monthly_rent, deposit_months) values
  ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000c0c0', 'submitted', 350000, 3),
  ('00000000-0000-0000-0000-00000000a002', '00000000-0000-0000-0000-0000000000a2', null, null, 'submitted', 280000, 2),
  ('00000000-0000-0000-0000-00000000a003', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000e001', null, 'accepted', 350000, 3);

insert into public.policies (id, application_id, tenant_id, property_id, lease_id, status, coverage_amount, premium_amount) values
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000a003', '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000001a1', 'active', 1050000, 5250);

-- ---------- Basics ------------------------------------------------------------

select tests.ok((select count(*) from public.profiles) = 13, 'sign-up creates a profile');
select tests.ok((select count(*) from public.accounts where kind = 'person') = 13, 'sign-up creates a personal account');
select tests.ok((select count(*) from public.account_members m join public.accounts a on a.id = m.account_id
                 where a.kind = 'person' and m.role = 'owner' and m.user_id = a.personal_user_id) = 13, 'the person owns their personal account');
select tests.ok((select name from public.accounts where id = (select id from fx where name = 'acc_gabor')) = 'gabor', 'nameless sign-up: account named after the email');
select tests.ok((select full_name from public.profiles where email = 'anna@example.com') = 'Anna Kovács', 'name is copied from sign-up metadata');
select tests.ok((select locale from public.profiles where email = 'bela@example.com') = 'en', 'locale is copied from sign-up metadata');
select tests.ok((select string_agg(kind || '=' || version, ',' order by kind) from public.consents
                 where user_id = '00000000-0000-0000-0000-0000000000a1') = 'privacy=privacy-1,terms=terms-1', 'sign-up records the terms and privacy consents');
select tests.ok((select count(*) from public.consents where user_id <> '00000000-0000-0000-0000-0000000000a1') = 0, 'no consents without a ticked box');
select tests.ok((select deposit_amount from public.applications where id = '00000000-0000-0000-0000-00000000a001') = 1050000, 'deposit = rent × months');
select tests.ok((select policy_number from public.policies limit 1) ~ '^KF-\d{4}-\d{6}$', 'policy number format KF-YYYY-000000');
select tests.ok((select district from public.properties where id = '00000000-0000-0000-0000-00000000e001') = 6, 'Budapest district comes from the postcode');
select tests.ok((select public.lease_phase(l) from public.leases l where id = '00000000-0000-0000-0000-0000000001a1') = 'active', 'phase: active');
select tests.ok((select public.lease_phase(l) from public.leases l where id = '00000000-0000-0000-0000-0000000001a2') = 'closing', 'phase: closing after the end date');
select tests.ok((select public.lease_phase(l) from public.leases l where id = '00000000-0000-0000-0000-0000000001a0') = 'closed', 'phase: closed');
select tests.ok((select count(*) from public.lease_parties where lease_id = '00000000-0000-0000-0000-0000000001a1') = 2, 'both parties are recorded on confirmation');
select tests.ok((select count(*) from audit.events where table_name = 'applications') >= 3, 'quote requests are audited');

select tests.throws($$insert into public.properties (account_id, postal_code, city, street_name, street_type, house_number) values ((select id from fx where name = 'acc_peter'), '106', 'Budapest', 'X', 'utca', '1.')$$, 'Hungarian postcode has 4 digits');
select tests.throws($$insert into public.properties (account_id, postal_code, city, street_name, street_type, house_number, floor_type) values ((select id from fx where name = 'acc_peter'), '1061', 'Budapest', 'X', 'utca', '1.', 'numbered')$$, 'a numbered floor needs its number');
select tests.throws($$insert into public.properties (account_id, postal_code, city, street_name, street_type, house_number, parcel_number) values ((select id from fx where name = 'acc_peter'), '1061', 'Budapest', 'X', 'utca', '1.', 'hrsz 12')$$, 'land registry number format');
select tests.throws($$insert into public.leases (property_id, account_id, tenant_account_id, status, start_date, end_date, monthly_rent, landlord_confirmed_at, tenant_confirmed_at) values ('00000000-0000-0000-0000-00000000e001', (select id from fx where name = 'acc_peter'), (select id from fx where name = 'acc_bela'), 'confirmed', current_date, current_date + 10, 1, now(), now())$$, 'no two leases on one property at the same time');
select tests.throws($$insert into public.leases (property_id, account_id, start_date, monthly_rent) values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000c0c0', current_date, 1)$$, 'a lease belongs to the property''s account');
select tests.throws($$insert into public.account_members (account_id, user_id, role) values ((select id from fx where name = 'acc_peter'), '00000000-0000-0000-0000-0000000000a1', 'viewer')$$, 'a personal account has a single member');
select tests.throws($$delete from audit.events$$, 'the audit log is append-only');

begin;
set constraints all immediate;
select tests.throws($$delete from public.account_members where account_id = '00000000-0000-0000-0000-00000000c0c0' and role = 'owner'$$, 'the last owner cannot leave');
rollback;

-- ---------- Visitor (anon) ----------------------------------------------------

begin;
select tests.act_as(null);
select tests.throws('select * from public.applications', 'anon cannot read quote requests');
select tests.throws('select * from public.profiles', 'anon cannot read profiles');
select tests.throws('select * from public.accounts', 'anon cannot read accounts');
select tests.throws('select * from public.leases', 'anon cannot read leases');
select tests.throws($$select public.create_company_account('00000000-0000-0000-0000-0000000000a1', 'X Kft.', '12345678-1-41')$$, 'anon cannot create accounts');
insert into public.waitlist (email, segment, locale, privacy_notice_version, source) values ('new@example.com', 'tenant', 'hu', '2026-10-31', 'coming-soon');
select tests.ok(true, 'anon can join the waitlist');
insert into public.waitlist (email, segment, locale, privacy_notice_version, marketing_consent, marketing_consent_version) values ('news@example.com', 'landlord', 'en', '2026-10-31', true, 'newsletter-2026-10-31');
select tests.ok(true, 'anon can join with newsletter consent');
select tests.throws($$insert into public.waitlist (email, segment, privacy_notice_version, marketing_consent) values ('x@example.com', 'tenant', 'v1', true)$$, 'newsletter consent requires the consent text version');
insert into public.waitlist (email, segment, locale, privacy_notice_version, pro_interest, pro_interest_version) values ('pro@example.com', 'landlord', 'hu', '2026-10-31', true, 'pro-interest-2026-10-31');
select tests.ok(true, 'a landlord can ask about Keyfly Pro');
select tests.throws($$insert into public.waitlist (email, segment, privacy_notice_version, pro_interest, pro_interest_version) values ('t@example.com', 'tenant', 'v1', true, 'v1')$$, 'Pro interest is only for landlords and agencies');
select tests.throws($$insert into public.waitlist (email, segment, privacy_notice_version, pro_interest) values ('a@example.com', 'agent', 'v1', true)$$, 'Pro interest requires the consent text version');
select tests.throws('select * from public.waitlist', 'anon cannot read the waitlist');
select tests.throws($$insert into public.waitlist (email, segment, privacy_notice_version) values ('NEW@example.com', 'tenant', 'v1')$$, 'same email cannot join the same segment twice');
select tests.throws($$insert into public.waitlist (email, privacy_notice_version) values ('not-an-email', 'v1')$$, 'invalid email is rejected');
select tests.throws($$insert into public.waitlist (email, segment, privacy_notice_version, created_at) values ('y@example.com', 'tenant', 'v1', now() - interval '1 year')$$, 'anon cannot set server-only columns');
rollback;

-- ---------- Tenant (Anna): current lease at Péter, closing lease at Duna ------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.ok((select count(*) from public.applications) = 2, 'tenant sees only her 2 requests');
select tests.ok((select count(*) from public.profiles) = 1, 'tenant sees only her profile');
select tests.ok((select count(*) from public.policies) = 1, 'tenant sees her policy');
select tests.ok((select count(*) from public.accounts) = 1, 'tenant sees only her own account');
select tests.ok((select count(*) from public.leases) = 2, 'tenant sees her active and her closing lease');
select tests.ok((select count(*) from public.leases where id = '00000000-0000-0000-0000-0000000001a0') = 0, 'tenant cannot see the previous tenant''s lease');
select tests.ok((select count(*) from public.properties) = 2, 'tenant sees the address of the homes she rents');
select tests.ok((select count(*) from public.properties where id = '00000000-0000-0000-0000-00000000e003') = 0, 'tenant cannot see the landlord''s other property');
select tests.ok((select count(*) from public.lease_parties where lease_id = '00000000-0000-0000-0000-0000000001a1') = 2, 'tenant sees the contract parties');
select tests.ok((select count(*) from public.lease_occupants) = 2, 'tenant sees who lives with her');
update public.lease_occupants set removed_at = now() where user_id = '00000000-0000-0000-0000-0000000000f1';
select tests.ok((select removed_at is not null from public.lease_occupants where user_id = '00000000-0000-0000-0000-0000000000f1'), 'the tenant can remove an occupant');
update public.lease_occupants set removed_at = null where user_id = '00000000-0000-0000-0000-0000000000f1';
select tests.ok((select removed_at is not null from public.lease_occupants where user_id = '00000000-0000-0000-0000-0000000000f1'), '… but cannot bring anyone back without an invitation');
select tests.ok((select count(*) from public.staff) = 0, 'tenant cannot see staff');
update public.leases set monthly_rent = 1 where id = '00000000-0000-0000-0000-0000000001a1';
select tests.ok((select monthly_rent from public.leases where id = '00000000-0000-0000-0000-0000000001a1') = 280000, 'tenant cannot change the lease');
select tests.throws($$insert into public.properties (account_id, postal_code, city, street_name, street_type, house_number, created_by) values ((select id from fx where name = 'acc_peter'), '1061', 'Budapest', 'X', 'utca', '1.', '00000000-0000-0000-0000-0000000000a1')$$, 'tenant cannot add a property to the landlord''s account');
select tests.throws($$select public.activity_log()$$, 'tenant cannot read the audit log');
select tests.throws('select * from audit.events', 'tenant has no access to the audit schema');
select tests.throws($$select public.create_staff_invitation('x@keyfly.app', 'admin')$$, 'tenant cannot invite staff');
select tests.throws($$select public.close_lease('00000000-0000-0000-0000-0000000001a2')$$, 'tenant cannot close a lease');
select tests.ok(length(public.create_lease_invitation('00000000-0000-0000-0000-0000000001a1', 'gabor@example.com', 'lease_occupant', 'occupant')) = 64,
  'tenant can invite an occupant to her home');
select tests.throws($$select public.create_company_account('00000000-0000-0000-0000-0000000000a1', 'Anna Lakásai Kft.', '23456789-2-41')$$, 'users cannot create companies directly (the server does, after the NAV check)');
reset role;
set local role service_role;
select tests.ok(public.create_company_account('00000000-0000-0000-0000-0000000000a1', 'Anna Lakásai Kft.', '23456789-2-41') is not null, 'the server creates a company for its owner');
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.ok((select count(*) from public.accounts) = 2, 'the creator sees the new company account');
select tests.ok(length(public.create_account_invitation((select id from public.accounts where kind = 'company'), 'x@example.com', 'manager')) = 64, 'a Basic company invites members too');
update public.applications set monthly_rent = 360000 where id = '00000000-0000-0000-0000-00000000a001';
select tests.ok((select monthly_rent from public.applications where id = '00000000-0000-0000-0000-00000000a001') = 360000, 'tenant can edit a submitted request');
select tests.throws($$update public.applications set quoted_premium_monthly = 1 where id = '00000000-0000-0000-0000-00000000a001'$$, 'tenant cannot change the premium');
select tests.throws($$update public.applications set status = 'approved' where id = '00000000-0000-0000-0000-00000000a001'$$, 'tenant cannot approve herself');
select tests.throws($$insert into public.applications (tenant_id, monthly_rent) values ('00000000-0000-0000-0000-0000000000a2', 100000)$$, 'tenant cannot create a request for someone else');
select tests.throws($$insert into public.applications (tenant_id, monthly_rent, quoted_rate_pct) values ('00000000-0000-0000-0000-0000000000a1', 100000, 1)$$, 'tenant cannot set her own rate');
insert into public.applications (tenant_id, monthly_rent) values ('00000000-0000-0000-0000-0000000000a1', 300000);
select tests.ok(true, 'tenant can create her own request');
select tests.throws($$update public.profiles set email = 'x@y.hu' where id = '00000000-0000-0000-0000-0000000000a1'$$, 'tenant cannot change her login email');
update public.profiles set phone = '+36301234567', locale = 'en', start_view = 'tenant' where id = '00000000-0000-0000-0000-0000000000a1';
select tests.ok(true, 'tenant can change phone, language and start view');
select tests.throws($$insert into public.claims (policy_id, submitted_by, reason, amount_claimed) values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1', 'x', 1000)$$, 'tenant cannot file a claim');
select tests.throws($$insert into public.verifications (application_id, method, status) values ('00000000-0000-0000-0000-00000000a001', 'manual', 'passed')$$, 'tenant cannot verify herself');
select tests.throws($$insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000000a1', 'superadmin')$$, 'tenant cannot make herself admin');
insert into storage.objects (bucket_id, name) values ('documents', '00000000-0000-0000-0000-0000000000a1/certificate.pdf');
select tests.ok(true, 'tenant can upload to her own folder');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('documents', '00000000-0000-0000-0000-0000000000a2/x.pdf')$$, 'tenant cannot upload to another folder');
rollback;

-- ---------- Co-tenant, occupant, past tenant, stranger ------------------------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
select tests.ok((select count(*) from public.leases) = 1, 'co-tenant sees the shared lease only');
select tests.ok((select count(*) from public.lease_parties) = 2, 'co-tenant sees the contract parties');
select tests.ok((select count(*) from public.policies) = 1, 'co-tenant sees the guarantee on the lease');
select tests.ok((select count(*) from public.applications) = 1, 'co-tenant sees only his own request');
update public.lease_occupants set removed_at = now() where user_id = '00000000-0000-0000-0000-0000000000f1';
select tests.ok((select count(*) from public.lease_occupants where removed_at is not null) = 0, 'a co-tenant cannot remove household members');
rollback;

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000f1');
select tests.ok((select count(*) from public.leases) = 1, 'occupant sees the home''s lease');
select tests.ok((select count(*) from public.lease_parties) = 0, 'occupant cannot see the contract parties');
select tests.ok((select count(*) from public.policies) = 0, 'occupant cannot see the guarantee');
select tests.ok((select count(*) from public.properties) = 1, 'occupant sees the address');
rollback;

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000f2');
select tests.ok((select count(*) from public.leases) = 1, 'past tenant keeps his closed lease');
select tests.ok((select count(*) from public.lease_parties) = 2, 'past tenant keeps the contract record');
select tests.ok((select count(*) from public.lease_occupants) = 0, 'past tenant cannot see the new household');
rollback;

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
select tests.ok((select count(*) from public.leases) + (select count(*) from public.properties) + (select count(*) from public.policies) = 0, 'a stranger sees nothing');
rollback;

-- ---------- Private landlord (Péter) ------------------------------------------------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select tests.ok((select count(*) from public.applications) = 0, 'landlord cannot see tenant income data');
select tests.ok((select count(*) from public.properties) = 1, 'landlord sees his property');
select tests.ok((select count(*) from public.leases) = 2, 'landlord sees all leases of his property');
select tests.ok((select count(*) from public.leases where id = '00000000-0000-0000-0000-0000000001a2') = 0, 'landlord cannot see the tenant''s other lease');
select tests.ok((select count(*) from public.policies) = 1, 'landlord sees the guarantee on his lease');
select tests.throws($$update public.leases set monthly_rent = 300000 where id = '00000000-0000-0000-0000-0000000001a1'$$, 'confirmed terms change only by amendment');
select tests.throws($$update public.leases set status = 'closed' where id = '00000000-0000-0000-0000-0000000001a1'$$, 'status changes only through functions');
select tests.throws($$update public.leases set end_date = current_date where id = '00000000-0000-0000-0000-0000000001a1'$$, 'the landlord cannot shorten a confirmed lease');
select tests.throws($$update public.leases set termination_date = current_date - 1 where id = '00000000-0000-0000-0000-0000000001a1'$$, 'a notice cannot be backdated');
update public.leases set termination_date = current_date + 60 where id = '00000000-0000-0000-0000-0000000001a1';
select tests.ok((select termination_date from public.leases where id = '00000000-0000-0000-0000-0000000001a1') = current_date + 60, 'landlord can record a notice');
select tests.throws($$select public.close_lease('00000000-0000-0000-0000-0000000001a1')$$, 'an active lease cannot be closed');
select tests.throws($$select public.create_account_invitation((select id from fx where name = 'acc_peter'), 'x@example.com', 'manager')$$, 'nobody joins a personal account');
insert into public.claims (policy_id, submitted_by, reason, amount_claimed) values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'Unpaid rent', 350000);
select tests.ok((select count(*) from public.claims) = 1, 'landlord can file and see a claim');
select tests.throws($$insert into public.claims (policy_id, submitted_by, reason, amount_claimed, amount_paid) values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'x', 1000, 1000)$$, 'landlord cannot set the paid amount');
update public.claims set status = 'paid';
select tests.ok((select status from public.claims limit 1) = 'submitted', 'landlord cannot mark a claim as paid');
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.ok((select count(*) from public.claims) = 1, 'tenant sees the claim against her');
rollback;

-- ---------- Business team (Duna) ------------------------------------------------------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000e1');
select tests.ok((select count(*) from public.properties) = 2, 'admin sees all company properties');
select tests.ok((select count(*) from public.leases) = 2, 'admin sees the company''s leases');
select tests.ok((select count(*) from public.applications) = 0, 'a referral partner never reads application rows (income data)');
select tests.ok((select count(*) from public.referral_status('00000000-0000-0000-0000-00000000c0c0')) = 1, 'a referral partner sees the status of its referrals');
select tests.ok((select count(*) from public.activity_log('00000000-0000-0000-0000-00000000c0c0')) > 0, 'Business admin reads the account''s activity log');
select tests.ok(length(public.create_account_invitation('00000000-0000-0000-0000-00000000c0c0', 'New.Manager@Example.com', 'manager', 'selected',
  array['00000000-0000-0000-0000-00000000e003']::uuid[])) = 64, 'admin invites a manager for one property');
select tests.ok((select email from public.invitations where kind = 'account_member') = 'new.manager@example.com', 'invitation email is stored in lower case');
select tests.throws($$select public.create_account_invitation('00000000-0000-0000-0000-00000000c0c0', 'x@example.com', 'owner')$$, 'nobody is invited as owner');
select tests.ok(length(public.create_lease_invitation('00000000-0000-0000-0000-0000000001a3', 'nandor@example.com', 'lease_tenant')) = 64, 'admin invites a tenant to a draft lease');
select tests.ok((select status from public.leases where id = '00000000-0000-0000-0000-0000000001a3') = 'pending', 'inviting the tenant confirms the landlord side');
select tests.throws($$update public.leases set monthly_rent = 900000 where id = '00000000-0000-0000-0000-0000000001a3'$$, 'terms are fixed once the tenant is invited');
rollback;

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000e2');
select tests.ok((select count(*) from public.properties) = 1, 'scoped manager sees only his property');
select tests.ok((select count(*) from public.leases) = 1, 'scoped manager sees only that property''s lease');
select tests.throws($$select public.activity_log('00000000-0000-0000-0000-00000000c0c0')$$, 'a manager cannot read the activity log');
select tests.throws($$select public.create_account_invitation('00000000-0000-0000-0000-00000000c0c0', 'x@example.com', 'viewer')$$, 'a manager cannot invite members');
select public.close_lease('00000000-0000-0000-0000-0000000001a2');
select tests.ok((select status from public.leases where id = '00000000-0000-0000-0000-0000000001a2') = 'closed', 'manager closes a lease after move-out');
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.ok((select count(*) from public.leases where id = '00000000-0000-0000-0000-0000000001a2') = 1, 'the tenant keeps reading her closed lease');
select tests.ok((select private.lease_access('00000000-0000-0000-0000-0000000001a2')) = 'tenant_archive', '… as an archive');
rollback;

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000e3');
select tests.ok((select count(*) from public.leases) = 2, 'viewer sees the company''s leases');
update public.leases set termination_date = current_date where id = '00000000-0000-0000-0000-0000000001a2';
select tests.ok((select termination_date from public.leases where id = '00000000-0000-0000-0000-0000000001a2') is null, 'viewer cannot change a lease');
rollback;

-- ---------- Plans: unlimited users and every role on every plan; selected properties only on Enterprise ----

begin;
insert into public.accounts (id, kind, name, legal_name, tax_number, plan) values
  ('00000000-0000-0000-0000-00000000c1c1', 'company', 'Alap Kft.', 'Alap Kft.', '11111111-2-42', 'basic');
insert into public.account_members (account_id, user_id, role) values ('00000000-0000-0000-0000-00000000c1c1', '00000000-0000-0000-0000-0000000000b1', 'owner');
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select public.create_account_invitation('00000000-0000-0000-0000-00000000c1c1', 'x@example.com', 'admin');
select public.create_account_invitation('00000000-0000-0000-0000-00000000c1c1', 'one@example.com', 'manager');
select public.create_account_invitation('00000000-0000-0000-0000-00000000c1c1', 'two@example.com', 'viewer');
select public.create_account_invitation('00000000-0000-0000-0000-00000000c1c1', 'three@example.com', 'viewer');
select tests.ok((select count(*) from public.invitations where account_id = '00000000-0000-0000-0000-00000000c1c1' and revoked_at is null) = 4, 'Basic invites any number of members, admins too');
select tests.throws($$select public.create_account_invitation('00000000-0000-0000-0000-00000000c1c1', 'four@example.com', 'manager', 'selected')$$, 'selected properties only on Enterprise');
select tests.throws($$select public.create_account_invitation('00000000-0000-0000-0000-00000000c1c1', 'four@example.com', 'owner')$$, 'the owner is transferred, not invited');
select public.create_account_invitation('00000000-0000-0000-0000-00000000c1c1', 'two@example.com', 'manager');
select tests.ok((select count(*) from public.invitations where account_id = '00000000-0000-0000-0000-00000000c1c1' and revoked_at is null) = 4, 're-sending replaces the open invitation');
select tests.ok((select slug from public.accounts where id = '00000000-0000-0000-0000-00000000c1c1') = 'alap-kft', 'a company gets a URL slug from its name');
rollback;

-- ---------- Accepting invitations -----------------------------------------------------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000e1');
create temp table tok as select public.create_lease_invitation('00000000-0000-0000-0000-0000000001a3', 'nandor@example.com', 'lease_tenant') as t;
grant select on tok to authenticated;
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.ok((select is_for_me from public.invitation_preview((select t from tok))) = false, 'preview tells Anna the invitation is not hers');
select tests.ok((select masked_email from public.invitation_preview((select t from tok))) = 'n•••@example.com', 'preview masks the address');
select tests.ok((select property_address is null and monthly_rent is null from public.invitation_preview((select t from tok))), 'preview shows no details to others');
select tests.throws($$select public.accept_invitation((select t from tok))$$, 'an invitation is accepted only with its own email');
select tests.act_as('00000000-0000-0000-0000-0000000000f2');
select tests.ok((select is_open and is_for_me from public.invitation_preview((select t from tok))), 'preview for the invitee');
select public.accept_invitation((select t from tok));
select tests.ok((select status from public.leases where id = '00000000-0000-0000-0000-0000000001a3') = 'confirmed', 'accepting confirms the lease');
select tests.ok((select count(*) from public.lease_parties where lease_id = '00000000-0000-0000-0000-0000000001a3') = 2, 'accepting records both parties');
select tests.ok((select public.lease_phase(l) from public.leases l where id = '00000000-0000-0000-0000-0000000001a3') = 'upcoming', 'phase: upcoming before the start date');
select tests.ok((select count(*) from public.leases) = 2, 'the new tenant sees his new lease next to the old one');
select tests.throws($$select public.accept_invitation((select t from tok))$$, 'a link works once');
rollback;

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
create temp table tok as select public.create_lease_invitation('00000000-0000-0000-0000-0000000001a1', 'gabor@example.com', 'lease_occupant', 'occupant') as t;
grant select on tok to authenticated;
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
select public.accept_invitation((select t from tok));
select tests.ok((select count(*) from public.leases) = 1, 'an accepted occupant sees the home''s lease');
rollback;

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000e1');
create temp table tok as select public.create_account_invitation('00000000-0000-0000-0000-00000000c0c0', 'gabor@example.com', 'viewer', 'selected',
  array['00000000-0000-0000-0000-00000000e003']::uuid[]) as t;
grant select on tok to authenticated;
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
select public.accept_invitation((select t from tok));
select tests.ok((select count(*) from public.properties) = 1, 'a new member sees only the properties chosen in the invitation');
rollback;

-- ---------- The tenant invites the landlord ------------------------------------------------
-- Gábor (no lease yet) invites Péter, or Lili (a Duna viewer).

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
create temp table req as select * from public.create_lease_request('1068', 'Budapest', 'Dózsa György', 'út', '30.', current_date + 30, 280000,
  'Peter@Example.com', p_building => 'B', p_staircase => '2.', p_floor_type => 'numbered', p_floor_number => 1::smallint, p_door => '3.',
  p_end_date => current_date + 395, p_landlord_name => 'Péter Szabó');
select tests.ok(length((select token from req)) = 64, 'a tenant invites the landlord');
select tests.ok((select count(*) from public.lease_requests) = 1 and (select status from public.lease_requests) = 'pending_landlord', 'the tenant sees the request, waiting for the landlord');
select tests.ok((select landlord_email from public.lease_requests) = 'peter@example.com', 'the landlord''s email is stored in lower case');
select tests.ok((select count(*) from public.invitations where kind = 'lease_landlord') = 1, 'the tenant sees the open landlord invitation');
select tests.throws($$select public.remind_lease_request((select request_id from req))$$, 'a reminder waits 24 hours');
select tests.throws($$select public.create_lease_request('1068', 'Budapest', 'X', 'utca', '1.', current_date, 1, 'gabor@example.com')$$, 'nobody invites themselves as landlord');
select tests.throws($$select public.create_lease_request('1068', 'Budapest', 'X', 'utca', '1.', current_date - 400, 1, 'x@example.com', p_end_date => current_date - 1)$$, 'a lease that already ended cannot be requested');
select tests.throws($$select public.create_lease_request('106', 'Budapest', 'X', 'utca', '1.', current_date, 1, 'x@example.com')$$, 'the request address follows the property rules');
select tests.throws($$select public.revoke_invitation((select id from public.invitations where kind = 'lease_landlord'))$$, 'a landlord invitation is withdrawn only with the request');
select tests.throws($$insert into public.lease_requests (tenant_account_id, postal_code, city, street_name, street_type, house_number, start_date, monthly_rent, landlord_email) values ((select id from fx where name = 'acc_gabor'), '1068', 'Budapest', 'X', 'utca', '1.', current_date, 1, 'x@example.com')$$, 'requests are created only through the function');
select tests.throws($$update public.lease_requests set monthly_rent = 1$$, 'the tenant cannot edit a sent request');

grant select on req to anon;
select tests.act_as(null);
select tests.ok((select is_open and kind = 'lease_landlord' and inviter_name = 'gabor' and street = 'Dózsa György út' and house_number = '30.' and postal_code = '1068'
                 from public.invitation_teaser((select token from req))), 'the signed-out landing shows who invited and which home');
select tests.ok((select masked_email = 'p•••@example.com' from public.invitation_teaser((select token from req))), 'the teaser masks the address');
select tests.ok((select count(*) from public.invitation_teaser('not-a-token')) = 0, 'an unknown link shows nothing');

select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.ok((select count(*) from public.lease_requests) = 0, 'others cannot see the request');
select tests.ok((select not is_for_me and property_address is null and monthly_rent is null from public.invitation_preview((select token from req))), 'the preview shows others no details');
select tests.ok((select count(*) from public.lease_request_preview((select token from req))) = 0, 'the full details are only for the landlord');
select tests.throws($$select public.accept_landlord_invitation((select token from req), (select id from fx where name = 'acc_anna'), current_date + 30, 280000)$$, 'only the invited landlord can take over');
select tests.throws($$select public.remind_lease_request((select request_id from req))$$, 'only the tenant side can send a reminder');
select tests.throws($$select public.cancel_lease_request((select request_id from req))$$, 'only the tenant side can cancel');

select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select tests.ok((select is_open and is_for_me and property_address like 'Dózsa György út 30.,%' from public.invitation_preview((select token from req))), 'the landlord opens the invitation');
select tests.ok((select monthly_rent = 280000 and floor_number = 1 and tenant_name = 'gabor' from public.lease_request_preview((select token from req))), 'the landlord sees the address and the terms');
select tests.ok((select count(*) from public.lease_requests) = 0, 'the landlord does not read the tenant''s request rows');
select tests.throws($$select public.accept_invitation((select token from req))$$, 'the landlord invitation has its own acceptance');
select tests.throws($$select public.accept_landlord_invitation((select token from req), '00000000-0000-0000-0000-00000000c0c0', current_date + 30, 280000)$$, 'the landlord takes over only with an account of his');
select tests.throws($$select public.accept_landlord_invitation((select token from req), (select id from fx where name = 'acc_peter'), current_date + 30, 280000, p_property_id => '00000000-0000-0000-0000-00000000e003', p_end_date => current_date + 395)$$, 'an existing property must belong to the chosen account');
select tests.throws($$select public.accept_landlord_invitation((select token from req), (select id from fx where name = 'acc_peter'), current_date + 30, 280000, p_property_id => '00000000-0000-0000-0000-00000000e001', p_end_date => current_date + 395)$$, 'the lease cannot overlap another one on the same property');
create temp table took as select * from public.accept_landlord_invitation((select token from req), (select id from fx where name = 'acc_peter'),
  current_date + 30, 280000, p_end_date => current_date + 395);
select tests.ok((select not needs_tenant_approval from took), 'unchanged terms need no second approval');
select tests.ok((select tenant_email = 'gabor@example.com' and tenant_locale = 'hu' from took), 'the landlord''s side learns where to notify the tenant');
select tests.ok((select status from public.leases where id = (select lease_id from took)) = 'confirmed', 'the lease is confirmed at once');
select tests.ok((select count(*) from public.properties p join public.leases l on l.property_id = p.id
                 where l.id = (select lease_id from took) and p.street_name = 'Dózsa György' and p.floor_number = 1 and p.building = 'B'
                   and p.account_id = (select id from fx where name = 'acc_peter')) = 1, 'the property is created from the tenant''s address');
select tests.ok((select count(*) from public.lease_parties where lease_id = (select lease_id from took)) = 2, 'both parties are recorded');
select tests.throws($$select public.accept_landlord_invitation((select token from req), (select id from fx where name = 'acc_peter'), current_date + 30, 280000)$$, 'the link works once');
select tests.act_as(null);
select tests.ok((select not is_open and inviter_name is null and street is null from public.invitation_teaser((select token from req))), 'a used link shows no details');

select tests.act_as('00000000-0000-0000-0000-0000000000f3');
select tests.ok((select status from public.lease_requests) = 'confirmed', 'the tenant sees the request confirmed');
select tests.ok((select count(*) from public.leases) = 1 and (select count(*) from public.properties) = 1, 'the tenant sees the new lease and its address');
select tests.throws($$select public.cancel_lease_request((select request_id from req))$$, 'a confirmed request cannot be cancelled');
rollback;

-- Changed terms: the tenant approves them; nobody else can.
begin;
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
create temp table req as select * from public.create_lease_request('1068', 'Budapest', 'Dózsa György', 'út', '30.', current_date + 30, 280000, 'peter@example.com');
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
create temp table took as select * from public.accept_landlord_invitation((select token from req), (select id from fx where name = 'acc_peter'),
  current_date + 30, 290000, p_deposit_amount => 560000, p_payment_day => 5::smallint);
select tests.ok((select needs_tenant_approval from took), 'changed or added terms go back to the tenant');
select tests.ok((select status from public.leases where id = (select lease_id from took)) = 'pending', '… and the lease waits for the tenant');
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
select tests.ok((select status from public.lease_requests) = 'pending_tenant', 'the tenant is asked to approve');
select tests.ok((select monthly_rent = 290000 and payment_day = 5 from public.leases where id = (select lease_id from took)), 'the tenant sees the landlord''s terms');
select tests.ok((select monthly_rent from public.lease_requests) = 280000, '… next to what she entered');
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.throws($$select public.confirm_lease_request((select request_id from req))$$, 'only the tenant side approves the changes');
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
create temp table conf as select * from public.confirm_lease_request((select request_id from req));
select tests.ok((select landlord_email = 'peter@example.com' and landlord_locale = 'hu' from conf), 'the tenant''s side learns where to notify the landlord');
select tests.ok((select status from public.leases where id = (select lease_id from took)) = 'confirmed', 'the tenant''s approval confirms the lease');
select tests.ok((select count(*) from public.lease_parties where lease_id = (select lease_id from took)) = 2, '… and records both parties');
select tests.ok((select status from public.lease_requests) = 'confirmed', 'the request is closed as confirmed');
rollback;

-- The tenant turns down the changes.
begin;
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
create temp table req as select * from public.create_lease_request('1068', 'Budapest', 'Dózsa György', 'út', '30.', current_date + 30, 280000, 'peter@example.com');
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
create temp table took as select * from public.accept_landlord_invitation((select token from req), (select id from fx where name = 'acc_peter'), current_date + 30, 300000);
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
select tests.ok((select taken_over and landlord_email = 'peter@example.com' from public.cancel_lease_request((select request_id from req))), 'turning down the changes tells who to notify');
select tests.ok((select status from public.lease_requests) = 'cancelled', 'the tenant can turn down the changed terms');
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select tests.ok((select status from public.leases where id = (select lease_id from took)) = 'cancelled', '… which cancels the pending lease');
rollback;

-- The landlord declines.
begin;
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
create temp table req as select * from public.create_lease_request('1068', 'Budapest', 'Dózsa György', 'út', '30.', current_date + 30, 280000, 'peter@example.com');
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select public.decline_invitation((select token from req));
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
select tests.ok((select status from public.lease_requests) = 'declined', 'the landlord can decline');
select tests.throws($$select public.remind_lease_request((select request_id from req))$$, 'no reminder after the landlord declined');
rollback;

-- The link expires; a reminder sends a new one.
begin;
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
create temp table req as select * from public.create_lease_request('1068', 'Budapest', 'Dózsa György', 'út', '30.', current_date + 30, 280000, 'peter@example.com');
reset role;
update public.invitations set expires_at = now() - interval '1 minute' where kind = 'lease_landlord';
update public.lease_requests set last_sent_at = now() - interval '25 hours';
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select tests.ok((select not is_open from public.invitation_preview((select token from req))), 'an expired landlord invitation cannot be opened');
select tests.throws($$select public.accept_landlord_invitation((select token from req), (select id from fx where name = 'acc_peter'), current_date + 30, 280000)$$, 'an expired landlord invitation cannot be accepted');
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
create temp table rem as select * from public.remind_lease_request((select request_id from req));
select tests.ok(length((select token from rem)) = 64 and (select reminder_count from public.lease_requests) = 1, 'a reminder sends a new link');
select tests.ok((select invitation_expires_at = (select expires_at from rem) from public.lease_requests), 'the request shows the new link''s expiry');
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select tests.ok((select count(*) from public.lease_request_preview((select token from req))) = 0, 'the old link stops working');
select tests.ok((select count(*) from public.lease_request_preview((select token from rem))) = 1, 'the new link works');
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
select tests.ok((select not taken_over and landlord_locale is null from public.cancel_lease_request((select request_id from req))), 'withdrawing before the take-over: no landlord account language yet');
rollback;

-- A company rents: every member sees the request and its link's expiry; only owners and admins act on it.
begin;
select tests.act_as('00000000-0000-0000-0000-0000000000e1');
create temp table req as select * from public.create_lease_request('1068', 'Budapest', 'Dózsa György', 'út', '30.', current_date + 30, 280000,
  'peter@example.com', p_tenant_account_id => '00000000-0000-0000-0000-00000000c0c0');
select tests.act_as('00000000-0000-0000-0000-0000000000e3');
select tests.ok((select count(*) = 1 and bool_and(invitation_expires_at > now()) from public.lease_requests), 'a viewer of the renting company sees the request and when its link expires');
select tests.ok((select count(*) from public.invitations where kind = 'lease_landlord') = 0, '… but not the invitation itself');
select tests.throws($$select public.remind_lease_request((select request_id from req))$$, 'a viewer cannot send a reminder');
select tests.throws($$select public.cancel_lease_request((select request_id from req))$$, 'a viewer cannot cancel');
rollback;

-- A landlord without rights in the company; the limit on open requests.
begin;
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
create temp table req as select * from public.create_lease_request('1068', 'Budapest', 'Dózsa György', 'út', '30.', current_date + 30, 280000, 'lili@example.com');
select tests.act_as('00000000-0000-0000-0000-0000000000e3');
select tests.throws($$select public.accept_landlord_invitation((select token from req), '00000000-0000-0000-0000-00000000c0c0', current_date + 30, 280000)$$, 'a viewer cannot take over a lease for the company');
select tests.ok((select not needs_tenant_approval from public.accept_landlord_invitation((select token from req), (select id from fx where name = 'acc_lili'), current_date + 30, 280000)),
  '… but can with her own account');
select tests.act_as('00000000-0000-0000-0000-0000000000f3');
select public.create_lease_request('1068', 'Budapest', 'X', 'utca', '1.', current_date, 1, 'x' || n || '@example.com') from generate_series(1, 5) n;
select tests.throws($$select public.create_lease_request('1068', 'Budapest', 'X', 'utca', '9.', current_date, 1, 'y@example.com')$$, 'at most 5 open requests at a time');
rollback;

-- ---------- Staff ------------------------------------------------------------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000d2');
select tests.ok((select count(*) from public.applications) = 0, 'staff without a second factor sees nothing');
select tests.act_as('00000000-0000-0000-0000-0000000000d2', true);
select tests.ok((select count(*) from public.applications) = 3, 'support with 2FA sees quote requests');
select tests.ok((select count(*) from public.leases) = 4, 'support with 2FA sees all leases');
select tests.ok((select count(*) from public.waitlist) >= 0, 'staff can read the waitlist');
select tests.throws($$insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000000a2', 'admin')$$, 'support cannot add staff');
select tests.throws($$select public.create_staff_invitation('x@keyfly.app', 'admin')$$, 'support cannot invite staff');
select tests.throws($$select public.activity_log()$$, 'support cannot read the full audit log');
select tests.throws($$select public.close_lease('00000000-0000-0000-0000-0000000001a2')$$, 'support cannot close a lease');
rollback;

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000d1', true);
update public.applications
  set status = 'approved', quoted_rate_pct = 6, quoted_premium_monthly = 5250, quoted_premium_yearly = 63000,
      max_coverage = 1200000, offer_expires_at = now() + interval '7 days', decided_at = now()
  where id = '00000000-0000-0000-0000-00000000a001';
select tests.ok((select status from public.applications where id = '00000000-0000-0000-0000-00000000a001') = 'approved', 'superadmin can issue an offer');
select tests.throws($$select public.create_staff_invitation('someone@gmail.com', 'support')$$, 'staff need a @keyfly.app address');
create temp table tok as select public.create_staff_invitation('new@keyfly.app', 'insurance') as t;
grant select on tok to authenticated;
select tests.ok((select count(*) from public.activity_log()) > 0, 'superadmin reads the full audit log');
select tests.act_as('00000000-0000-0000-0000-0000000000d3');
select public.accept_staff_invitation((select t from tok));
select tests.ok((select role from public.staff where user_id = '00000000-0000-0000-0000-0000000000d3') = 'insurance', 'an invited staff member joins with the given role');
select tests.ok((select count(*) from public.applications) = 0, '… but sees nothing until 2FA is on');
rollback;

begin;
update public.staff set disabled_at = now() where user_id = '00000000-0000-0000-0000-0000000000d2';
select tests.act_as('00000000-0000-0000-0000-0000000000d2', true);
select tests.ok((select count(*) from public.applications) = 0, 'a disabled staff member sees nothing');
rollback;

select tests.ok((select count(*) from audit.events where table_name = 'leases') >= 4, 'lease changes are audited');
select tests.ok((select count(*) from audit.events where changes ? 'token_hash') = 0, 'tokens never reach the audit log');

-- ---------- Edge cases found in review ----------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000f9', null, '{}');
select tests.ok((select name from public.accounts where personal_user_id = '00000000-0000-0000-0000-0000000000f9') = 'Keyfly', 'sign-up without email still works');
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000f8', 'long@example.com', json_build_object('full_name', repeat('x', 300))::jsonb);
select tests.ok((select length(name) from public.accounts where personal_user_id = '00000000-0000-0000-0000-0000000000f8') = 200, 'a very long name does not break sign-up');

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
create temp table tok as select public.create_lease_invitation('00000000-0000-0000-0000-0000000001a1', 'long@example.com', 'lease_occupant', 'occupant') as t;
grant select on tok to authenticated;
reset role;
update auth.users set email_confirmed_at = null where id = '00000000-0000-0000-0000-0000000000f8';
select tests.act_as('00000000-0000-0000-0000-0000000000f8');
select tests.throws($$select public.accept_invitation((select t from tok))$$, 'an unconfirmed email cannot accept an invitation');
reset role;
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-0000000000f8';
update public.leases set termination_date = current_date - 1 where id = '00000000-0000-0000-0000-0000000001a1';
select tests.act_as('00000000-0000-0000-0000-0000000000f8');
select tests.throws($$select public.accept_invitation((select t from tok))$$, 'an occupant invitation expires with the lease');
rollback;

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000c1');
select public.transfer_account_ownership('00000000-0000-0000-0000-00000000c0c0', '00000000-0000-0000-0000-0000000000e2');
select tests.ok((select role from public.account_members where account_id = '00000000-0000-0000-0000-00000000c0c0' and user_id = '00000000-0000-0000-0000-0000000000e2') = 'owner', 'ownership can be transferred to a member');
select tests.ok((select role from public.account_members where account_id = '00000000-0000-0000-0000-00000000c0c0' and user_id = '00000000-0000-0000-0000-0000000000c1') = 'admin', 'the previous owner stays as admin');
select tests.ok((select property_scope from public.account_members where account_id = '00000000-0000-0000-0000-00000000c0c0' and user_id = '00000000-0000-0000-0000-0000000000e2') = 'all', 'the new owner sees every property');
rollback;

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000e3');
select tests.throws($$select public.referral_status('00000000-0000-0000-0000-00000000c0c0')$$, 'a viewer cannot read referral status');
select tests.throws($$select private.snapshot_lease_parties('00000000-0000-0000-0000-0000000001a1')$$, 'internal functions are not callable');
rollback;

select tests.throws($$truncate audit.events$$, 'the audit log cannot be truncated');
select tests.ok((select count(*) from audit.events where changes ? 'declared_net_income') = 0, 'income data never reaches the audit log');

-- ---------- Default privileges revoked -------------------------------------------

select tests.ok(not has_table_privilege('anon', 'public.applications', 'select'), 'anon has no select on applications');
select tests.ok(not has_table_privilege('anon', 'public.accounts', 'select'), 'anon has no select on accounts');
select tests.ok(not has_table_privilege('anon', 'public.leases', 'select'), 'anon has no select on leases');
select tests.ok(not has_table_privilege('authenticated', 'public.account_members', 'insert'), 'members join only through invitations');
select tests.ok(not has_table_privilege('authenticated', 'public.invitations', 'insert'), 'invitations are created only through functions');
select tests.ok(not has_column_privilege('authenticated', 'public.invitations', 'token_hash', 'select'), 'token hashes are not readable');
select tests.ok(not has_column_privilege('authenticated', 'public.accounts', 'plan', 'update'), 'the plan is not editable by customers');
select tests.ok(not has_column_privilege('authenticated', 'public.profiles', 'email', 'update'), 'login email is not updatable via the API');
select tests.ok(not has_function_privilege('anon', 'public.accept_invitation(text, uuid)', 'execute'), 'anon cannot call invitation functions');
select tests.ok(not has_table_privilege('authenticated', 'public.lease_requests', 'insert'), 'lease requests are created only through functions');
select tests.ok(not has_function_privilege('anon', 'public.lease_request_preview(text)', 'execute'), 'anon cannot read lease requests');

\echo '=== ALL ACCESS-CONTROL TESTS PASSED ==='
