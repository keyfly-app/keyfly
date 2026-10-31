-- =====================================================================
-- Keyfly – jogosultságok (Row Level Security)
--
-- Elv: alapból senki nem lát semmit; minden hozzáférést egy policy ad.
--   * bérlő        – a saját profilja, ajánlatkérései, kötvényei, kárai
--   * bérbeadó     – a saját ingatlanai, az azokra szóló kötvények és kárigények
--   * iroda/kezelő – a szervezete ingatlanai, az általa hozott ajánlatkérések
--   * munkatárs    – minden (staff tábla), a staff-kezelés csak superadminnak
-- A szerver (service_role kulcs) megkerüli az RLS-t – csak szerveroldalon használjuk.
-- =====================================================================

-- A segédfüggvények külön sémában vannak, így nem hívhatók az API-ból.
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff s where s.user_id = (select auth.uid()));
$$;

create or replace function private.has_staff_role(roles public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = (select auth.uid()) and s.role = any (roles)
  );
$$;

create or replace function private.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = org and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_org_admin(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = org and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')
  );
$$;

-- Bérbeadó-oldali hozzáférés egy ingatlanhoz: tulajdonos vagy a kezelő szervezet tagja.
create or replace function private.can_manage_property(prop uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.properties p
    where p.id = prop
      and (
        p.owner_user_id = (select auth.uid())
        or (p.org_id is not null and private.is_org_member(p.org_id))
      )
  );
$$;

-- Ki láthat egy kötvényt: a bérlő, a bérbeadó oldal, a közvetítő iroda, a munkatárs.
create or replace function private.can_view_policy(pol uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.policies p
    join public.applications a on a.id = p.application_id
    where p.id = pol
      and (
        p.tenant_id = (select auth.uid())
        or (p.property_id is not null and private.can_manage_property(p.property_id))
        or (a.referred_by_org_id is not null and private.is_org_member(a.referred_by_org_id))
        or private.is_staff()
      )
  );
$$;

-- Bérbeadó-oldal (nem a bérlő) jelenthet kárt a kötvényre.
create or replace function private.can_claim_policy(pol uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.policies p
    where p.id = pol
      and p.status = 'active'
      and p.property_id is not null
      and private.can_manage_property(p.property_id)
  );
$$;

-- Az API-szerepkör (anon / authenticated) kérése-e, vagy szerver / migráció.
create or replace function private.is_api_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('anon', 'authenticated');
$$;

grant execute on all functions in schema private to authenticated;

-- ---------- Alap: az API-szerepkörök jogait mi adjuk meg tételesen ------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_change() from public, anon, authenticated;

alter table public.profiles             enable row level security;
alter table public.staff                enable row level security;
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.properties           enable row level security;
alter table public.applications         enable row level security;
alter table public.verifications        enable row level security;
alter table public.policies             enable row level security;
alter table public.claims               enable row level security;
alter table public.consents             enable row level security;
alter table public.waitlist             enable row level security;
alter table public.audit_log            enable row level security;

-- ---------- profiles ----------------------------------------------------

grant select on public.profiles to authenticated;
grant update (full_name, phone, birth_date, locale) on public.profiles to authenticated;

create policy "profiles: saját vagy munkatárs olvassa"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.is_staff());

create policy "profiles: saját módosítás"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------- staff -------------------------------------------------------

grant select, insert, update, delete on public.staff to authenticated;

create policy "staff: munkatársak látják"
  on public.staff for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());

create policy "staff: csak superadmin kezeli (insert)"
  on public.staff for insert to authenticated
  with check (private.has_staff_role(array['superadmin']::public.staff_role[]));

create policy "staff: csak superadmin kezeli (update)"
  on public.staff for update to authenticated
  using (private.has_staff_role(array['superadmin']::public.staff_role[]))
  with check (private.has_staff_role(array['superadmin']::public.staff_role[]));

create policy "staff: csak superadmin kezeli (delete)"
  on public.staff for delete to authenticated
  using (private.has_staff_role(array['superadmin']::public.staff_role[]));

-- ---------- organizations ----------------------------------------------

