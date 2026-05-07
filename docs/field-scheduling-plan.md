# Field scheduling + equipment — plan

## 1. Prisma schema (implemented in `schema.prisma` + migration `20260430210000_field_scheduling_foundation`)

Enums: `DayOfWeek`, `FieldRequestStatus`, `EquipmentReservationStatus`.

Models:

- **Complex**: `locationId`, `name`, `notes`, `isActive`.
- **Field**: `complexId`, `name`, `notes`, `isActive`.
- **ComplexAvailability**: open windows per weekday + `slotMinutes` (consumers in Phase B).
- **FieldRequest**: coach preferences, duplication weekdays (`DayOfWeek[]`), status, tie to Team + Coach.
- **FieldAssignment**: concrete slots (`assignmentDate`, `startTime`, `endTime`), optional recurrence group + optional `sourceRequestId`, `notes`.
- **FieldBlackout**: optional `fieldId` (null = complex-wide).
- **EquipmentItem**, **EquipmentReservation**: optional link to assignment for autofill UX.

Times are stored as local `TEXT` `"HH:mm"` (24h); document single club timezone assumption.

## 2. Migration plan

- Folder: `20260430210000_field_scheduling_foundation` (Neon/production: `npx prisma migrate deploy`).
- If `migrate dev` shadow DB breaks on BOM in old migrations: fix BOM in `init` migration later, or rely on deploy-only pipelines.

## 3. RBAC

- **SUPER_ADMIN**: all locations/complexes/fields/requests/assignments/blackouts/equipment.
- **DIRECTOR** (primary location): complexes, availability, requests for their location, approvals, assignments, blackouts, equipment overrides.
- **COACH**: create field requests (their teams), reserve equipment (rules in Phase H), read schedules (`/fields`).
- **MANAGER**: read schedules only (`/fields` Phase 6 helpers).

Implement per route/action with `@/lib/rbac-fields` (+ extend for requests/equipment in later phases).

## 4–5. Requests + assignments workflows

Requests: Coach submits **FieldRequest** (PENDING). Director board `/fields/requests` filters by status. **Approve** requires a calendar date, field, and start/end; in one transaction the request is marked APPROVED and a **FieldAssignment** is created with `sourceRequestId` (same conflict rules as the schedule grid). **Deny** sets DENIED + `directorNotes`. Cancelled by coach if still PENDING.

Assignments: Director grid `/fields/schedule` creates/edits **FieldAssignment** (with or without request). Persist `recurrenceGroupId` when expanding recurrence. Conflict engine: overlaps on same `fieldId` plus same-window team double-book (optional director override flag later).

Rule: assigning from coach request keeps `sourceRequestId` populated; spontaneous grid drops use null — policy layer can tighten “coach flow must originate from request.”

## 6. Schedule grid UI

Week columns (or horizontal fields × vertical slots). Backend: assignments + blackouts for range. DnD: draggable chip for Team + draggable **PENDING** request; drop opens modal for length, recurrence, duplicates, end date; server validates batch create. Use 30m steps from **ComplexAvailability** (Phase B hooks).

## 7. Field dashboard analytics

`/fields/dashboard`: for week + month windows, count slot capacity from availability minus blackouts; count used from assignments (blackout overrides display: still count used for raw data, second line “blocked by blackout” if needed). Break down by complex, field, weekday. Charts: simple bar + line (reuse minimal chart lib or CSS bars). Printable view = same page `@media print`.

## 8. Equipment reservation

Validations: per **pooled** `EquipmentItem`, sum of `quantity` on overlapping ACTIVE reservations must not exceed `concurrentCapacity` (e.g. four small goals); coaches may create **multiple reservations** (different items or times) for one session; coach “current week” window (Phase H). Director/admin bypass. Link from assignment row pre-fills date/time/team.

## 9. Copy schedule tool

Select source week start + dest week start; clone **FieldAssignment** rows (strip or preserve `recurrenceGroupId` per product choice); run same conflict checks as grid save; transactional apply or per-row errors report.

## 10. Print / export

- Print: print stylesheet on schedule + dashboard.
- CSV: server action streaming rows (assignments × fields × times).
- PDF: generate on server (e.g. React-PDF or HTML → PDF) or defer to “print to PDF” MVP.

## Phases

