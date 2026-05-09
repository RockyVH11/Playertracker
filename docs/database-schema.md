# Database schema (readable reference)

**Source of truth:** [`prisma/schema.prisma`](../prisma/schema.prisma). Regenerate migrations and this doc manually when the schema changes.

**Legend**

| Symbol | Meaning |
|--------|---------|
| **Req** | You must supply a value on insert (no `?`, no `@default`). |
| **Def** | Prisma/database supplies a default; you usually omit it on insert. |
| **Opt** | Nullable (`?`) or optional relation. |

Types use Prisma/JavaScript names (`String`, `Int`, `Boolean`, `DateTime`). Date-only columns use `@db.Date` in the schema.

---

## Enums

| Enum | Values |
|------|--------|
| `Role` | SUPER_ADMIN, COACH |
| `Gender` | BOYS, GIRLS |
| `EvaluationLevel` | RL, N1, N2, GRASSROOTS, NOT_EVALUATED |
| `PlayerStatus` | AVAILABLE, INVITED, COMMITTED, NOT_INTERESTED, ARCHIVED |
| `PlayerPosition` | GK, DEFENDER, MIDFIELDER, FORWARD, UTILITY, UNKNOWN |
| `PlayerSource` | COACH_ENTERED, PARENT_INTEREST_FORM, OPEN_SESSION, EXISTING_PLAYER, COACH_REFERRAL, OTHER |
| `PlacementPriority` | HIGH, MEDIUM, LOW, WATCH_LIST |
| `StaffRole` | DIRECTOR, COACH, MANAGER |
| `ProspectType` | PLAYER, TEAM, COACH |
| `ProspectStatus` | NEW, ASSIGNED, CONTACTED, IN_PROGRESS, CONVERTED, CLOSED |
| `DayOfWeek` | SUN … SAT |
| `FieldRequestStatus` | PENDING, APPROVED, DENIED, CANCELLED |
| `EquipmentReservationStatus` | ACTIVE, CANCELLED, COMPLETED |

---

## Tables (models → PostgreSQL `public."ModelName"`)

Prisma maps each model to a table matching the model name unless `@@map` is used (this project uses default names).

### `User`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | `@default(cuid())` PK |
| `email` | String | Opt | `@unique` |
| `displayName` | String | Req | |
| `role` | Role | Req | SUPER_ADMIN \| COACH |
| `createdAt` | DateTime | Def | `now()` |
| `updatedAt` | DateTime | Def | `@updatedAt` |

---

### `Coach`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `firstName` | String | Req | |
| `lastName` | String | Req | |
| `email` | String | Opt | `@unique` |
| `phone` | String | Opt | |
| `staffRoleLabel` | String | Opt | CSV / display label |
| `staffRole` | StaffRole | Def | default COACH |
| `primaryAreaLabel` | String | Opt | |
| `primaryLocationId` | String | Opt | FK → Location |
| `isActive` | Boolean | Def | default true |
| `createdAt` | DateTime | Def | |
| `updatedAt` | DateTime | Def | `@updatedAt` |

---

### `Location`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `name` | String | Req | `@unique` |
| `createdAt` | DateTime | Def | |
| `updatedAt` | DateTime | Def | `@updatedAt` |

---

### `League`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `name` | String | Req | `@unique` |
| `allowedGender` | Gender | Opt | |
| `conference` | String | Opt | |
| `ageGroup` | String | Opt | |
| `hierarchy` | Int | Opt | |
| `capacity` | Int | Opt | |
| `format` | String | Opt | |
| `notes` | String | Opt | |
| `adminOverrideAllowed` | Boolean | Def | default true |
| `createdAt` | DateTime | Def | |
| `updatedAt` | DateTime | Def | `@updatedAt` |

---

### `Team`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `seasonLabel` | String | Req | e.g. 2026-2027 |
| `teamName` | String | Req | |
| `locationId` | String | Req | FK → Location |
| `gender` | Gender | Req | |
| `ageGroup` | String | Req | |
| `coachId` | String | Req | FK → Coach |
| `leagueId` | String | Opt | FK → League |
| `openSession` | Boolean | Def | default true |
| `committedPlayerCount` | Int | Def | default 0 |
| `coachEstimatedPlayerCount` | Int | Def | default 0 |
| `returningPlayerCount` | Int | Def | default 0 |
| `neededPlayerCount` | Int | Def | default 0 |
| `neededGoalkeepers` … `neededUtility` | Int | Def | defaults 0 |
| `recruitingNeeds` | String | Opt | |
| `notes` | String | Opt | |
| `createdAt` | DateTime | Def | |
| `updatedAt` | DateTime | Def | `@updatedAt` |

