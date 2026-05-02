# Club player tracker (MVP)

Next.js 15 (App Router) + Prisma + PostgreSQL. Custom shared-password session auth for coaches and one super admin role.

## Local setup

1. Copy [`.env.example`](./.env.example) to `.env` and set:

- `DATABASE_URL` — use [Neon](https://neon.tech) (or any Postgres) connection string; must start with `postgres://` or `postgresql://`.
- `COACH_SHARED_PASSWORD` / `SUPER_ADMIN_PASSWORD` — shared secrets for MVP.
- `SESSION_SECRET` — at least 32 random characters.
- `DEFAULT_SEASON_LABEL` — e.g. `2026-2027` (used for new records and seed).

2. Install and sync schema:

```bash
npm install
npx prisma db push
npm run db:seed
```

Optional CSV seed imports:

- `data/staff.csv` for coaches: headers **`staff name`**, **`role`**, **`primary area`** (see `data/staff.template.csv`). Creates `Location` rows as needed and sets `staffRoleLabel` + primary area on each coach.
- `data/leagues.csv` for pathway metadata (see `data/leagues.template.csv`)

3. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to `/login`, then to teams after sign-in.

## Production (Vercel + Neon)

1. Push this repo to GitHub and connect it in Vercel (Next.js preset is detected automatically).
2. In the Vercel project settings, copy every variable from [`.env.example`](./.env.example) (`DATABASE_URL` must target your Neon branch).
3. **Schema on production:** against that Neon branch, run `npx prisma migrate deploy` (from your machine or CI). This applies SQL under `prisma/migrations/` (see migration `20250428000000_init`).
4. Deploy. Build uses `npm run build` (`prisma generate && next build`); `postinstall` runs `prisma generate` too.
5. If you previously synced the DB with `prisma db push` before migrations existed, see [Prisma baselining](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining) or recreate a fresh Neon branch before trusting `migrate deploy`.

## Milestone 1 (implemented)

- Prisma schema (seasons, teams, players, contacts, age rules, coach-authored evaluations).
- Shared-password auth + coach identity dropdown + signed session cookie.
- Teams and players CRUD with role-based rules; contact hidden unless policy allows; soft duplicate warning on create.
- Team-building dashboard route at `/dashboard` with team status + unassigned player matching filters.

## Coach quick start

Day-to-day usage for coaches (login, dashboard filters, copy tables, permissions overview): [`docs/coach-quick-guide.md`](./docs/coach-quick-guide.md).

## Super admin quick start

Admin console, full team edit/delete, and reference data (`/admin`): [`docs/admin-quick-guide.md`](./docs/admin-quick-guide.md).

## Permission Matrix (MVP)

- **Super Admin**
  - View/edit all teams and players
  - View/edit all contact information
  - Edit `committedPlayerCount`
  - Delete teams/players
- **Coach**
  - View club-wide teams and players
  - View/edit players only when:
    - created by that coach, or
    - assigned to that coach's team
  - View contact only for those same ownership cases
  - Team edits limited to own team recruiting fields in MVP
  - Cannot edit admin-only committed counts

## Privacy and RBAC Notes

- `PlayerContact` is stored separately and excluded by default from list/detail query paths.
- Contact data is included only when server-side RBAC allows it.
- Ownership checks are centralized in `src/lib/rbac.ts`.

## Phase 6 Verification

- Permission/contact regression checklist:
  - [`docs/phase-6-permissions-checklist.md`](./docs/phase-6-permissions-checklist.md)

## Milestone 7 Plan

- [`docs/milestone-7-team-building-dashboard-plan.md`](./docs/milestone-7-team-building-dashboard-plan.md)
