# My Team roster management — architecture plan

Status: **Approved — implemented on feature branch (schema, migrations, actions, `/teams/[id]` pipeline UI). Ongoing work in §8–§9.**

Goals:

- **`Player.playerStatus`** is lifecycle only: `AVAILABLE` \| `ACTIVE` \| `ARCHIVED`.
- **Recruiting / roster pipeline** is **team-scoped** via **`TeamPlayerPlacement`**.
- **Many coaches per team** via **`TeamCoach`**.
- Existing **`Player.assignedTeamId`** must be migrated with a clear story (see §4).

---

## 1. Proposed Prisma schema changes

### 1.1 Enums

**`PlayerStatus` (lifecycle — replace existing recruiting values)**

```prisma
enum PlayerStatus {
  AVAILABLE
  ACTIVE
  ARCHIVED
}
```

**`TeamCoachRole`**

```prisma
enum TeamCoachRole {
  HEAD_COACH
  ASSISTANT_COACH
  MANAGER
}
```

**`TeamPlayerPlacementStatus`**

```prisma
enum TeamPlayerPlacementStatus {
  INVITED
  OFFERED
  COMMITTED
  NOT_INTERESTED
  SECONDARY_REQUESTED
  SECONDARY_APPROVED
  GUEST_REQUESTED
  GUEST_APPROVED
}
```

**`TeamPlayerPlacementType`**

```prisma
enum TeamPlayerPlacementType {
  PRIMARY
  SECONDARY
  GUEST
}
```

### 1.2 Models

**`TeamCoach`** (many-to-many `Team` ↔ `Coach`)

| Field       | Type            | Constraints / notes                                      |
|------------|-----------------|-----------------------------------------------------------|
| `id`       | String `@id @default(cuid())` | |
| `teamId`   | String          | FK → `Team`, `onDelete: Cascade` (or Restrict — choose one) |
| `coachId`  | String          | FK → `Coach`, `onDelete: Restrict`                        |
| `role`     | `TeamCoachRole` |                                                           |
| `createdAt`| DateTime        | `@default(now())`                                         |
| `updatedAt`| DateTime        | `@updatedAt`                                              |

Suggested indexes:

- `@@index([coachId])` — “my teams” dropdown.
- `@@index([teamId])` — roster staff list.
- `@@unique([teamId, coachId])` — one membership row per coach per team (role changes update same row).

**`TeamPlayerPlacement`**

| Field                   | Type                          | Req / notes |
|-------------------------|-------------------------------|-------------|
| `id`                    | String `@id @default(cuid())` | |
| `playerId`              | String                        | FK → `Player`, `onDelete: Restrict` (or Cascade per policy) |
| `teamId`                | String                        | FK → `Team`, `onDelete: Restrict` |
| `status`                | `TeamPlayerPlacementStatus` | |
| `placementType`       | `TeamPlayerPlacementType`   | PRIMARY / SECONDARY / GUEST |
| `requestedByCoachId`    | String?                       | FK → `Coach` |
| `approvedByCoachId`     | String?                       | FK → `Coach` |
| `approvedByDirectorId`  | String?                       | FK → `Coach` (if directors are coaches in DB — see §7) |
| `notes`                 | String?                       | |
| `createdAt`             | DateTime                      | `@default(now())` |
| `updatedAt`             | DateTime                      | `@updatedAt` |

**Uniqueness (recommended):**

- **`@@unique([playerId, teamId])`** — one *current* pipeline row per player per team (status transitions mutate this row).
- If you need **audit history**, add **`TeamPlayerPlacementEvent`** later or append-only table; MVP can stay single row per pair.

Alternative if you explicitly want **PRIMARY + SECONDARY rows for same player+team** (unusual):

- Relax unique to **`@@unique([playerId, teamId, placementType])`** and enforce rules in application code.

**Recommendation for MVP:** `@@unique([playerId, teamId])` and use `placementType` + `status` to encode secondary/guest flows (type flips when approved).

