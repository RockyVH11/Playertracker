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

3. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to `/login`, then to teams after sign-in.

## Production (Vercel + Neon)

- Set the same environment variables in the Vercel project.
- Build command: `npm run build` (runs `prisma generate` via the `build` script + `postinstall`).
- After changing the schema, run `prisma migrate` / `prisma db push` against the production database as appropriate for your process.

## Milestone 1 (implemented)

- Prisma schema (seasons, teams, players, contacts, age rules, coach-authored evaluations).
- Shared-password auth + coach identity dropdown + signed session cookie.
- Teams and players CRUD with role-based rules; contact hidden unless policy allows; soft duplicate warning on create.
