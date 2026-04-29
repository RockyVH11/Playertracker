# Milestone 7: Team-Building Dashboard Expansion

This document captures the requested next-phase architecture and implementation scope.

## 1) Prisma Schema Updates

- `EvaluationLevel` replaced with:
  - `RL`, `N1`, `N2`, `GRASSROOTS`, `NOT_EVALUATED`
- Added enums:
  - `PlayerPosition`: `GK`, `DEFENDER`, `MIDFIELDER`, `FORWARD`, `UTILITY`, `UNKNOWN`
  - `PlayerSource`: `COACH_ENTERED`, `PARENT_INTEREST_FORM`, `OPEN_SESSION`, `EXISTING_PLAYER`, `COACH_REFERRAL`, `OTHER`
  - `PlacementPriority`: `HIGH`, `MEDIUM`, `LOW`, `WATCH_LIST`
- `Coach` additions:
  - `primaryAreaLabel`
  - `primaryLocationId` relation to `Location`
- `League` additions:
  - `conference`, `ageGroup`, `hierarchy`, `capacity`, `format`, `notes`
- `Team` additions:
  - `returningPlayerCount`
  - `neededPlayerCount`
  - `neededGoalkeepers`
  - `neededDefenders`
  - `neededMidfielders`
  - `neededForwards`
  - `neededUtility`
- `Player` additions:
  - `primaryPosition`
  - `secondaryPosition`
  - `playerSource`
  - `placementPriority`
  - `externalInterestFormId`
  - `sourceSubmittedAt`
  - `importedFromInterestForm`

## 2) Migration Plan

1. **Create migration** for enum and column changes.
2. **Data mapping for EvaluationLevel** (before dropping old enum variants):
   - `RL_FOR_SURE` -> `RL`
   - `BORDERLINE_RL` -> `RL`
   - `N1` -> `N1`
   - `N2` -> `N2`
   - `OTHER` -> `GRASSROOTS`
3. Set fallback for null/unknown to `NOT_EVALUATED`.
4. Add index updates for dashboard queries after data mapping.
5. Run on staging/preview Neon branch first, then production branch.

## 3) Seed Import Approach (Coaches, Locations, Leagues)

- Seed defaults are still provided in `prisma/seed.ts`.
- Optional CSV imports are supported from:
  - `data/staff.csv`
  - `data/leagues.csv`
- Staff import behavior:
  - create/update coaches
  - read `primary area` and upsert matching location
  - link coach `primaryLocationId` for login dropdown context
- League import behavior:
  - upsert by league name
  - map metadata fields when present

## 4) Updated Dashboard Page Plan

- Add `/dashboard` route with two sections:
  1. **Team status table** (club-wide team-building view)
  2. **Unassigned players table** (recruiting pool view)
- Shared filters:
  - league/pathway, location, gender, age group, coach, team, open session
- Team table fields:
  - team name, coach, location, gender, age group, league/pathway
  - prospects count, returning count, needed count
  - needed by position breakdown
  - committed, assigned, coach estimated, recruiting notes

## 5) Updated Service/Query Plan

- New service: `src/lib/services/dashboard.service.ts`
  - `listTeamDashboardRows()`
  - `listUnassignedDashboardPlayers()`
- Reuse and extend `listPlayers()` with strict filter input.
- Keep contact data protected:
  - `PlayerContact` still excluded by default
  - server-side RBAC check gates any contact inclusion

## 6) UI Component Plan (Filters + Sortable Tables)

- Initial milestone uses server-rendered forms + query params for reliability.
- Filter controls:
  - standard `<select>` + `<input>` controls, validated server-side.
- Sort controls:
  - team sort selector (`team`, `needed`, `assigned`, `committed`)
- Table behavior:
  - responsive overflow table containers
  - links to team/player detail pages
  - no client-side contact leakage

## Implemented Scope in this Milestone

- Schema + seed model updates
- Optional CSV seed import scaffolding
- Dashboard page and service foundations
- Player model/action/view updates for new enums/fields
- Existing contact privacy behavior preserved