### 1.3 `Team` coach field

Today: **`Team.coachId`** (single FK). After **`TeamCoach`** exists:

| Option | Description |
|--------|-------------|
| **A — Keep `coachId` as canonical “billing / owner”** | Denormalized; must stay in sync with exactly one `TeamCoach` HEAD row. Higher drift risk. |
| **B — Deprecate `coachId` after backfill** | **Preferred.** “Head coach” = `TeamCoach` where `role = HEAD_COACH` (enforce exactly one HEAD per team in app + optional DB constraint). |
| **C — Nullable `coachId` during transition** | Backfill `TeamCoach` from `coachId`; then drop `coachId` in a later migration once all readers use `TeamCoach`. |

**Proposal:** **C then B**: add `TeamCoach`, backfill from `Team.coachId` as `HEAD_COACH`, migrate codepaths, then **remove `coachId`** in a follow-up migration to avoid perpetual dual sources of truth.

### 1.4 `Player`

- **`assignedTeamId`:** see §4 — likely **removed** once COMMITTED primary placement defines roster; interim can remain read-only duplicated from placement for one release.
- **`playerStatus`:** enum narrowed to **`AVAILABLE` \| `ACTIVE` \| `ARCHIVED`** only.
- **Indexes:** replace `playerStatus` in composite indexes where recruiting filters move to placements (new indexes on `(teamId, status)` on placements).

---

## 2. Proposed migrations

Order matters.

| Step | Migration | Purpose |
|------|-----------|---------|
| 1 | **`TeamCoach`** + enums | Add table + `TeamCoachRole`; no breakage yet. |
| 2 | **Backfill `TeamCoach`** | For every `Team`, insert `{ teamId, coachId: team.coachId, role: HEAD_COACH }` if not exists. |
| 3 | **`TeamPlayerPlacement`** + enums | Add table + placement enums. |
| 4 | **Data backfill placements** | From `Player.assignedTeamId` + legacy `playerStatus` (see §4). |
| 5 | **`Player.playerStatus` enum shrink** | PostgreSQL: add new enum, migrate columns, swap — or Prisma migrate with careful raw SQL (`ALTER TYPE ...`). |
| 6 | **Recompute lifecycle `playerStatus`** | `ACTIVE` if any placement exists (or any non-terminal placement — define precisely); else keep `AVAILABLE`/`ARCHIVED`. |
| 7 | *(Optional follow-up)* | Drop `Team.coachId` after code uses `TeamCoach` only; drop **`Player.assignedTeamId`** when all reads use placements |

**Breaking enum change note:** Postgres enum value **removals** are awkward. Typical pattern:

1. Add column `lifecycleStatus` with new enum, backfill from old `playerStatus`.
2. Drop old column / rename.

Prisma migration may need **`prisma migrate` + supplemental `migration.sql`** for enum surgery.

---

## 3. Data migration from existing `Player.assignedTeamId` + legacy `playerStatus`

Current enum in DB/code: **`AVAILABLE`, `INVITED`, `COMMITTED`, `NOT_INTERESTED`, `ARCHIVED`**.

Proposed mapping **per player with `assignedTeamId` set** (team = assigned team):

| Legacy `playerStatus` | `TeamPlayerPlacement` | Notes |
|----------------------|------------------------|--------|
| `COMMITTED`          | `status: COMMITTED`, `placementType: PRIMARY`, `requestedByCoachId`: best-effort (e.g. `createdByCoachId` or team’s HEAD coach from `TeamCoach`) | Primary roster |
| `INVITED`            | `status: INVITED`, `placementType: PRIMARY` | Matches “evaluation pipeline” |
| `NOT_INTERESTED`     | `status: NOT_INTERESTED`, `placementType: PRIMARY` | Scoped to that team |
| `AVAILABLE`          | **No placement row** unless business rules imply otherwise; **`assignedTeamId` inconsistent** — pick policy below | |

