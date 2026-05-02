# Super admin quick guide

Operations that only **Super Admin** can do in this MVP. Coaches have a separate guide: [`coach-quick-guide.md`](./coach-quick-guide.md). Technical setup and env vars: root [`README.md`](../README.md).

## Signing in

1. Go to **`/login`**.
2. Under **Mode**, choose **Super admin** (not Coach).
3. Enter the **`SUPER_ADMIN_PASSWORD`** from your deployment / `.env` (`COACH_SHARED_PASSWORD` is for coach mode only).

You are redirected to **`/teams`** like everyone else; admin-only screens live under **`/admin/...`**.

## Admin area (`/admin`)

The admin shell is at **`/admin`** (it forwards to **`/admin/locations`**). If you are not a super admin session, you are sent back to **`/teams`**.

**Nav links (reference data & club structure)**

| Link | Route | Purpose |
|------|-------|--------|
| Locations | `/admin/locations` | Training/home sites used on teams and coaches. |
| Leagues | `/admin/leagues` | Pathway labels (used in team names and filters). |
| Age chart | `/admin/age-chart` | Age-chart rules (club policy data). |
| Coaches / users | `/admin/coaches` | Coach roster for the **login picker** and staff metadata. |
| Add team | `/admin/teams/new` | Short form to add a team (defaults for counts; full edit on the team page). |

Keep **locations**, **leagues**, and **coaches** accurate so dropdowns on teams, players, and dashboard stay usable.

## Teams and rosters (beyond `/admin`)

Super admins use the same **Teams** list as coaches but with extra power:

- **`/teams/new`** — Full **New team** form (super admin only from the UI). Includes manual display name override and full recruiting/commit fields.
- **`/teams`** — Roster season dropdown, filters, **New team** button (super admin).
- **`/teams/[id]`** — Open any team. At the bottom, the **Super admin** panel lets you edit **all** team fields (season, name, location, coach assignment, league, **committed** count, needs, etc.) and **`Delete team`**.

**Committed player count** is admin-only and important for dashboard truth; coaches cannot change it.

Deleting a team requires no assigned players blocking foreign keys; if delete fails, resolve assignments in **Players** first or use Prisma/DB tools as a last resort.

## Players and contacts

- Browse **`/players`** and open any profile—super admin may **view and edit** contact data when the app’s RBAC allows (see [`README.md`](../README.md) matrix).
- Coaches are limited to players they created or who are on **their** team; you are not.

## Team-building dashboard

- **`/dashboard`** — Same filters and **Copy table** helpers as coaches for planning; you see the full dataset your role allows.

## Verification and planning docs

- Permission/contact regression checklist: [`phase-6-permissions-checklist.md`](./phase-6-permissions-checklist.md)
- Dashboard roadmap / design notes: [`milestone-7-team-building-dashboard-plan.md`](./milestone-7-team-building-dashboard-plan.md)

## Security notes (MVP)

- Admin and coach access both rely on **shared passwords** in env—rotate them if someone leaves; this is not SSO.
- Do not commit **`.env`** or real passwords to git.