| Phase | Scope |
|-------|--------|
| A | Complex + Field admin (`/fields/complexes`) — **done** |
| B | Complex availability CRUD + reader for slot builder — **done** (windows on complex detail) |
| C | Field requests coach + director board — **done** (deny; approve with assignment) |
| D | Director schedule grid + conflicts — **done** (`/fields/schedule`, day grid, add/remove, overlap checks) |
| E | Blackouts + display override — **done** (`/fields/blackouts` CRUD; schedule shows blackouts over assignments) |
| F | Dashboard analytics — **done** (`/fields/dashboard`, week + month rollups, by complex + weekday bars) |
| G | Copy week — **done** (schedule page: copy week form; conflict checks per day; strips recurrence + request links on clones) |
| H | Equipment items + reservations + rules — **done** (`/fields/equipment`; pool capacity + `quantity` per booking; multiple reservations per session; coach week; director/admin bypass; schedule → equipment prefill) |
| I | Print/export polish |

## Next Iteration Bookmark (requested)

### A) Schedule wizard interaction model

- Keep both interactions on assignment chips:
  - click chip = open session menu (duplicate/recurrence/delete)
  - drag chip = move assignment
- Add drag guard so click and drag do not conflict:
  - prefer a dedicated drag handle on chip, or
  - movement threshold before drag starts

### B) Unscheduled list (4 tabs)

Build a left panel on `/fields/schedule` wizard with tabs:

1. **Pending** (default) — combines:
   - `FieldRequest` with `PENDING` (drag to grid)
   - active **equipment reservations** from today or the viewed date onward (approve/deny)
2. **Teams under 2 sessions this week**
3. **All teams**
4. **Open equipment** — catalog of active `EquipmentItem` at the location; booking still on `/fields/equipment`

### C) Drag action semantics (server)

- **Move action**: drag existing assignment chip to new slot/field; update assignment.
- **Create action**: drag unscheduled item to slot; create assignment.
- Shared validation gates for both:
  - RBAC checks
  - overlap/conflict checks
  - blackout + complex availability checks
  - request/status constraints (when source is request-driven)

### D) Future equipment page redesign bookmark

Keep current catalog, but move it behind a secondary link/tab. Make main equipment page workflow:

1. Team selector (teams in your location)
2. Show selected team weekly training schedule in grid
3. Click a training session to open available equipment during that session
4. Select items/quantities to create reservation request tied to session

This supports a coach-first flow: "pick team -> pick session -> request gear".

### E) Complex + field availability model (bookmark)

- Complex availability remains the required baseline schedule by day/time.
- Field availability defaults to complex windows, but can be narrowed:
  - optional per-field closures during complex-open hours
  - optional per-field narrower windows
- Validation rules:
  - field windows must be contained inside complex windows
  - no field window may exist on a day the complex is closed
- Wizard/grid behavior:
  - default slot generation from selected complex/day windows
  - if complex closed on day: show "complex not open on date"
  - when field overrides exist, blocked field slots render unavailable/greyed

### F) Copy complex day schedule — **done** (schedule page: “Copy complex day”)

- Copies all assignments for one complex on a source calendar day to one or more destination days.
- Optional **weekly recurrence**: same weekday as the first destination date, from that date through “Repeat weekly until” (inclusive).
- Same conflict batch rules as copy week: if any destination day would overlap existing assignments, the whole operation is blocked.
- Recurrence groups and field-request links are cleared on copies (same as copy week).

## Wizard Smoke Checklist (May 2026)

Automated coverage now exists for wizard server actions:

- `createFieldAssignmentFromWizardDropAction`: success + conflict path
- `moveFieldAssignmentFromWizardDragAction`: success + source-not-found path
- Test file: `src/app/actions/field-assignments.wizard.test.ts`

Manual smoke pass (run on `/fields/schedule?view=wizard`):

- [ ] Drag a team card from **All teams** to an open slot -> assignment appears after refresh.
- [ ] Drag a **Pending field request** card to an open slot -> assignment appears for the request team.
- [ ] Drag an existing assignment using the **Move** handle to a new slot on same field -> start/end times shift, session length preserved.
- [ ] Drag an existing assignment to a different field same date -> field changes and chip renders in target cell.
- [ ] Attempt drop onto conflicting slot -> error banner appears; no assignment created/moved.
- [ ] Attempt drop onto greyed/unavailable slot -> no create/move occurs.
- [ ] Open a session chip (click, not drag) -> modal opens; **Delete this session** works and grid refreshes.
- [ ] Apply recurrence from session modal -> success message includes created/skipped counts.
