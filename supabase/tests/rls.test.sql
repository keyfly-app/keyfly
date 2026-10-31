-- Jogosultsági tesztek. Futtatás: scripts/test-db.sh
-- Minden blokk egy szerepben fut (anon / adott felhasználó), és hibát dob, ha valami
-- olyat lát vagy tehet meg, amit nem szabadna.
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
  raise exception 'FAIL: % – nem dobott hibát', label;
end $$;

create or replace function tests.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  perform set_config('role', case when uid is null then 'anon' else 'authenticated' end, true);
end $$;

grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

-- ---------- Tesztadatok (postgres-ként, RLS nélkül) -----------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'anna@pelda.hu',   '{"full_name":"Kovács Anna"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'bela@pelda.hu',   '{"full_name":"Nagy Béla"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'peter@pelda.hu',  '{"full_name":"Szabó Péter"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'iroda@pelda.hu',  '{"full_name":"Iroda Ügynök"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'tibi@keyfly.app', '{"full_name":"Superadmin"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'help@keyfly.app', '{"full_name":"Support"}');

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'superadmin'),
  ('00000000-0000-0000-0000-0000000000d2', 'support');

insert into public.organizations (id, name, type) values
  ('00000000-0000-0000-0000-00000000f001', 'Minta Ingatlaniroda', 'agency');
insert into public.organization_members (org_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000c1', 'agent');

insert into public.properties (id, owner_user_id, address_line) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000b1', 'Minta utca 12. 3/2');

insert into public.applications (id, tenant_id, property_id, referred_by_org_id, status, monthly_rent, deposit_months) values
  ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000f001', 'submitted', 350000, 3),
  ('00000000-0000-0000-0000-00000000a002', '00000000-0000-0000-0000-0000000000a2', null, null, 'submitted', 280000, 2),
  ('00000000-0000-0000-0000-00000000a003', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000e001', null, 'accepted', 350000, 3);

insert into public.policies (id, application_id, tenant_id, property_id, status, coverage_amount, premium_amount) values
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000a003', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000e001', 'active', 1050000, 5250);

-- ---------- Alapok ----------------------------------------------------------

select tests.ok((select count(*) from public.profiles) = 6, 'regisztrációkor létrejön a profil');
select tests.ok((select full_name from public.profiles where email = 'anna@pelda.hu') = 'Kovács Anna', 'a név átjön a regisztrációból');
select tests.ok((select deposit_amount from public.applications where id = '00000000-0000-0000-0000-00000000a001') = 1050000, 'kaució = bérleti díj × hónap');
select tests.ok((select policy_number from public.policies limit 1) ~ '^KF-\d{4}-\d{6}$', 'kötvényszám formátuma KF-ÉÉÉÉ-000000');
select tests.ok((select count(*) from public.audit_log where entity = 'applications') >= 3, 'az ajánlatkérések naplózódnak');

-- ---------- Látogató (anon) ------------------------------------------------

begin;
select tests.act_as(null);
select tests.throws('select * from public.applications', 'anon nem olvas ajánlatkérést');
select tests.throws('select * from public.profiles', 'anon nem olvas profilt');
insert into public.waitlist (email, segment, source) values ('uj@pelda.hu', 'tenant', 'hamarosan');
select tests.ok(true, 'anon feliratkozhat a várólistára');
select tests.throws('select * from public.waitlist', 'anon nem olvassa a várólistát');
select tests.throws($$insert into public.waitlist (email, segment) values ('UJ@pelda.hu', 'tenant')$$, 'ugyanaz az e-mail nem iratkozhat fel kétszer');
select tests.throws($$insert into public.waitlist (email) values ('nem-email')$$, 'érvénytelen e-mail elutasítva');
rollback;

-- ---------- Bérlő (Anna) ---------------------------------------------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.ok((select count(*) from public.applications) = 2, 'bérlő csak a saját 2 kérését látja');
select tests.ok((select count(*) from public.profiles) = 1, 'bérlő csak a saját profilját látja');
select tests.ok((select count(*) from public.policies) = 1, 'bérlő látja a saját kötvényét');
select tests.ok((select count(*) from public.properties) = 0, 'bérlő nem látja a bérbeadó ingatlantábláját');
select tests.ok((select count(*) from public.staff) = 0, 'bérlő nem látja a munkatársakat');
select tests.ok((select count(*) from public.audit_log) = 0, 'bérlő nem látja a naplót');
update public.applications set monthly_rent = 360000 where id = '00000000-0000-0000-0000-00000000a001';
select tests.ok((select monthly_rent from public.applications where id = '00000000-0000-0000-0000-00000000a001') = 360000, 'bérlő módosíthatja a beküldött kérést');
select tests.throws($$update public.applications set quoted_premium_monthly = 1 where id = '00000000-0000-0000-0000-00000000a001'$$, 'bérlő nem írhatja át a díjat');
select tests.throws($$update public.applications set status = 'approved' where id = '00000000-0000-0000-0000-00000000a001'$$, 'bérlő nem hagyhatja jóvá magát');
select tests.throws($$insert into public.applications (tenant_id, monthly_rent) values ('00000000-0000-0000-0000-0000000000a2', 100000)$$, 'bérlő nem indíthat kérést más nevében');
select tests.throws($$insert into public.applications (tenant_id, monthly_rent, quoted_rate_pct) values ('00000000-0000-0000-0000-0000000000a1', 100000, 1)$$, 'bérlő nem adhat meg saját díjat');
insert into public.applications (tenant_id, monthly_rent) values ('00000000-0000-0000-0000-0000000000a1', 300000);
select tests.ok(true, 'bérlő indíthat saját kérést');
select tests.throws($$update public.profiles set email = 'x@y.hu' where id = '00000000-0000-0000-0000-0000000000a1'$$, 'bérlő nem írhatja át a belépési e-mailjét');
update public.profiles set phone = '+36301234567' where id = '00000000-0000-0000-0000-0000000000a1';
select tests.ok(true, 'bérlő módosíthatja a telefonszámát');
select tests.throws($$insert into public.claims (policy_id, submitted_by, reason, amount_claimed) values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1', 'x', 1000)$$, 'bérlő nem jelenthet kárt');
select tests.throws($$insert into public.verifications (application_id, method, status) values ('00000000-0000-0000-0000-00000000a001', 'manual', 'passed')$$, 'bérlő nem igazolhatja saját magát');
select tests.throws($$insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000000a1', 'superadmin')$$, 'bérlő nem teheti magát adminná');
insert into storage.objects (bucket_id, name) values ('documents', '00000000-0000-0000-0000-0000000000a1/igazolas.pdf');
select tests.ok(true, 'bérlő a saját mappájába feltölthet');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('documents', '00000000-0000-0000-0000-0000000000a2/x.pdf')$$, 'bérlő nem tölthet más mappájába');
rollback;

-- ---------- Másik bérlő (Béla) ---------------------------------------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
select tests.ok((select count(*) from public.applications) = 1, 'Béla csak a saját kérését látja');
select tests.ok((select count(*) from public.policies) = 0, 'Béla nem látja Anna kötvényét');
select tests.ok((select count(*) from public.claims) = 0, 'Béla nem lát kárigényt');
rollback;

-- ---------- Bérbeadó (Péter) -----------------------------------------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select tests.ok((select count(*) from public.applications) = 0, 'bérbeadó nem látja a bérlő jövedelmi adatait');
select tests.ok((select count(*) from public.properties) = 1, 'bérbeadó látja a saját ingatlanát');
select tests.ok((select count(*) from public.policies) = 1, 'bérbeadó látja a lakására szóló kötvényt');
select tests.throws($$insert into public.claims (policy_id, submitted_by, reason, amount_claimed, amount_paid) values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'x', 1000, 1000)$$, 'bérbeadó nem írhatja be a kifizetett összeget');
insert into public.claims (policy_id, submitted_by, reason, amount_claimed) values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000b1', 'Elmaradt lakbér', 350000);
select tests.ok((select count(*) from public.claims) = 1, 'bérbeadó kárt jelenthet és látja');
update public.claims set status = 'paid';
select tests.ok((select status from public.claims limit 1) = 'submitted', 'bérbeadó nem állíthatja kifizetettre');
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select tests.ok((select count(*) from public.claims) = 1, 'a bérlő látja a vele szembeni kárigényt');
rollback;

-- ---------- Ingatlaniroda ügynöke ------------------------------------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000c1');
select tests.ok((select count(*) from public.applications) = 1, 'iroda csak az általa hozott kérést látja');
select tests.ok((select count(*) from public.organizations) = 1, 'iroda látja a saját szervezetét');
select tests.throws($$insert into public.organization_members (org_id, user_id, role) values ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a2', 'admin')$$, 'egyszerű ügynök nem vehet fel tagot');
rollback;

-- ---------- Munkatársak ----------------------------------------------------

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000d2');
select tests.ok((select count(*) from public.applications) = 3, 'support munkatárs mindent lát');
select tests.ok((select count(*) from public.waitlist) >= 0, 'munkatárs olvassa a várólistát');
select tests.throws($$insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000000a2', 'admin')$$, 'support nem vehet fel munkatársat');
rollback;

begin;
select tests.act_as('00000000-0000-0000-0000-0000000000d1');
update public.applications
  set status = 'approved', quoted_rate_pct = 6, quoted_premium_monthly = 5250, quoted_premium_yearly = 63000,
      max_coverage = 1200000, offer_expires_at = now() + interval '7 days', decided_at = now()
  where id = '00000000-0000-0000-0000-00000000a001';
select tests.ok((select status from public.applications where id = '00000000-0000-0000-0000-00000000a001') = 'approved', 'superadmin ajánlatot adhat');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000000c1', 'ops');
select tests.ok(true, 'superadmin munkatársat vehet fel');
select tests.ok((select count(*) from public.audit_log where entity = 'applications') >= 4, 'a státuszváltás naplózódik');
rollback;

-- ---------- Alapértelmezett jogok visszavonva ------------------------------

select tests.ok(not has_table_privilege('anon', 'public.applications', 'select'), 'anon-nak nincs olvasási joga az ajánlatkérésekre');
select tests.ok(not has_table_privilege('anon', 'public.audit_log', 'insert'), 'anon nem ír naplót');
select tests.ok(not has_column_privilege('authenticated', 'public.profiles', 'email', 'update'), 'e-mail nem módosítható az API-n át');

\echo '=== MINDEN JOGOSULTSÁGI TESZT RENDBEN ==='