---

### `AgeGroupRule`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `seasonLabel` | String | Req | |
| `gender` | Gender | Req | |
| `ageGroup` | String | Req | |
| `dobStart` | DateTime | Req | `@db.Date` |
| `dobEnd` | DateTime | Req | `@db.Date` |
| `sortOrder` | Int | Req | |
| `isActive` | Boolean | Def | default true |
| `createdAt` | DateTime | Def | |
| `updatedAt` | DateTime | Def | `@updatedAt` |

**Unique:** (`seasonLabel`, `gender`, `ageGroup`)

---

### `Player`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `seasonLabel` | String | Req | |
| `firstName` | String | Req | |
| `lastName` | String | Req | |
| `dob` | DateTime | Req | `@db.Date` |
| `gender` | Gender | Req | |
| `derivedAgeGroup` | String | Req | |
| `overrideAgeGroup` | String | Opt | |
| `locationId` | String | Req | FK → Location |
| `assignedTeamId` | String | Opt | FK → Team |
| `leagueInterestId` | String | Opt | FK → League |
| `playerStatus` | PlayerStatus | Def | default AVAILABLE |
| `willingToPlayUp` | Boolean | Def | default false |
| `primaryPosition` | PlayerPosition | Def | default UNKNOWN |
| `secondaryPosition` | PlayerPosition | Opt | |
| `playerSource` | PlayerSource | Def | default COACH_ENTERED |
| `placementPriority` | PlacementPriority | Def | default MEDIUM |
| `externalInterestFormId` | String | Opt | |
| `sourceSubmittedAt` | DateTime | Opt | |
| `importedFromInterestForm` | Boolean | Def | default false |
| `evaluationLevel` | EvaluationLevel | Def | default NOT_EVALUATED |
| `evaluationNotes` | String | Opt | |
| `evaluationAuthorCoachId` | String | Opt | FK → Coach |
| `evaluationAuthorUserId` | String | Opt | FK → User |
| `evaluationUpdatedAt` | DateTime | Opt | |
| `createdByCoachId` | String | Opt | FK → Coach |
| `createdByUserId` | String | Opt | FK → User |
| `updatedByUserId` | String | Opt | FK → User |
| `createdAt` | DateTime | Def | |
| `updatedAt` | DateTime | Def | `@updatedAt` |

`PlayerContact` is 1:1 (see below).

---

### `PlayerContact`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `playerId` | String | Req | PK, FK → Player (Cascade delete) |
| `guardianName` | String | Opt | |
| `guardianPhone` | String | Opt | |
| `guardianEmail` | String | Opt | |
| `createdAt` | DateTime | Def | |
| `updatedAt` | DateTime | Def | `@updatedAt` |

---

### `Prospect`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `prospectType` | ProspectType | Req | PLAYER \| TEAM \| COACH |
| `prospectName` | String | Req | Display name |
| `contactFirstName` … `contactEmail` | String | Opt | |
| `locationId` | String | Opt | FK → Location |
| `locationUnknown` | Boolean | Def | default false |
| `assignedToCoachId` | String | Opt | FK → Coach |
| `submittedByCoachId` | String | Req | FK → Coach |
| `notes` | String | Opt | |
| `status` | ProspectStatus | Def | default NEW |
| `createdAt` | DateTime | Def | |
| `updatedAt` | DateTime | Def | `@updatedAt` |
| `assignedAt` … `closedAt` | DateTime | Opt | |

---

### `Complex`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `locationId` | String | Req | FK → Location |
| `name` | String | Req | |
| `notes` | String | Opt | |
| `isActive` | Boolean | Def | default true |
| `createdAt` | DateTime | Def | |
| `updatedAt` | DateTime | Def | `@updatedAt` |

---

### `Field`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `complexId` | String | Req | FK → Complex |
| `name` | String | Req | |
| `notes` | String | Opt | |
| `isActive` | Boolean | Def | default true |
| `createdAt` | DateTime | Def | |
| `updatedAt` | DateTime | Def | `@updatedAt` |

---

### `ComplexAvailability`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `complexId` | String | Req | FK → Complex |
| `dayOfWeek` | DayOfWeek | Req | |
| `startTime` | String | Req | Local `HH:mm` (24h) |
| `endTime` | String | Req | |
| `slotMinutes` | Int | Def | default 30 |
| `isActive` | Boolean | Def | default true |

---

