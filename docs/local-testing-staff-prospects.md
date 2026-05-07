# Local testing: staff directory & prospects

Use this when you pick up branch **`feature/staff-permissions-prospect-dashboard`** again. Nothing here touches **`main`** until you merge.

## Prerequisites

- Node deps installed (`npm install`).
- **PostgreSQL** reachable locally (or a dedicated dev DB — not production).
- **`.env`** with **`DATABASE_URL`** pointing at that database.

## One-time setup on this branch

```bash
git checkout feature/staff-permissions-prospect-dashboard
npm install
```

Apply schema changes:

```bash
npx prisma migrate dev
```

(Optional but recommended for realistic coach/staff data.)

```bash
npm run db:seed
```

## Run the app

```bash
npm run dev
```

Open the URL Next prints (usually **http://localhost:3000**).

## Smoke-test checklist

### Login expectations

- **Coach / staff flow:** shared login → pick a **staff identity** from the picker (seed usually creates sample coaches).
- **Super Admin:** uses the admin path you already use locally.

### Staff (`/staff`)

- Open **Staff** in the nav (or go to **`/staff`**).
- Confirm you see the staff directory; roles use the **Director / Coach / Manager** dropdown (not free-text).
- As **Director** (or Super Admin): add or edit a row (including primary location).
- As **Coach** or **Manager:** only **your** row should allow **email/phone** edits; others read-only.
- **Delete staff** should appear **only for Super Admin**, not for Director.

### Prospects — add (`/prospects/new`)

- Sign in as a **coach session** (staff identity), not Super Admin alone — add prospect is wired for coach submissions.
- Submit a test prospect (try **Unknown** location and a real location).
- You should land on **`/dashboard?prospectAdded=1`** with a green confirmation strip.

### Prospects — board (`/prospects`)

- Only **Director** or **Super Admin** should reach the full board (`/prospects`).
- **Director:** first load should default **location** to your primary area when one exists (URL may include `loc=…`).
- Filters: location, type, status, assigned, submitted by.
- Assign a prospect to an active staff member; confirm it appears under **My assigned prospects** on **`/dashboard`** for that identity.
- Delete prospect: Directors + Super Admin only.

### Regression quick pass

- **`/teams`**, **`/players`**, **`/dashboard`** player grids still load after migrate/seed.

## If something fails

- **`P2021` / missing column / enum errors:** migrations not applied — run **`npx prisma migrate dev`** again.
- **Seed errors:** check **`DATABASE_URL`** and that Postgres is running.
- **403-ish redirects:** you may be using the wrong session type (e.g. Super Admin on coach-only actions).

---

## Appendix: Player contact & intake (privacy vs duplicates)

**Goal:** Backfill **contact info** for players created before intake collected it, **without** exposing a searchable list of players to the public intake app.

**Constraint you called out:** A **dropdown of existing players** in intake = implicit **read** access to roster names (and often enough to infer who is “in the system”). That conflicts with “no read access for the general public.”

### Option A — Re-submit via intake only (you lean here)

- Parents (or staff) complete intake **as if new**; that can create **duplicate** player rows.
- Staff **merge or delete duplicates** in the **internal tracker** where full read is allowed.

**Pros:** Intake stays **write-only** from the public’s perspective (submit a form; no “pick your player” lookup). Simple mental model.  
**Cons:** Operational cleanup (merge rules, audit trail, occasional wrong merge if names collide).

### Option B — “Match if fields align” in intake (lookup-lite)

- After DOB + name (or similar), server checks for a match and **updates** the existing row or links the submission.

**Pros:** Fewer duplicate rows.  
**Cons:** You still need **server-side** matching logic; if the UI ever reveals “we found you,” it can leak existence of a record unless carefully designed (e.g. always same success message). Higher engineering and privacy-review burden.

### Practical recommendation

Aligning with **no roster read in intake**, **Option A (allow duplicates + merge in the tracker)** is consistent and usually faster to ship. Document a **merge playbook** (match on name + DOB + gender + location, then consolidate contact onto one `Player` / `PlayerContact`).

You can tighten intake later with **opaque tokens** (magic link per invite) or **staff-only** backfill tools — still without a public player picker.
