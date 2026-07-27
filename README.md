# RoadTrip Planner

Plan multi-day road trips with day-by-day stops, an interactive map, fuel cost estimates, and one-click Google Maps navigation.

## Stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **React 19** + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** + **lucide-react**
- **Prisma** ORM against **Supabase PostgreSQL**
- **Supabase Auth** (email/password, email confirmation, password recovery)
- **Zod** validation + **React Hook Form**
- **Leaflet** / OpenStreetMap for maps, **OSRM** for driving routes, **Nominatim** for geocoding (all free, keyless)

## Architecture

Feature-based structure:

```
src/
  app/                    # Next.js App Router routes only — thin, delegate to features
    (auth)/login, register
    (dashboard)/my-trips, vehicles, profile, settings
    trips/[tripId]/, .../fuel
    auth/callback/         # Auth/recovery code exchange route handler
  components/
    ui/                   # shadcn/ui primitives
    layout/                # AppSidebar and friends
    shared/                # AppLogo etc.
  features/
    auth/                  # login/register forms, sign-out action
    profile/
    trips/                 # trip list, planner shell, trip CRUD actions
    trip-days/              # DayPanel, day CRUD actions
    trip-stops/             # StopCard, AddStopBox, MapView, stop CRUD + reorder
    vehicles/
    fuel/                   # fuel cost/refuel-planning engine + dashboard UI
  lib/
    db/                    # Prisma data-access layer — the ONLY place that imports `prisma`
    supabase/               # browser/server/middleware Supabase clients
    auth/                   # requireUser()/getCurrentUser() server-side guards
    validators/             # Zod schemas per domain
    integrations/            # geocode, routing (OSRM), Google Maps links, fuel-price helpers
    geo.ts, utils.ts, prisma.ts
  types/                    # shared Prisma-derived view types
  middleware.ts              # edge-level route protection + Supabase session refresh
prisma/schema.prisma
```

Every database query lives in `lib/db/*.ts`, is scoped by `userId`, and is only ever called from a `"use server"` action in the matching `features/*/actions.ts` file — components never import Prisma directly.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your Supabase project's values (Project Settings → API, and Project Settings → Database):

```bash
cp .env.example .env.local
```

- `DATABASE_URL` — pooled connection string (used at runtime)
- `DIRECT_URL` — direct (non-pooled) connection string, used by `prisma db push` to apply schema changes
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project's API settings

### 3. Set up the database

For local development, this project currently manages its schema with
`prisma db push`:

```bash
npx prisma generate
npx prisma db push
```

Do not use `db push` as the production deployment strategy. Before the first
production release, create and review a baseline migration, mark it as applied
against an existing database, and use `prisma migrate deploy` for subsequent
releases.

### 4. Enable auth providers in Supabase

In the Supabase dashboard, enable the **Email** provider and configure the Site
URL plus the `/auth/callback` redirect for every deployed environment.

### 5. Run the app

```bash
npm run dev
```

## Commands

| Command                     | Description                                   |
| --------------------------- | --------------------------------------------- |
| `npm install`               | Install dependencies                          |
| `npx prisma generate`       | Generate the Prisma client                    |
| `npx prisma db push`        | Synchronize a local/development database only |
| `npx prisma migrate deploy` | Apply reviewed migrations in production       |
| `npm run dev`               | Start the dev server                          |
| `npm run build`             | Production build (also type-checks and lints) |
| `npm run lint`              | Run ESLint                                    |
| `npm run format`            | Format with Prettier                          |

## Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
3. Set the environment variables (Project Settings → Environment Variables) for **Production**, **Preview**, and **Development**:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
4. Create and review a Prisma baseline migration. If the target database
   already contains the schema, mark that baseline as applied; then use
   `npx prisma migrate deploy` for controlled production changes.
5. In the Supabase dashboard, add your production domain's `/auth/callback` URL (e.g. `https://your-app.vercel.app/auth/callback`) to **Authentication → URL Configuration → Redirect URLs**.
6. Deploy. `postinstall` runs `prisma generate` automatically on every install, so no extra build configuration is needed.

## Environment variables

All secrets are read from environment variables — none are hardcoded in source. Copy `.env.example` to `.env.local` for local development; never commit `.env.local` (already covered by `.gitignore`).

| Variable                        | Where it's read                                     | Client-exposed?                                                        |
| ------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`                  | Prisma (`prisma/schema.prisma`), runtime queries    | No                                                                     |
| `DIRECT_URL`                    | Prisma migrations and schema tooling                | No                                                                     |
| `NEXT_PUBLIC_SUPABASE_URL`      | `lib/supabase/*`                                    | Yes (safe — public project URL)                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/*`                                    | Yes (safe — used only for Supabase Auth, not data queries)             |
| `NEXT_PUBLIC_SITE_URL`          | `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts` | Yes (safe — public production URL, e.g. `https://your-app.vercel.app`) |

No Supabase `service_role` key is used anywhere in this codebase.

**Important — authorization model:** all application data (trips, stops, vehicles, etc.) is read and written through Prisma using `DATABASE_URL`, which connects as the Postgres role `postgres.<project-ref>` — not through Supabase's PostgREST/anon client. **Row Level Security policies on these tables, if any exist in the Supabase dashboard, are not what protects this data** (the Postgres table owner bypasses RLS by default). Every trip/day/stop/activity/vehicle query is instead scoped by `userId` in `lib/db/*.ts` (see `tripAccessWhere()` in `lib/db/trip-access.ts`), and every Server Action calls `requireUser()`/`requireAuthenticatedUser()` first. If you ever add a code path that queries Supabase directly (PostgREST, Storage, etc.) with the anon key, you must add matching RLS policies for it — the anon key has no protection without them.

## Known limitations

- **Nominatim/OSRM are free, public, rate-limited services** — fine for development and light production traffic, but consider a paid provider (Mapbox, Google Maps Platform) before scaling.
- **Avatar upload and account deletion** are intentionally disabled in the UI (no Supabase Storage bucket / deletion flow wired up yet).
- **Prisma migrations are not yet committed.** A reviewed baseline migration is required before the first production database deployment.