grant select, insert on public.organizations to authenticated;
grant update (name, tax_number, email, phone, address) on public.organizations to authenticated;

create policy "organizations: tagok és munkatársak látják"
  on public.organizations for select to authenticated
  using (private.is_org_member(id) or private.is_staff());

create policy "organizations: munkatárs hozza létre"
  on public.organizations for insert to authenticated
  with check (private.is_staff());

create policy "organizations: szervezeti admin vagy munkatárs módosítja"
  on public.organizations for update to authenticated
  using (private.is_org_admin(id) or private.is_staff())
  with check (private.is_org_admin(id) or private.is_staff());

-- ---------- organization_members ---------------------------------------

grant select, insert, delete on public.organization_members to authenticated;
grant update (role) on public.organization_members to authenticated;

create policy "members: a szervezet tagjai látják egymást"
  on public.organization_members for select to authenticated
  using (private.is_org_member(org_id) or private.is_staff());

create policy "members: szervezeti admin vagy munkatárs hív meg"
  on public.organization_members for insert to authenticated
  with check (private.is_org_admin(org_id) or private.is_staff());

create policy "members: szervezeti admin vagy munkatárs módosít"
  on public.organization_members for update to authenticated
  using (private.is_org_admin(org_id) or private.is_staff())
  with check (private.is_org_admin(org_id) or private.is_staff());

create policy "members: szervezeti admin vagy munkatárs töröl"
  on public.organization_members for delete to authenticated
  using (private.is_org_admin(org_id) or private.is_staff());

-- ---------- properties --------------------------------------------------

grant select, insert on public.properties to authenticated;
grant update (landlord_kind, landlord_name, landlord_email, postal_code, city, address_line)
  on public.properties to authenticated;

create policy "properties: bérbeadó oldal és munkatárs látja"
  on public.properties for select to authenticated
  using (
    owner_user_id = (select auth.uid())
    or (org_id is not null and private.is_org_member(org_id))
    or private.is_staff()
  );

create policy "properties: bérbeadó vagy iroda veszi fel"
  on public.properties for insert to authenticated
  with check (
    private.is_staff()
    or (owner_user_id = (select auth.uid()) and org_id is null)
    or (org_id is not null and private.is_org_member(org_id) and owner_user_id is null)
  );

create policy "properties: bérbeadó oldal és munkatárs módosítja"
  on public.properties for update to authenticated
  using (
    owner_user_id = (select auth.uid())
    or (org_id is not null and private.is_org_member(org_id))
    or private.is_staff()
  )
  with check (
    owner_user_id = (select auth.uid())
    or (org_id is not null and private.is_org_member(org_id))
    or private.is_staff()
  );

-- ---------- applications ------------------------------------------------
-- A bérlő a saját kérését tölti, amíg 'draft' vagy 'submitted'.
-- Az ajánlatot (díj, döntés, státusz tovább) csak munkatárs vagy a szerver írja.
-- A bérbeadó NEM látja a bérlő jövedelmét – ő a kötvényt látja.

grant select, insert, update on public.applications to authenticated;

create policy "applications: bérlő, közvetítő iroda, munkatárs látja"
  on public.applications for select to authenticated
  using (
    tenant_id = (select auth.uid())
    or (referred_by_org_id is not null and private.is_org_member(referred_by_org_id))
    or private.is_staff()
  );

create policy "applications: bérlő a saját nevében indít"
  on public.applications for insert to authenticated
  with check (
    (tenant_id = (select auth.uid()) and status in ('draft', 'submitted'))
    or private.is_staff()
  );

create policy "applications: bérlő beküldésig, munkatárs mindig"
  on public.applications for update to authenticated
  using (
    (tenant_id = (select auth.uid()) and status in ('draft', 'submitted'))
    or private.is_staff()
  )
  with check (
    (tenant_id = (select auth.uid()) and status in ('draft', 'submitted', 'cancelled'))
    or private.is_staff()
  );

