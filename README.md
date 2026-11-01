# Keyfly

Deposit-replacement insurance for renters in Hungary, operated by Plattio Magyarország Kft.
One codebase, one database, three surfaces. Working rules: see `CLAUDE.md`.

| Host | Surface | Folder | Audience |
|---|---|---|---|
| `keyfly.app` (hu), `keyfly.app/en` | Public site: coming soon + waitlist, privacy notice, imprint | `src/app/(marketing)/[lang]` | everyone |
| `app.keyfly.app` | Customer app | `src/app/portal` | tenants, landlords, agencies |
| `admin.keyfly.app` | Back office | `src/app/admin` | Keyfly staff |
| `staging.`, `app-staging.`, `admin-staging.keyfly.app` | Staging (Vercel login required) | `staging` branch | team |

`src/proxy.ts` picks the surface by host (`src/lib/sites.ts`) and maps public URLs to `/[lang]/<page>` (`src/i18n/config.ts`).

## Single sources of truth

| What | Where |
|---|---|
| Company, contact and brand facts | `src/config/company.ts` |
| Consent text versions | `src/config/consent.ts` |
| Newsletter lists (Resend segments per language) | `src/config/newsletter.ts` |
| Design tokens (colours, fonts) | `src/app/globals.css` (`@theme`) – mirrors the Keyfly design system |
| All UI copy, Hungarian + English | `messages/hu.json`, `messages/en.json` (keys must match: `npm run i18n:check`) |
| Number, money and date formats | `src/lib/format.ts` |
| Legal documents (privacy notice, imprint), hosting provider | `src/content/legal/` |

## Environments

| | Production | Staging |
|---|---|---|
| Branch | `main` | `staging` |
| Supabase | `keyfly-prod` (`hieyofnjtrqnffzebxgg`) | `keyfly-staging` (`doriyqslvarvucbwlczq`) |
| Region | EU – Frankfurt | EU – Frankfurt |
| Vercel | Production | Preview (every non-`main` branch) |

Flow: branch from `staging` → PR into `staging` (CI) → test on staging.keyfly.app → PR into `main` → live.

## Database

- Schema in `supabase/migrations/` – every change is a new migration; never edit an applied one.
- Row Level Security on every table; nothing is visible unless a policy grants it.
- Offer fields and decisions are written only by staff or the server (also enforced by a trigger).
- Tests: `supabase/tests/rls.test.sql`, runnable on any empty Postgres:
  `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres npm run db:test`

### First superadmin

1. Create an account at app.keyfly.app/register with the admin address and confirm the email.
2. Supabase → `keyfly-prod` → SQL editor:
   ```sql
   insert into public.staff (user_id, role)
   select id, 'superadmin' from auth.users where email = 'admin@keyfly.app';
   ```

### Sign-in (customer app and admin)

- Customer app: email + password (rules in `src/config/auth.ts`), one-time email link for existing accounts; Google is
  prepared behind `AUTH_METHODS.google`. Sign-up stores the accepted terms/privacy versions (`src/config/consent.ts`).
- Admin: email + password, then a TOTP code (Supabase MFA); the first sign-in sets up the authenticator at `/mfa`.
  Every admin page needs aal2 (enforced in `src/proxy.ts`). Admin never creates accounts on its own: staff create theirs
  from the invitation at `/invite/<token>` (address fixed by the invitation). A super admin can reset a colleague's
  2FA on `/staff` (`reset_staff_mfa`: removes the factor, signs them out everywhere; never one's own).
- Email links land on `/auth/confirm` (token hash, works in any browser); OAuth on `/auth/callback`.
- Auth emails: `npm run email:auth` builds `supabase/templates/*.html` and `subjects.json` from `messages/*.json`
  (`authEmails`) and `src/config/company.ts`. Each template holds both languages (user metadata `locale`); paste them
  into Supabase → Authentication → Emails → Templates. Links need the app's redirect (`{{ .RedirectTo }}` with `?next=`),
  so emails triggered from the Supabase dashboard itself won't work – use the app.
- Supabase Auth settings per project: Site URL, redirect URLs (`https://app…/auth/confirm`, `…/auth/callback`, preview and
  localhost equivalents), the templates above, MFA TOTP enabled, password requirements matching `src/config/auth.ts`
  (lowercase, uppercase letters and digits), leaked-password protection, email link expiry 24 h, custom SMTP (Resend).

### Invitations and lease requests

- Every invitation is created by a database function (it returns the one-time token) and emailed by the app in the
  sender's language: `src/features/invitations/send.ts` (team member, tenant, co-tenant/occupant, staff),
  `src/features/lease-requests/actions.ts` (the tenant invites the landlord, reminders, outcome emails to the tenant).
  Templates: `src/features/invitations/emails.ts`, copy in `invitationEmails.*`. Without `RESEND_API_KEY` nothing is sent.
- The tenant invites the landlord: `/lease-requests/new` → the landlord opens `/invite/<token>`, picks the managing
  account and the property, checks the terms → unchanged terms confirm the lease, changed ones go back to the tenant
  (`/lease-requests/<id>`). Rules and states: migration `20261101130100_lease_requests.sql`.

### Automatic migrations

`.github/workflows/db-deploy.yml` pushes migrations on `main` to production and on `staging` to staging. It needs GitHub
secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD_PROD`, `SUPABASE_DB_PASSWORD_STAGING`; without them the step is skipped.

## Local development

```bash
npm install
cp .env.example .env.local      # points at staging Supabase
npm run dev
```

http://localhost:3000 (hu), http://localhost:3000/en, http://app.localhost:3000, http://admin.localhost:3000.
On Vercel preview URLs (`*.vercel.app`) the app surfaces live under `/portal` and `/admin`.

## Environment variables (Vercel)

| Name | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | prod URL | staging URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | prod publishable key | staging publishable key |
| `NEXT_PUBLIC_APP_ENV` | `production` | `staging` |
| `RESEND_API_KEY` | Resend key (newsletter sync, invitation and lease emails), sensitive | optional: staging key for invitation and lease emails (the newsletter sync runs only when `NEXT_PUBLIC_APP_ENV` is `production`) |

The publishable key is public; RLS is what protects data. **Service-role keys never go into the repo or the browser.**

## Stack

Next.js 16 · React 19 · next-intl · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Resend · Vercel · GitHub Actions
