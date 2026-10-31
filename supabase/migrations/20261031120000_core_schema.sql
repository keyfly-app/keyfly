-- =====================================================================
-- Keyfly – alapséma
-- Egy adatbázis szolgálja ki: keyfly.app (publikus), app.keyfly.app
-- (bérlő / bérbeadó / közvetítő), admin.keyfly.app (Keyfly-munkatársak).
-- Ki mit lát: Row Level Security (lásd 20261031120100_rls.sql).
-- Pénzösszegek: egész forint (integer), időpontok: timestamptz (UTC).
-- =====================================================================

-- ---------- Típusok --------------------------------------------------

create type public.staff_role as enum ('superadmin', 'admin', 'ops', 'support');
create type public.org_type as enum ('agency', 'property_manager', 'company');
create type public.org_role as enum ('owner', 'admin', 'agent');
create type public.landlord_kind as enum ('private', 'company');
create type public.employment_type as enum ('employee', 'self_employed', 'student', 'retired', 'other');
create type public.application_status as enum (
  'draft',       -- a bérlő még tölti
  'submitted',   -- beküldte, ellenőrzésre vár
  'verifying',   -- jövedelem-ellenőrzés folyamatban
  'approved',    -- van ajánlat, elfogadásra vár
  'declined',    -- elutasítva
  'accepted',    -- a bérlő elfogadta, fizetésre vár / kötvény készül
  'expired',     -- az ajánlat lejárt
  'cancelled'    -- visszavonva
);
create type public.verification_method as enum ('open_banking', 'nav', 'employer', 'manual', 'dap');
create type public.verification_status as enum ('pending', 'passed', 'failed', 'expired');
create type public.policy_status as enum ('pending_payment', 'active', 'cancelled', 'ended', 'claimed');
create type public.billing_period as enum ('monthly', 'yearly');
create type public.claim_status as enum ('submitted', 'in_review', 'approved', 'paid', 'rejected', 'recovering', 'closed');
create type public.waitlist_segment as enum ('tenant', 'landlord', 'agent', 'company');

-- ---------- Közös segédfüggvények ------------------------------------

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

-- ---------- Felhasználók ---------------------------------------------

-- Minden bejelentkezett emberhez (bérlő, bérbeadó, közvetítő, munkatárs) egy profil.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  phone       text,
  birth_date  date,
  locale      text not null default 'hu' check (locale in ('hu', 'en')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'Egy sor minden auth.users felhasználóhoz. Regisztrációkor trigger hozza létre.';

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Keyfly belső munkatársai (admin.keyfly.app). Csak superadmin módosíthatja.
create table public.staff (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  role        public.staff_role not null default 'support',
  created_at  timestamptz not null default now()
);
comment on table public.staff is 'Keyfly-munkatársak. Aki itt szerepel, az admin felületet használhatja.';

-- Regisztrációkor automatikusan létrejön a profil.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Partnerek: ingatlaniroda, ingatlankezelő, cég -------------

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

-- ---------- Ingatlanok -----------------------------------------------

create table public.properties (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid references public.profiles (id) on delete set null,   -- magánszemély bérbeadó, ha regisztrált
  org_id          uuid references public.organizations (id) on delete set null, -- kezelő / iroda
  landlord_kind   public.landlord_kind not null default 'private',
  landlord_name   text,
  landlord_email  text,                       -- ide megy a fedezeti igazolás, ha a bérbeadó nem regisztrált
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

-- ---------- Ajánlatkérés (a weboldal 4 lépéses folyamata) -------------

create table public.applications (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references public.profiles (id) on delete cascade,
  property_id             uuid references public.properties (id) on delete set null,
  referred_by_org_id      uuid references public.organizations (id) on delete set null, -- melyik iroda hozta
  status                  public.application_status not null default 'draft',

  -- 1. lépés: a lakás
  monthly_rent            integer not null check (monthly_rent > 0),
  deposit_months          smallint not null default 3 check (deposit_months between 1 and 6),
  deposit_amount          integer generated always as (monthly_rent * deposit_months) stored,
  move_in_date            date,
  landlord_kind           public.landlord_kind not null default 'private',
  landlord_email          text,
  address_text            text,

  -- 2. lépés: rólad
  employment              public.employment_type,
  declared_net_income     integer check (declared_net_income >= 0),
  has_co_applicant        boolean not null default false,

  -- 4. lépés: ajánlat (csak a szerver / munkatárs írhatja)
  quoted_rate_pct         numeric(5, 2),
  quoted_premium_monthly  integer,
  quoted_premium_yearly   integer,
  max_coverage            integer,
  offer_expires_at        timestamptz,
  decision_reason         text,
  decided_at              timestamptz,

  source                  text,      -- pl. 'web', 'partner:<slug>', 'invite'
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

-- ---------- Ellenőrzések (open banking, NAV, munkáltatói igazolás) ----

create table public.verifications (
  id                uuid primary key default gen_random_uuid(),
  application_id    uuid not null references public.applications (id) on delete cascade,
  method            public.verification_method not null,
  provider          text,           -- pl. 'aggreg8', 'enable_banking'
  provider_ref      text,           -- a szolgáltató azonosítója (nem nyers banki adat)
  status            public.verification_status not null default 'pending',
  verified_income   integer,        -- havi nettó, amit az ellenőrzés igazolt
  summary           jsonb,          -- csak összesítés; nyers tranzakciót nem tárolunk
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);
create index verifications_application_idx on public.verifications (application_id);

-- ---------- Kötvények / fedezeti igazolások ---------------------------

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
  premium_amount      integer not null check (premium_amount > 0),  -- havi vagy éves díj a billing_period szerint
  start_date          date,
  end_date            date,
  insurer             text,           -- pl. 'Accelerant' – amíg nincs szerződés, üres
  insurer_policy_ref  text,
  certificate_path    text,           -- Storage: documents/<tenant_id>/...
  payment_provider    text,           -- 'barion' | 'stripe'
  payment_ref         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index policies_tenant_idx on public.policies (tenant_id);
create index policies_property_idx on public.policies (property_id);

create trigger policies_updated_at before update on public.policies
  for each row execute function public.set_updated_at();

-- ---------- Kárigények (a bérbeadó jelenti) ---------------------------

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

-- ---------- Hozzájárulások (GDPR, feltételek elfogadása) --------------

create table public.consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  kind         text not null,     -- 'terms', 'privacy', 'insurance_terms', 'marketing', 'open_banking'
  version      text not null,
  granted      boolean not null default true,
  created_at   timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id);

-- ---------- Várólista ("Hamarosan" oldal) ----------------------------

create table public.waitlist (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  segment            public.waitlist_segment not null default 'tenant',
  name               text check (length(name) <= 200),
  company            text check (length(company) <= 200),
  source             text check (length(source) <= 200),
  utm                jsonb,
  consent_marketing  boolean not null default false,
  created_at         timestamptz not null default now()
);
create unique index waitlist_email_segment_key on public.waitlist (lower(email), segment);

-- ---------- Napló --------------------------------------------------------

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
