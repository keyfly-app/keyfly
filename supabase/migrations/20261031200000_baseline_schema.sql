-- =====================================================================
-- Keyfly – baseline schema
-- One database serves every surface: keyfly.app (public), app.keyfly.app
-- (tenants, landlords, agencies) and admin.keyfly.app (Keyfly staff).
-- Access control lives in Row Level Security (see *_baseline_rls.sql).
-- Money: whole HUF as integer. Time: timestamptz (stored in UTC).
-- =====================================================================

-- ---------- Enums ------------------------------------------------------

create type public.staff_role as enum ('superadmin', 'admin', 'ops', 'support');
create type public.org_type as enum ('agency', 'property_manager', 'company');
create type public.org_role as enum ('owner', 'admin', 'agent');
create type public.landlord_kind as enum ('private', 'company');
create type public.employment_type as enum ('employee', 'self_employed', 'student', 'retired', 'other');
create type public.application_status as enum (
  'draft',       -- tenant is still filling it in
  'submitted',   -- sent, waiting for checks
  'verifying',   -- income check in progress
  'approved',    -- offer ready, waiting for the tenant
  'declined',
  'accepted',    -- tenant accepted, payment / policy issuance pending
  'expired',     -- offer expired
  'cancelled'
);
create type public.verification_method as enum ('open_banking', 'nav', 'employer', 'manual', 'dap');
create type public.verification_status as enum ('pending', 'passed', 'failed', 'expired');
create type public.policy_status as enum ('pending_payment', 'active', 'cancelled', 'ended', 'claimed');
create type public.billing_period as enum ('monthly', 'yearly');
create type public.claim_status as enum ('submitted', 'in_review', 'approved', 'paid', 'rejected', 'recovering', 'closed');
create type public.waitlist_segment as enum ('tenant', 'landlord', 'agent', 'company');
create type public.locale as enum ('hu', 'en');

-- ---------- Shared helpers --------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- People ------------------------------------------------------