**Legacy `OFFERED`:** does not exist today in schema; no mapping needed unless you introduced it elsewhere.

**Legacy `AVAILABLE` + `assignedTeamId`:**

- Likely inconsistent data — **proposal:** create **`INVITED`** placement (conservative “in pipeline”) *or* clear `assignedTeamId` — **prefer explicit staging:** log count, default to **`INVITED`** + QA review.

**`ARCHIVED` players:**

- **Proposal:** **`Player.playerStatus` → ARCHIVED**, **no placements** unless you want archival teams (usually skip).

**Lifecycle after backfill:**

- If **any** placement with status in **`INVITED` \| `OFFERED` \| `COMMITTED` \| … requested/approved`** → **`Player.playerStatus = ACTIVE`**.
- Else if **legacy ARCHIVED** → **ARCHIVED**.
- Else **`AVAILABLE`**.
- Optionally: **AVAILABLE** iff **zero “open” placements** — define terminal states (`NOT_INTERESTED`, both guest/secondary chains terminal) vs still “has history” row (prefer single row per team with terminal status ≠ delete).

---

## 4. “API routes” — align with Next.js App Router

This repo favors **Server Actions** + server components (`"use server"`), not REST routes. Equivalent surface:

| Concern | Proposed surface |
|---------|-------------------|
| List teams for picker | **`listMyTeams(session)`** — coach via `TeamCoach`; director filtered by location; admin all |
| Load roster grouped by position | **Server loader** on page or **`getTeamRosterView(teamId, session)`** |
| Transition placement status | **`updateTeamPlayerPlacementAction`**, **`invitePlayerToTeamAction`**, **`requestSecondaryPlacementAction`**, etc. |
| Player pool grid | **`listEligiblePlayersForTeamPool(teamId, filters)`** with eligibility rules |

If you insist on **`/api/*`**, mirror the same RBAC wrappers; only add if consumers need REST.

---

## 5. Proposed My Team page structure

**Route suggestions:**

- **`/my-team`** — team picker + current team context (`?teamId=`) or **`/teams/[teamId]/roster`**.

**Recommended:** **`app/(dashboard)/teams/[teamId]/roster/page.tsx`** (or **`/my-team`** redirecting to default team).

**Sections:**

1. **Header**

   - Team name, gender, age, location badge.
   - **Summary KPIs:** Committed / Outstanding offers / Evaluation (INVITED) / Do not pursue / Secondary pending / Guest pending / **Pipeline total (COMMITTED + OFFERED)** per your formulas.

2. **Roster (grouped by position)**

   - Groups: GK, DEFENDER, MIDFIELDER, FORWARD, UTILITY (& UNKNOWN lumped).
   - Within position **sort tier:** COMMITTED (1), OFFERED (2), INVITED (3), NOT_INTERESTED (4).
   - **Section subtotal:** `COMMITTED + OFFERED + INVITED` (exclude NOT_INTERESTED).

3. **Player pool (side or tab)**

   - Filters: sex, min age, max age, location; defaults Any / U6 / U19 / All.
   - Eligibility enforced server-side; ineligible rows never returned.

4. **Player row interaction**

   - Click status → drawer/modal: **all placements** across teams + **primary coach contact for committed team**.
   - If **OFFERED** on another team → CTA **Request secondary**.
   - If **COMMITTED** elsewhere → CTA **Request guest**.

**Caching:** **`revalidatePath`** on mutations; consider **nuqs**/query for filters.

---

## 6. Permission model

Rough matrix (implement with existing session + **`StaffRole`** + **`TeamCoach`**).

