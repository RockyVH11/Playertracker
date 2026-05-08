# Director quick start

Short reference for directors using field infrastructure, approvals, and club oversight workflows. For setup and environment details, see [`README.md`](../README.md).

## Signing in

1. Open the app and go to ` /login `.
2. Select **Director** mode.
3. Enter the **director shared password** (`DIRECTOR_SHARED_PASSWORD`).
4. Pick your name from the director-only staff list.

If your name is missing, confirm your staff role is set to `DIRECTOR` in staff records.

## Daily director workflows

- Review operational dashboards from top navigation:
  - Field dashboard and schedule
  - Field requests and approvals
  - Equipment reservations and overrides
  - Team-building dashboard for roster planning
- Use wizard/grid scheduling to place or move sessions.
- Approve or deny pending requests that require director privileges.
- Reserve equipment directly, including week-range overrides unavailable to standard coach mode.

## Permission scope (director)

- Directors have location-scoped infrastructure administration privileges.
- Directors can access director-only actions in field management, approvals, and scheduling.
- Directors still sign in as staff identities (not global super-admin) so actions are attributed to a named staff member.

## Common checks

1. Confirm you selected **Director** mode (not Coach) at login.
2. Confirm the environment has `DIRECTOR_SHARED_PASSWORD` configured (local and production as needed).
3. Confirm your staff row role is `DIRECTOR` and active.

## Need help?

- Field scheduling implementation notes: [`field-scheduling-plan.md`](./field-scheduling-plan.md)
- Permissions checklist: [`phase-6-permissions-checklist.md`](./phase-6-permissions-checklist.md)
