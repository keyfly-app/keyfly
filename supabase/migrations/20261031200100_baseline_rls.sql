-- =====================================================================
-- Keyfly – access control (Row Level Security)
--
-- Principle: nobody sees anything by default; every access is granted by a policy.
--   * tenant          – own profile, quote requests, policies and claims against them
--   * landlord        – own properties, policies on them, may file claims
--   * agency/manager  – organisation's properties and the quote requests it referred
--   * staff           – everything (staff table); managing staff is superadmin-only
-- The server's service_role key bypasses RLS and is only ever used server-side.
-- =====================================================================

-- Helpers live in a schema that the Data API does not expose.
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.user_id = (select auth.uid()));
$$;

create or replace function private.has_staff_role(roles public.staff_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s where s.user_id = (select auth.uid()) and s.role = any (roles)
  );
$$;

create or replace function private.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m where m.org_id = org and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_org_admin(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = org and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')
  );
$$;

-- Landlord-side access to a property: owner or member of the managing organisation.
create or replace function private.can_manage_property(prop uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.properties p
    where p.id = prop
      and (p.owner_user_id = (select auth.uid()) or (p.org_id is not null and private.is_org_member(p.org_id)))
  );
$$;

-- Who may see a policy: the tenant, the landlord side, the referring agency, staff.
create or replace function private.can_view_policy(pol uuid)
returns boolean language sql stable security definer set search_path = '' as $$
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

-- Only the landlord side (never the tenant) may file a claim on an active policy.
create or replace function private.can_claim_policy(pol uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.policies p
    where p.id = pol and p.status = 'active' and p.property_id is not null
      and private.can_manage_property(p.property_id)
  );
$$;

-- True for Data API roles (anon / authenticated), false for the server and migrations.
create or replace function private.is_api_user()
returns boolean language sql stable set search_path = '' as $$
  select current_user in ('anon', 'authenticated');
$$;

grant execute on all functions in schema private to authenticated;

-- ---------- Baseline: API roles get only what is granted below -----------

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

create policy "profiles_select_own_or_staff" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.is_staff());
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------- staff -------------------------------------------------------

grant select, insert, update, delete on public.staff to authenticated;

create policy "staff_select_self_or_staff" on public.staff for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());
create policy "staff_insert_superadmin" on public.staff for insert to authenticated
  with check (private.has_staff_role(array['superadmin']::public.staff_role[]));
create policy "staff_update_superadmin" on public.staff for update to authenticated
  using (private.has_staff_role(array['superadmin']::public.staff_role[]))
  with check (private.has_staff_role(array['superadmin']::public.staff_role[]));
create policy "staff_delete_superadmin" on public.staff for delete to authenticated
  using (private.has_staff_role(array['superadmin']::public.staff_role[]));

-- ---------- organizations ----------------------------------------------

grant select, insert on public.organizations to authenticated;
grant update (name, tax_number, email, phone, address) on public.organizations to authenticated;

create policy "organizations_select_member_or_staff" on public.organizations for select to authenticated
  using (private.is_org_member(id) or private.is_staff());
create policy "organizations_insert_staff" on public.organizations for insert to authenticated
  with check (private.is_staff());
create policy "organizations_update_org_admin_or_staff" on public.organizations for update to authenticated
  using (private.is_org_admin(id) or private.is_staff())
  with check (private.is_org_admin(id) or private.is_staff());

-- ---------- organization_members ---------------------------------------

grant select, insert, delete on public.organization_members to authenticated;
grant update (role) on public.organization_members to authenticated;

create policy "members_select_same_org_or_staff" on public.organization_members for select to authenticated
  using (private.is_org_member(org_id) or private.is_staff());
create policy "members_insert_org_admin_or_staff" on public.organization_members for insert to authenticated
  with check (private.is_org_admin(org_id) or private.is_staff());
create policy "members_update_org_admin_or_staff" on public.organization_members for update to authenticated
  using (private.is_org_admin(org_id) or private.is_staff())
  with check (private.is_org_admin(org_id) or private.is_staff());
create policy "members_delete_org_admin_or_staff" on public.organization_members for delete to authenticated
  using (private.is_org_admin(org_id) or private.is_staff());

-- ---------- properties --------------------------------------------------

grant select, insert on public.properties to authenticated;
grant update (landlord_kind, landlord_name, landlord_email, postal_code, city, address_line)
  on public.properties to authenticated;

create policy "properties_select_landlord_side_or_staff" on public.properties for select to authenticated
  using (
    owner_user_id = (select auth.uid())
    or (org_id is not null and private.is_org_member(org_id))
    or private.is_staff()
  );
