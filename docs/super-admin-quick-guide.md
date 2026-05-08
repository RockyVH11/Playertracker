# Super admin quick start

Short reference for full-access club administration workflows. For environment and deployment setup, see [`README.md`](../README.md).

## Signing in

1. Open the app and go to ` /login `.
2. Select **Super admin** mode.
3. Enter the **super admin password** (`SUPER_ADMIN_PASSWORD`).

Super admin mode does not require selecting a staff identity from the coach/director list.

## What super admin can do

- Full edit access across teams, players, scheduling, equipment, and admin dashboards.
- Cross-location field infrastructure management.
- Team-building and roster administration for all teams.
- Access to admin-only controls that coaches/directors cannot use.

## Core daily flows

- Validate club-wide data quality (teams, player assignments, and recruiting status).
- Monitor and intervene in scheduling conflicts or operational blockers.
- Review director/coach workflows when escalation is needed.
- Perform release verification after deployments (auth, schedule, requests, equipment, dashboards).

## Safety habits

1. Prefer the smallest necessary change, even with full access.
2. Confirm season, location, and team filters before bulk edits.
3. For production releases, ensure DB migrations and required env vars are applied before final checks.

## Need help?

- Team-building roadmap and context: [`milestone-7-team-building-dashboard-plan.md`](./milestone-7-team-building-dashboard-plan.md)
- Field scheduling implementation notes: [`field-scheduling-plan.md`](./field-scheduling-plan.md)
