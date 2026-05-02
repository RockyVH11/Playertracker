# Staff permissions cleanup + Prospect dashboard

## 1. Prisma schema changes

- **Enums**: `StaffRole` (DIRECTOR, COACH, MANAGER), `ProspectType`, `ProspectStatus`.
- **Coach**: add `staffRole StaffRole @default(COACH)`; keep `staffRoleLabel` for CSV/legacy picker text.
- **Prospect**: id, types, names, contact fields, `locationId`, `locationUnknown`, assignments, notes, status, timestamps (`assignedAt`, `convertedAt`, `closedAt`).
- **Relations**: `Prospect` → `Coach` (`assignedTo`, `submittedBy`), `Prospect` → `Location`; `Coach` reverse relations; `Location.prospects`.

## 2. Migration plan

- Create PostgreSQL enums and `Coach.staffRole` with default COACH.
- Backfill `staffRole` from `staffRoleLabel` (substring match director/manager → enum; else COACH).
- Create `Prospect` table and FKs (`submittedByCoachId` required).
- Deploy: apply migration; run seed as needed (seed sets both label and inferred `staffRole`).

## 3. RBAC (server-side)

- Load **active** `Coach` for coach sessions (`staffRole`).
- **Super Admin**: staff CRUD including delete; full prospect dashboard; assign/delete/view contact.
- **Director**: staff list; create/update any staff incl. active + `staffRole`; **no delete**; prospect dashboard default location = primary location; filters; assign/delete; view contact.
- **Coach/Manager**: staff list read-only columns; edit **own** email/phone only; add prospect; cannot open `/prospects` dashboard; assigned prospects: update status + notes only; view contact only if assigned, submitter, director, or super admin (submitting coach retained for legitimate follow-up).

## 4. Staff UI (`/staff`)

- Table: name, email, phone, role dropdown, primary location dropdown, status, actions.
- Actions: Directors + Super Admin add row + full edits; Coach/Manager self row email/phone only; delete only Super Admin (hidden from Director).

## 5. Prospect UI

- **`/prospects/new`**: form (type, prospect name, contact fields, location or Unknown, notes); visible to all logged-in staff identities.
- **`/prospects`**: filtered table (Director + Super Admin); default location Director = primary / Super Admin = all.
- **Dashboard**: assigned prospects strip for everyone with coach session (and optionally super viewing as coach-less — super uses full `/prospects`).

## 6. Implementation status

Tracked on branch `feature/staff-permissions-prospect-dashboard` (schemas, migrations, RBAC modules, actions, routes, nav, tests).