-- Védett mezők: a bérlő nem írhatja át a díjat, a döntést, a bérlőt vagy a közvetítőt.
create or replace function private.guard_application()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_api_user() or private.is_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.quoted_rate_pct is not null or new.quoted_premium_monthly is not null
       or new.quoted_premium_yearly is not null or new.max_coverage is not null
       or new.offer_expires_at is not null or new.decision_reason is not null
       or new.decided_at is not null then
      raise exception 'Az ajánlat mezőit csak a Keyfly töltheti ki.' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.tenant_id is distinct from old.tenant_id
     or new.referred_by_org_id is distinct from old.referred_by_org_id
     or new.quoted_rate_pct is distinct from old.quoted_rate_pct
     or new.quoted_premium_monthly is distinct from old.quoted_premium_monthly
     or new.quoted_premium_yearly is distinct from old.quoted_premium_yearly
     or new.max_coverage is distinct from old.max_coverage
     or new.offer_expires_at is distinct from old.offer_expires_at
     or new.decision_reason is distinct from old.decision_reason
     or new.decided_at is distinct from old.decided_at then
    raise exception 'Ezt a mezőt csak a Keyfly módosíthatja.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger applications_guard before insert or update on public.applications
  for each row execute function private.guard_application();

-- ---------- verifications ----------------------------------------------
-- Csak a szerver (service_role) vagy munkatárs írja; a bérlő látja a saját eredményét.

grant select, insert, update on public.verifications to authenticated;

create policy "verifications: bérlő a sajátját, munkatárs mindet látja"
  on public.verifications for select to authenticated
  using (
    private.is_staff()
    or exists (
      select 1 from public.applications a
      where a.id = application_id and a.tenant_id = (select auth.uid())
    )
  );

create policy "verifications: munkatárs rögzít"
  on public.verifications for insert to authenticated
  with check (private.is_staff());

create policy "verifications: munkatárs módosít"
  on public.verifications for update to authenticated
  using (private.is_staff())
  with check (private.is_staff());

-- ---------- policies (kötvények) ---------------------------------------

grant select, insert, update on public.policies to authenticated;

create policy "policies: érintettek látják"
  on public.policies for select to authenticated
  using (private.can_view_policy(id));

create policy "policies: munkatárs hoz létre"
  on public.policies for insert to authenticated
  with check (private.is_staff());

create policy "policies: munkatárs módosít"
  on public.policies for update to authenticated
  using (private.is_staff())
  with check (private.is_staff());

-- ---------- claims (kárigények) ----------------------------------------

grant select, insert, update on public.claims to authenticated;

create policy "claims: a kötvény érintettjei látják"
  on public.claims for select to authenticated
  using (private.can_view_policy(policy_id));

create policy "claims: bérbeadó oldal jelenti"
  on public.claims for insert to authenticated
  with check (
    private.is_staff()
    or (
      submitted_by = (select auth.uid())
      and status = 'submitted'
      and amount_paid is null
      and private.can_claim_policy(policy_id)
    )
  );

create policy "claims: munkatárs kezeli"
  on public.claims for update to authenticated
  using (private.is_staff())
  with check (private.is_staff());

-- ---------- consents ----------------------------------------------------

grant select, insert on public.consents to authenticated;

create policy "consents: saját olvasás"
  on public.consents for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());

create policy "consents: saját rögzítés"
  on public.consents for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ---------- waitlist ----------------------------------------------------
-- Bárki feliratkozhat (anon is), de olvasni csak munkatárs tud.

grant insert (email, segment, name, company, source, utm, consent_marketing)
  on public.waitlist to anon, authenticated;
grant select, delete on public.waitlist to authenticated;

create policy "waitlist: bárki feliratkozhat"
  on public.waitlist for insert to anon, authenticated
  with check (true);

create policy "waitlist: munkatárs látja"
  on public.waitlist for select to authenticated
  using (private.is_staff());

create policy "waitlist: munkatárs töröl (GDPR)"
  on public.waitlist for delete to authenticated
  using (private.is_staff());

-- ---------- audit_log ---------------------------------------------------

grant select on public.audit_log to authenticated;

create policy "audit_log: munkatárs látja"
  on public.audit_log for select to authenticated
  using (private.is_staff());
