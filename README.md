# Keyfly

Kaució helyett biztosítás lakásbérlőknek. Egy kódbázis, egy adatbázis, három felület.

| Domain | Felület | Mappa | Kinek |
|---|---|---|---|
| `keyfly.app` | Publikus oldal (most: „Hamarosan” + várólista) | `src/app/(marketing)` | mindenki |
| `app.keyfly.app` | Ügyfélfelület | `src/app/portal` | bérlő, bérbeadó, ingatlaniroda |
| `admin.keyfly.app` | Back office | `src/app/admin` | Keyfly-munkatársak |
| `staging.keyfly.app`, `app-staging.`, `admin-staging.` | Teszt (jelszóval védve) | `staging` ág | csak mi |

A domain alapján a `src/proxy.ts` dönti el, melyik felület jelenik meg (`src/lib/sites.ts`).

## Környezetek

| | Éles | Staging |
|---|---|---|
| Git ág | `main` | `staging` |
| Supabase projekt | `keyfly-prod` (`hieyofnjtrqnffzebxgg`) | `keyfly-staging` (`doriyqslvarvucbwlczq`) |
| Régió | EU – Frankfurt | EU – Frankfurt |
| Vercel | Production | Preview (minden nem-`main` ág) |

Munkamenet: új funkció → ág a `staging`-ből → PR a `staging`-be (CI fut) → staging.keyfly.app-on kipróbáljuk → PR a `main`-be → élesedik.

## Adatbázis

- Séma: `supabase/migrations/` – minden változás új migrációs fájl, régit soha nem szerkesztünk.
- Jogosultságok: Row Level Security minden táblán. Alapból senki nem lát semmit, minden hozzáférést egy policy ad:
  - **bérlő** – saját profil, ajánlatkérések, kötvények, a vele szembeni kárigények
  - **bérbeadó** – saját ingatlanok, az azokra szóló kötvények, kárbejelentés; a bérlő jövedelmét *nem* látja
  - **ingatlaniroda** – a szervezete ingatlanai és az általa hozott ajánlatkérések
  - **munkatárs** (`staff` tábla) – minden; munkatársat felvenni csak `superadmin` tud
- Az ajánlat mezőit (díj, döntés) csak munkatárs vagy a szerver írhatja – ezt trigger is védi.
- Tesztek: `supabase/tests/rls.test.sql` (52 ellenőrzés). Futtatás bármilyen üres Postgresen:
  `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres npm run db:test`

### Első superadmin beállítása

1. Lépj be egyszer az app.keyfly.app-on a saját e-mail címeddel (létrejön a fiókod).
2. Supabase → `keyfly-prod` → SQL Editor:
   ```sql
   insert into public.staff (user_id, role)
   select id, 'superadmin' from auth.users where email = 'TE@keyfly.app';
   ```
3. Ezután az admin.keyfly.app beenged.

### Adatbázis telepítés (automatikus)

A `.github/workflows/db-deploy.yml` a `main` ágra érkező migrációkat az éles, a `staging` ágra érkezőket a staging adatbázisra tölti. Ehhez a GitHub repó *Settings → Secrets and variables → Actions* alatt kell:

- `SUPABASE_ACCESS_TOKEN` – supabase.com → Account → Access Tokens
- `SUPABASE_DB_PASSWORD_PROD`, `SUPABASE_DB_PASSWORD_STAGING` – projekt → Database → Settings → Reset database password

Amíg ezek nincsenek beállítva, a lépés figyelmeztetéssel kimarad (nem bukik el).

## Helyi fejlesztés

```bash
npm install
cp .env.example .env.local      # staging Supabase-re mutat
npm run dev
```

- http://localhost:3000 – publikus oldal
- http://app.localhost:3000 – ügyfélfelület
- http://admin.localhost:3000 – admin

Vercel előnézeti linken (`*.vercel.app`) a felületek a `/portal` és `/admin` útvonalon érhetők el.

## Környezeti változók (Vercel)

| Név | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | prod URL | staging URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | prod publishable | staging publishable |
| `NEXT_PUBLIC_APP_ENV` | `production` | `staging` |
| `STAGING_BASIC_AUTH` | – | `felhasznalo:jelszo` |

A publishable kulcs nyilvános, a védelmet az RLS adja. **Service role kulcs soha nem kerül a repóba vagy a böngészőbe.**

## Technológia

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Vercel · GitHub Actions
