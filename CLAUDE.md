# Keyfly – working rules

Operator: Plattio Magyarország Kft. Product: Keyfly (deposit alternative for renters, Hungary).
Full handbook (Hungarian, source of truth for decisions, glossary, legal status):
https://claude.ai/artifact/AttVCwnk4JJP3kqG7mV1Ns

## Non-negotiables
- **English everywhere in development**: code, identifiers, DB tables/columns/policies, comments, tests, commits, PRs.
  We talk in Hungarian; the product is bilingual.
- **Every UI is bilingual** (hu default at `/`, en at `/en`). No user-facing string in components – all copy comes
  from message files by key, both languages filled. Use the handbook glossary for terms.
- **Single source of truth**: company data, brand tokens and copy each live in one central file. Never hardcode.
- **Design and copy first**: every feature – and every change the owner asks for – is first shown in the Keyfly
  design canvas (desktop 1440 + mobile 390, all states, both languages, final wording) and coded only after the
  owner has reviewed and approved it. Use only design-system tokens (`globals.css`) and components.
- **Enterprise fintech UI/UX**: every screen must look and behave like a top-tier fintech product (precise
  spacing, real loading/empty/error states, no raw browser defaults). Every task list ends with a UI/UX check
  of the screens touched, on desktop and on a phone, before the owner sees them.
- **Back office = "App v2.2"** (canvas page "App v2.2 – végleges javaslat"; app. and admin., not the public site):
  compact controls (40 px desktop, 44 px phone), 8 px corners, 14 px body, near-black green (`ink`) primary
  button, white cards with a hairline border on the `paper` ground, Sora only for titles, brand green for links
  and focus, lime only as an accent (Admin badge). Copy: modern corporate fintech in "te" form – say the action,
  never repeat the title on the button, errors tell what to do next, "kétlépcsős azonosítás" (never "2FA").
  Ease of use comes first.
- **Screens and flows = "App v2.3"** (canvas page "App v2.3 – feladatképernyők"), on top of v2.2: app shell on every
  signed-in screen; multi-step tasks in a focused flow (header with named steps and Cancel, live summary rail on desktop,
  review step before sending, sticky bottom action bar on phones); status pages with a timeline, what happens next and
  validity; destructive actions behind a confirm dialog, never next to the primary button.
- **Navigation map** (canvas board "Menütérkép"): personal things (profile, sign-in, notifications) live in the
  top-right user menu and are the same in every account; account things (details, team, plan, invoices, referral)
  hang off the top-left account switcher and are per account. Company accounts carry their slug in the URL
  (`/c/<slug>/…`). Insurance, policies and claims are free on every plan and never locked.
- **Mobile first, WCAG 2.2 AA**: no horizontal scroll 320–1440 px, 44×44 px touch targets, labelled fields,
  visible focus, 4.5:1 text contrast, keyboard and screen-reader friendly.
- **Terminology**: the lease is "bérleti szerződés" in Hungarian ("szerződés" when the context is clear) – never
  "bérlet" alone (it also means a travel pass). "bérleti díj", "bérlő", "bérbeadó" stay. Keyfly records a lease
  ("rögzítjük", "bekerült a Keyflyba"); it does not create the contract.
- **Emails** (all except the newsletter) use `src/lib/email-layout.ts`: compact v2.2, light only, company facts from
  `company.ts`. After changing auth email copy or company data run `npm run email:auth` and paste the templates into
  Supabase (staging and production).
- **Voice**: informal "te" (tegezés) everywhere, for tenants and companies alike. Formats: `1 050 000 Ft`
  (non-breaking spaces), `2026. 12. 01.`; English `HUF 1,050,000`, `1 Dec 2026`.
- **Build as a licensed insurance intermediary** would; insurer name, pricing and terms are configuration.
- **Privacy & security by design**: minimum data, retention for every personal field, RLS + tests for every table,
  secrets only in Vercel env, never in code or chat.

## Workflow
design → approval → branch from `staging` → CI green (lint, types, build, DB tests) → check on
staging.keyfly.app incl. a real phone → merge to `main` → record decisions in the handbook's decision log.

## Accounts (all owned by Plattio Magyarország Kft.)
- GitHub: `keyfly-app/keyfly` · Vercel team `keyfly` · Supabase org "Keyfly (Plattio Magyarország Kft.)"
- Email: Google Workspace (support@keyfly.app; hello@, tibor@ aliases) · Resend `mail.keyfly.app` (eu-west-1)

## Environments
| | Production | Staging |
|---|---|---|
| Branch | `main` | `staging` |
| Supabase | `keyfly-prod` (hieyofnjtrqnffzebxgg) | `keyfly-staging` (doriyqslvarvucbwlczq) |
| Domains | keyfly.app, app., admin. | staging., app-staging., admin-staging. |

Single sources of truth: see README (company.ts, consent.ts, globals.css tokens, messages/*.json, format.ts).
Long-form legal documents (privacy notice, imprint) live in `src/content/legal/` – HU binding, EN informative.

## Code layout
- `src/app` routes and their page-only sections (`_sections/`); `src/components` shared UI (`site/` = public header, footer, legal frame);
  `src/features/<name>` feature logic + UI (e.g. `waitlist`); `src/lib` helpers; `src/config` facts and versions.
- Keep it clean: no dead code or unused message keys, no hardcoded colors outside tokens, small components.
