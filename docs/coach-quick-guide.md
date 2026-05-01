# Coach quick start

Short reference for daily use of the Club player tracker (MVP). For deeper technical detail, see the root [`README.md`](../README.md).

## Signing in

- Open the app URL; you are sent to **`/login`**.
- Use the club **shared coach password** (not your email password—this MVP uses one shared credential).
- Pick **who you are** from the coach list so edits are attributed correctly.

## What you can change (coach)

- Create and edit **players** when you created them **or** they are on **your team** (_assignment-based access_).
- See **teams** club-wide for planning; edits to recruiting fields follow the same assignment rules unless you are Super Admin.

Super Admin can edit more (including roster “committed” counts and full contact visibility). Coaches see fewer fields by design—see RBAC notes in [`README.md`](../README.md).

## Team-building dashboard (`/dashboard`)

1. Choose **Season** (and other roster filters): pathway, location, gender, coach, team, sort order for the **team status** table.
2. Set **cohort filters** for the **matching players** list: youngest/oldest age group, optional DOB range, scouting fields (evaluation, pipeline status, position, play-up).
3. **Apply filters** after changing season text or dates; other dropdowns update as indicated on the page.
4. Click **column headers** on the players grid to sort (first click ascending, second toggles descending).
5. Use **Copy table** on **Team status** or **Players matching filters** to copy tab-separated text for Excel, email, or notes.

Reminder: Coach/team dropdowns primarily scope the **team table**; the player grid follows cohort + scouting filters listed on the dashboard.

## Players and teams

- **Teams:** open a team from the list or dashboard links to `/teams/[id]` for recruiting context.
- **Players:** use `/players` and open a profile; pool vs assigned status appears in lists and dashboard copy.

If something looks missing, confirm you’re on the intended **season** and that filters aren’t narrower than you expect.

## Need help?

- Permission and contact checklist: [`phase-6-permissions-checklist.md`](./phase-6-permissions-checklist.md)
- Dashboard roadmap / design notes: [`milestone-7-team-building-dashboard-plan.md`](./milestone-7-team-building-dashboard-plan.md)