### `FieldAvailability`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `fieldId` | String | Req | FK → Field |
| `dayOfWeek` | DayOfWeek | Req | |
| `startTime` | String | Req | Local `HH:mm` |
| `endTime` | String | Req | |
| `slotMinutes` | Int | Def | default 30 |
| `isActive` | Boolean | Def | default true |

---

### `FieldRequest`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `seasonLabel` | String | Req | |
| `teamId` | String | Req | FK → Team |
| `requestedByCoachId` | String | Req | FK → Coach |
| `preferredDayOfWeek` | DayOfWeek | Req | |
| `preferredStartTime` | String | Req | |
| `preferredSessionLengthMinutes` | Int | Req | |
| `preferredFieldId` | String | Opt | FK → Field |
| `recurrenceRequested` | Boolean | Def | default false |
| `recurrenceEndDate` | DateTime | Opt | `@db.Date` |
| `duplicateToOtherDays` | DayOfWeek[] | Def | default `[]` |
| `notes` | String | Opt | |
| `status` | FieldRequestStatus | Def | default PENDING |
| `directorNotes` | String | Opt | |
| `createdAt` | DateTime | Def | |
| `updatedAt` | DateTime | Def | `@updatedAt` |

---

### `FieldAssignment`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `seasonLabel` | String | Req | |
| `teamId` | String | Req | FK → Team |
| `fieldId` | String | Req | FK → Field |
| `assignmentDate` | DateTime | Req | `@db.Date` |
| `startTime` | String | Req | Local `HH:mm` |
| `endTime` | String | Req | |
| `recurrenceGroupId` | String | Opt | Series grouping |
| `sourceRequestId` | String | Opt | FK → FieldRequest |
| `notes` | String | Opt | |
| `createdAt` | DateTime | Def | |
| `updatedAt` | DateTime | Def | `@updatedAt` |

---

### `FieldBlackout`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `complexId` | String | Req | FK → Complex |
| `fieldId` | String | Opt | FK → Field |
| `blackoutDate` | DateTime | Req | `@db.Date` |
| `startTime` | String | Opt | |
| `endTime` | String | Opt | |
| `reason` | String | Opt | |
| `createdAt` | DateTime | Def | |
| `updatedAt` | DateTime | Def | `@updatedAt` |

---

### `EquipmentItem`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `locationId` | String | Req | FK → Location |
| `name` | String | Req | |
| `description` | String | Opt | |
| `concurrentCapacity` | Int | Def | default 1 |
| `isActive` | Boolean | Def | default true |
| `createdAt` | DateTime | Def | |
| `updatedAt` | DateTime | Def | `@updatedAt` |

---

### `EquipmentReservation`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `equipmentItemId` | String | Req | FK → EquipmentItem |
| `teamId` | String | Req | FK → Team |
| `reservedByCoachId` | String | Req | FK → Coach |
| `reservationDate` | DateTime | Req | `@db.Date` |
| `startTime` | String | Req | |
| `endTime` | String | Req | |
| `quantity` | Int | Def | default 1 |
| `linkedFieldAssignmentId` | String | Opt | FK → FieldAssignment |
| `status` | EquipmentReservationStatus | Def | default ACTIVE |
| `notes` | String | Opt | |
| `createdAt` | DateTime | Def | |
| `updatedAt` | DateTime | Def | `@updatedAt` |

---

### `AuditLog`

| Field | Type | Req / Def / Opt | Notes |
|-------|------|-----------------|-------|
| `id` | String | Def | cuid PK |
| `actorRole` | Role | Req | SUPER_ADMIN \| COACH (legacy enum used for audit payloads) |
| `actorUserId` | String | Opt | FK concept to User |
| `entityType` | String | Req | |
| `entityId` | String | Req | |
| `action` | String | Req | |
| `payloadJson` | String | Opt | Serialized JSON |
| `createdAt` | DateTime | Def | |

---

## Quick checklist for new inserts (strictly required scalar fields only)

Ignoring auto ids and timestamps defaults: **Coach** (`firstName`, `lastName`); **Location** (`name`); **Team** (`seasonLabel`, `teamName`, `locationId`, `gender`, `ageGroup`, `coachId`); **Player** (`seasonLabel`, `firstName`, `lastName`, `dob`, `gender`, `derivedAgeGroup`, `locationId`); **Prospect** (`prospectType`, `prospectName`, `submittedByCoachId`); field models need their FK IDs and labeling fields per tables above.

For production schema sync, always run **`npx prisma migrate deploy`** against the target database after pulling migrations — see [`README.md`](../README.md).