| Capability | Coach | Director | Super admin |
|-----------|-------|----------|-------------|
| See team in **My Team** picker | Teams in **`TeamCoach`** | Teams where **`Team.locationId` matches director primary location** | All teams |
| View roster / pool | If member of `TeamCoach` for that **teamId** | If team in scoped location | Yes |
| **Invite** (CREATE placement INVITED) | Yes for coached teams | Optional (policy — default mirror head coach?) | Yes |
| **INVITED → OFFERED \| NOT_INTERESTED** | Yes (own team placements) | Optional | Yes |
| **OFFERED → COMMITTED \| NOT_INTERESTED** | Yes **only if** offer is **for their team placement** | Optional | Yes |
| **COMMITTED → change** | **No** | **No** (unless breaking admin override)** | Negotiable — default **No** unless super-admin tooling |
| **SECONDARY_ / GUEST_ requests** | Initiate from pool UI per rules | Optional approve | Yes |
| **Approve SECONDARY_APPROVED / GUEST_APPROVED** | Head coach **or** delegated coach (policy) **`approvedByCoachId`** | **`approvedByDirectorId`** recommended for contested paths | Always |

**`approvedByDirectorId` type:**

- Schema shows **`Coach`** FK — Directors are **`StaffRole.DIRECTOR`** on **`Coach`** today. **Recommendation:** FK → **`Coach.id`** where `staffRole == DIRECTOR`; document in code.

---

## 7. Approval gate — outstanding decisions

Per your briefing: **implementation waits until you confirm these.**

1. **Single vs multiple placement rows** per `(playerId, teamId)` — MVP **unique**.
2. **Drop `Team.coachId`** immediately after backfill or keep one release overlap.
3. **Drop `assignedTeamId`** or keep synced from “COMMITTED PRIMARY” placement.
4. **`ACTIVE` lifecycle definition:** strictly “≥1 placement row exists” vs “≥1 non-terminal placement” (recommend latter so NOT_INTERESTED-only does not falsely force ACTIVE unless you retain row).
5. **Director approving secondary/guest** — required vs optional vs coach-only MVP.

---

## 8. INVITED semantics (product language)

**`INVITED`** on a **primary** `TeamPlayerPlacement` is the **starting state on a team’s roster track**: it is the placeholder when a player is first placed on that squad (aligned with “assigned to this team” in legacy `assignedTeamId` flows). From there the coaching staff moves the row forward:

| Transition | Meaning |
|------------|---------|
| **INVITED → OFFERED** | A formal offer is out. |
| **INVITED → NOT_INTERESTED** | The track ends **before** an offer (or before commitment), e.g. player or club walks away. |
| **OFFERED → COMMITTED** | Player accepts. |
| **OFFERED → NOT_INTERESTED** | Offer declined or falls through. |

**Committed** rows are intentionally hard to change from the coach transition UI (policy); lifecycle changes after commitment may be admin/super-admin tooling later.

If coaches find the word “Invited” confusing in UI, prefer **copy changes** (e.g. “On roster track”, “Evaluation”) rather than renaming the enum value.

---

## 9. Backlog / follow-ups (circle back)

Cross-check this list as assignment UX and placements converge.

1. **Assignment ↔ placement sync (primary)** — When `assignedTeamId` is set or cleared (profile, team-building), keep **`TeamPlayerPlacement`** aligned: upsert **PRIMARY** **`INVITED`** when joining a team’s track; terminal **`NOT_INTERESTED`** on the previous team when switching or unassigning; do not downgrade existing **OFFERED** / **COMMITTED** rows. *(Implemented in `syncPrimaryPlacementFromAssignedTeamChange` — watch imports/scripts that set `assignedTeamId` outside player services/actions.)*
2. **`invitePlayerToTeamAction`** — Wire from UI (player pool / profile / team page) so “add to this team’s pipeline” is placement-first where appropriate.
3. **Single source of truth** — Eventually read “who is on this team” from **committed primary placement** (and/or pipeline statuses), then drop or freeze **`assignedTeamId`** per §1.4 / §2 step 7.
4. **Dashboard / team-building** — Confirm counts and chips use placement-backed definitions where KPIs matter; keep legacy counts only during overlap if needed.
5. **Docs** — Keep **`docs/database-schema.md`** in sync when enums or placement rules change.
