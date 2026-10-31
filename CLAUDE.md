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
- **Design first**: every feature starts with a design in the Keyfly design canvas (desktop 1440 + mobile 390,
  all states, both languages) and is built only after approval. Use only design-system tokens and components.
- **Mobile first, WCAG 2.2 AA**: no horizontal scroll 320–1440 px, 44×44 px touch targets, labelled fields,
  visible focus, 4.5:1 text contrast, keyboard and screen-reader friendly.
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

Known debt (cleanup round pending): Hungarian comments/policy names/test labels and hardcoded Hungarian UI copy
in the initial scaffold; no i18n yet; company data not yet centralised.