-- One row per signed-in person (tenant, landlord, agent or staff).
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  phone       text,
  birth_date  date,
  locale      public.locale not null default 'hu',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'One row per auth.users row, created by trigger on sign-up.';

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Keyfly staff (admin.keyfly.app). Only a superadmin can change this table.
create table public.staff (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  role        public.staff_role not null default 'support',
  created_at  timestamptz not null default now()
);
comment on table public.staff is 'Keyfly staff members; presence here grants access to the admin surface.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone, locale)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en'::public.locale else 'hu'::public.locale end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Partners: agencies, property managers, companies ----------

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        public.org_type not null,
  tax_number  text,
  email       text,
  phone       text,
  address     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.organization_members (
  org_id      uuid not null references public.organizations (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.org_role not null default 'agent',
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

-- ---------- Properties ----------------------------------------------------

create table public.properties (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid references public.profiles (id) on delete set null,      -- private landlord, if registered
  org_id          uuid references public.organizations (id) on delete set null, -- managing agency / company
  landlord_kind   public.landlord_kind not null default 'private',
  landlord_name   text,
  landlord_email  text,          -- coverage certificate goes here if the landlord is not registered
  postal_code     text,
  city            text not null default 'Budapest',
  address_line    text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index properties_owner_idx on public.properties (owner_user_id);
create index properties_org_idx on public.properties (org_id);

create trigger properties_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

-- ---------- Quote requests (the 4-step flow) ----------------------------

create table public.applications (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references public.profiles (id) on delete cascade,
  property_id             uuid references public.properties (id) on delete set null,
  referred_by_org_id      uuid references public.organizations (id) on delete set null,
  status                  public.application_status not null default 'draft',

  -- step 1: the home
  monthly_rent            integer not null check (monthly_rent > 0),
  deposit_months          smallint not null default 3 check (deposit_months between 1 and 6),
  deposit_amount          integer generated always as (monthly_rent * deposit_months) stored,
  move_in_date            date,
  landlord_kind           public.landlord_kind not null default 'private',
  landlord_email          text,
  address_text            text,

  -- step 2: about you
  employment              public.employment_type,
  declared_net_income     integer check (declared_net_income >= 0),
  has_co_applicant        boolean not null default false,

  -- step 4: offer (written by staff or the server only)
  quoted_rate_pct         numeric(5, 2),
  quoted_premium_monthly  integer,
  quoted_premium_yearly   integer,
  max_coverage            integer,
  offer_expires_at        timestamptz,
  decision_reason         text,
  decided_at              timestamptz,

  locale                  public.locale not null default 'hu',
  source                  text,      -- e.g. 'web', 'partner:<slug>', 'invite'
  utm                     jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index applications_tenant_idx on public.applications (tenant_id);
create index applications_property_idx on public.applications (property_id);
create index applications_org_idx on public.applications (referred_by_org_id);
create index applications_status_idx on public.applications (status);

create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

-- ---------- Income checks (open banking, NAV, employer certificate) -----

create table public.verifications (
  id                uuid primary key default gen_random_uuid(),
  application_id    uuid not null references public.applications (id) on delete cascade,
  method            public.verification_method not null,
  provider          text,           -- e.g. 'aggreg8', 'enable_banking'
  provider_ref      text,           -- provider reference, never raw bank data
  status            public.verification_status not null default 'pending',
  verified_income   integer,        -- monthly net income confirmed by the check
  summary           jsonb,          -- summary only; raw transactions are never stored
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);
create index verifications_application_idx on public.verifications (application_id);

-- ---------- Policies / coverage certificates ----------------------------

create sequence public.policy_number_seq start 1001;

create table public.policies (
  id                  uuid primary key default gen_random_uuid(),
  policy_number       text not null unique
                        default ('KF-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.policy_number_seq')::text, 6, '0')),
  application_id      uuid not null unique references public.applications (id) on delete restrict,
  tenant_id           uuid not null references public.profiles (id) on delete restrict,
  property_id         uuid references public.properties (id) on delete set null,
  status              public.policy_status not null default 'pending_payment',
  coverage_amount     integer not null check (coverage_amount > 0),
  billing_period      public.billing_period not null default 'monthly',
  premium_amount      integer not null check (premium_amount > 0),  -- per billing_period
  start_date          date,
  end_date            date,
  insurer             text,           -- insurer partner; configuration, not code
  insurer_policy_ref  text,
  certificate_path    text,           -- storage: documents/<tenant_id>/...
  payment_provider    text,           -- 'barion' | 'stripe'
  payment_ref         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index policies_tenant_idx on public.policies (tenant_id);
create index policies_property_idx on public.policies (property_id);

create trigger policies_updated_at before update on public.policies
  for each row execute function public.set_updated_at();

-- ---------- Claims (filed by the landlord side) ---------------------------

create table public.claims (
  id              uuid primary key default gen_random_uuid(),
  policy_id       uuid not null references public.policies (id) on delete restrict,
  submitted_by    uuid not null references public.profiles (id) on delete restrict,
  status          public.claim_status not null default 'submitted',
  reason          text not null,
  amount_claimed  integer not null check (amount_claimed > 0),
  amount_paid     integer check (amount_paid >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index claims_policy_idx on public.claims (policy_id);

create trigger claims_updated_at before update on public.claims
  for each row execute function public.set_updated_at();

-- ---------- Consents (GDPR, terms acceptance) -----------------------------

create table public.consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  kind         text not null,     -- 'terms', 'privacy', 'insurance_terms', 'marketing', 'open_banking'
  version      text not null,
  granted      boolean not null default true,
  created_at   timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id);

-- ---------- Waitlist ("coming soon" page) -------------------------------
-- Single opt-in. Consent proof = timestamp + the exact text version accepted.

create table public.waitlist (
  id                         uuid primary key default gen_random_uuid(),
  email                      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  segment                    public.waitlist_segment not null default 'tenant',
  locale                     public.locale not null default 'hu',
  privacy_notice_version     text not null,
  marketing_consent          boolean not null default false,
  marketing_consent_version  text,     -- text version of the newsletter checkbox, when ticked
  source                     text check (length(source) <= 200),
  utm                        jsonb,
  email_provider_contact_id  text,     -- newsletter contact id (Resend), set by the server
  created_at                 timestamptz not null default now(),
  check (marketing_consent = false or marketing_consent_version is not null)
);
create unique index waitlist_email_segment_key on public.waitlist (lower(email), segment);

-- ---------- Audit log -----------------------------------------------------

create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  data        jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

create or replace function public.log_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, data)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(new.id, old.id),
    case
      when tg_op = 'UPDATE' then jsonb_build_object('old_status', to_jsonb(old) -> 'status', 'new_status', to_jsonb(new) -> 'status')
      else null
    end
  );
  return coalesce(new, old);
end;
$$;

create trigger applications_audit after insert or update or delete on public.applications
  for each row execute function public.log_change();
create trigger policies_audit after insert or update or delete on public.policies
  for each row execute function public.log_change();
create trigger claims_audit after insert or update or delete on public.claims
  for each row execute function public.log_change();
