# Phase 6 Permission Regression Checklist

Use this checklist whenever RBAC, player visibility, or team assignment behavior changes.

## Preconditions

- Seeded or real data includes at least:
  - two coaches (`coachA`, `coachB`)
  - one player created by `coachA`
  - one player assigned to `coachB` team
  - one unassigned player in the pool
- You can sign in as:
  - Super Admin
  - Coach A
  - Coach B

## Contact Privacy

- Super Admin can view contact fields for all players.
- Coach A can view contact for:
  - players created by Coach A
  - players assigned to Coach A teams
- Coach A cannot view contact for players outside those ownership rules.
- Coach B sees the mirrored behavior for Coach B-owned players.
- Hidden-contact players show non-sensitive fallback message and no contact edit inputs.

## Edit Permissions

- Super Admin can edit any player and any team field.
- Coach can edit player only when:
  - `createdByCoachId == currentCoachId`, or
  - `assignedTeam.coachId == currentCoachId`
- Coach cannot edit other coaches' players.
- Coach can edit only team-side fields in MVP (estimate + recruiting needs) for their own team.
- Coach cannot change `committedPlayerCount`.

## Assignment / Availability

- Player with `assignedTeamId = null` appears in "available/unassigned" filters.
- Player with `assignedTeamId != null` appears in "assigned" filters.
- Team `assignedPlayerCount` is computed from current player assignments (not manually editable).

## Duplicate Warning (Soft)

- Creating a player with same season + gender + DOB + trim/lower first and last name:
  - does not block create
  - shows duplicate warning on redirect

## Security Smoke Checks

- Direct URL access to app pages without session redirects to `/login`.
- Attempted form posts with invalid IDs show friendly error redirect (no stack page).
- No API/page response includes `PlayerContact` unless RBAC check passes server-side.