create policy "properties_insert_landlord_or_org" on public.properties for insert to authenticated
  with check (
    private.is_staff()
    or (owner_user_id = (select auth.uid()) and org_id is null)
    or (org_id is not null and private.is_org_member(org_id) and owner_user_id is null)
  );
create policy "properties_update_landlord_side_or_staff" on public.properties for update to authenticated
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
-- Tenants edit their own request while 'draft' or 'submitted'.
-- Offer fields and later statuses are written by staff or the server only.
-- Landlords never see a tenant's income; they see the policy instead.

grant select, insert, update on public.applications to authenticated;

create policy "applications_select_tenant_agency_staff" on public.applications for select to authenticated
  using (
    tenant_id = (select auth.uid())
    or (referred_by_org_id is not null and private.is_org_member(referred_by_org_id))
    or private.is_staff()
  );
create policy "applications_insert_own" on public.applications for insert to authenticated
  with check (
    (tenant_id = (select auth.uid()) and status in ('draft', 'submitted'))
    or private.is_staff()
  );
create policy "applications_update_own_until_submitted" on public.applications for update to authenticated
  using (
    (tenant_id = (select auth.uid()) and status in ('draft', 'submitted'))
    or private.is_staff()
  )
  with check (
    (tenant_id = (select auth.uid()) and status in ('draft', 'submitted', 'cancelled'))
    or private.is_staff()
  );

-- Protected columns: tenants can't change the offer, the decision, the tenant or the referrer.
create or replace function private.guard_application()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not private.is_api_user() or private.is_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.quoted_rate_pct is not null or new.quoted_premium_monthly is not null
       or new.quoted_premium_yearly is not null or new.max_coverage is not null
       or new.offer_expires_at is not null or new.decision_reason is not null
       or new.decided_at is not null then
      raise exception 'offer_fields_are_server_only' using errcode = '42501';
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
    raise exception 'protected_field_change' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger applications_guard before insert or update on public.applications
  for each row execute function private.guard_application();

-- ---------- verifications ----------------------------------------------

grant select, insert, update on public.verifications to authenticated;

create policy "verifications_select_own_or_staff" on public.verifications for select to authenticated
  using (
    private.is_staff()
    or exists (select 1 from public.applications a where a.id = application_id and a.tenant_id = (select auth.uid()))
  );
create policy "verifications_insert_staff" on public.verifications for insert to authenticated
  with check (private.is_staff());
create policy "verifications_update_staff" on public.verifications for update to authenticated
  using (private.is_staff()) with check (private.is_staff());

-- ---------- policies ----------------------------------------------------

grant select, insert, update on public.policies to authenticated;

create policy "policies_select_parties" on public.policies for select to authenticated
  using (private.can_view_policy(id));
create policy "policies_insert_staff" on public.policies for insert to authenticated
  with check (private.is_staff());
create policy "policies_update_staff" on public.policies for update to authenticated
  using (private.is_staff()) with check (private.is_staff());

-- ---------- claims ------------------------------------------------------

grant select, insert, update on public.claims to authenticated;

create policy "claims_select_policy_parties" on public.claims for select to authenticated
  using (private.can_view_policy(policy_id));
create policy "claims_insert_landlord_side" on public.claims for insert to authenticated
  with check (
    private.is_staff()
    or (
      submitted_by = (select auth.uid())
      and status = 'submitted'
      and amount_paid is null
      and private.can_claim_policy(policy_id)
    )
  );
create policy "claims_update_staff" on public.claims for update to authenticated
  using (private.is_staff()) with check (private.is_staff());

-- ---------- consents ----------------------------------------------------

grant select, insert on public.consents to authenticated;

create policy "consents_select_own_or_staff" on public.consents for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());
create policy "consents_insert_own" on public.consents for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ---------- waitlist ----------------------------------------------------
-- Anyone can sign up; only staff can read or delete (GDPR erasure).

grant insert (email, segment, locale, privacy_notice_version, marketing_consent, marketing_consent_version, source, utm)
  on public.waitlist to anon, authenticated;
grant select, delete on public.waitlist to authenticated;

create policy "waitlist_insert_anyone" on public.waitlist for insert to anon, authenticated
  with check (true);
create policy "waitlist_select_staff" on public.waitlist for select to authenticated
  using (private.is_staff());
create policy "waitlist_delete_staff" on public.waitlist for delete to authenticated
  using (private.is_staff());

-- ---------- audit_log ---------------------------------------------------

grant select on public.audit_log to authenticated;

create policy "audit_log_select_staff" on public.audit_log for select to authenticated
  using (private.is_staff());
