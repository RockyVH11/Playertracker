# Storm Intake App

Separate parent-safe intake app that writes new players into the same Neon database used by the main Player Tracker app.

## Env
Copy `.env.example` to `.env` and set:
- DATABASE_URL (same Neon DB as main app)
- DEFAULT_SEASON_LABEL (e.g. 2026-2027)
- MAIN_APP_URL (main app base URL)

## Run
npm install
npm run dev

Open `http://localhost:3000` and tap **Start intake**.

You'll pick a **practice location**, then intake defaults that location dropdown (still editable). Use **Stop intake** to exit back to home.

Enter DOB with **6 digits** — it formats to `MM/DD/YY` (saved as `20YY` in the database).

## Monorepo / Vercel

This folder intentionally has **no `package-lock.json`** (ignored here). Two lockfiles confuse Next.js + Vercel (`routes-manifest-deterministic.json` ENOENT under `/vercel/path0/.next`). Use **Root Directory `storm-intake`** and leave **Output directory** unset.
