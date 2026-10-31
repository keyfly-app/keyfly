# Keyfly

Deposit-replacement insurance for renters in Hungary, operated by Plattio Magyarország Kft.
One codebase, one database, three surfaces. Working rules: see `CLAUDE.md`.

| Host | Surface | Folder | Audience |
|---|---|---|---|
| `keyfly.app` (hu), `keyfly.app/en` | Public site: coming soon + waitlist, privacy notice, imprint | `src/app/(marketing)/[lang]` | everyone |
| `app.keyfly.app` | Customer app | `src/app/portal` | tenants, landlords, agencies |
| `admin.keyfly.app` | Back office | `src/app/admin` | Keyfly staff |
| `staging.`, `app-staging.`, `admin-staging.keyfly.app` | Staging (password-protected) | `staging` branch | team |

`src/proxy.ts` picks the surface by host (`src/lib/sites.ts`) and maps public URLs to `/[lang]/<page>` (`src/i18n/config.ts`).

## Single sources of truth

| What | Where |
|---|---|
| Company, contact and brand facts | `src/config/company.ts` |
| Consent text versions | `src/config/consent.ts` |
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

1. Sign in once at app.keyfly.app with the admin address (creates the account).
2. Supabase → `keyfly-prod` → SQL editor:
   ```sql
   insert into public.staff (user_id, role)
   select id, 'superadmin' from auth.users where email = 'admin@keyfly.app';
   ```

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
| `STAGING_BASIC_AUTH` | – | `user:password` |

The publishable key is public; RLS is what protects data. **Service-role keys never go into the repo or the browser.**

## Stack

Next.js 16 · React 19 · next-intl · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Resend · Vercel · GitHub Actions
