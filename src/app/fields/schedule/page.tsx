import Link from "next/link";
import { redirect } from "next/navigation";
import { EquipmentReservationStatus, FieldRequestStatus, type Gender } from "@prisma/client";
import { copyComplexDayAction } from "@/app/actions/field-assignment-copy-day";
import { copyFieldWeekAction } from "@/app/actions/field-assignment-copy-week";
import {
  createFieldAssignmentAction,
  deleteFieldAssignmentAction,
} from "@/app/actions/field-assignments";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import {
  addMinutesToHm,
  assignmentOverlapsSlot,
  slotCoveredByAvailabilityWindows,
} from "@/lib/fields/assignment-intervals";
import { blackoutAppliesToField, blackoutBlocksSlot } from "@/lib/fields/blackout-display";
import { dayOfWeekFromDate } from "@/lib/fields/day-of-week-from-date";
import { dayOfWeekLabel } from "@/lib/fields/day-of-week-order";
import {
  addDaysLocal,
  formatYmdLocal,
  parseYmdLocal,
  startOfWeekSunday,
} from "@/lib/fields/local-date";
import {
  DEFAULT_SCHEDULE_VIEWPORT_HOURS,
  DEFAULT_SCHEDULE_VIEW_START_HM,
} from "@/lib/fields/schedule-view-window";
import { clampSlotWindowStart } from "@/lib/fields/clamp-slot-window";
import {
  buildScheduleSlotStartsForLocation,
  buildSlotStartsFromAvailabilityWindows,
} from "@/lib/fields/schedule-slots";
import { ScheduleGridScrollArea } from "@/components/fields/schedule-grid-scroll-area";
import { ScheduleWizard } from "@/components/fields/schedule-wizard";
import { prisma } from "@/lib/prisma";
import {
  canManageFieldComplexesForLocation,
  mayAccessFieldInfrastructureAdmin,
} from "@/lib/rbac-fields";

export const dynamic = "force-dynamic";

const SLOT_MINUTES = 30;

function wizardTeamLabel(
  gender: Gender,
  ageGroup: string,
  coach: { firstName: string; lastName: string }
): string {
  const sex = gender === "BOYS" ? "Boys" : "Girls";
  const name =
    `${coach.firstName?.trim() ?? ""} ${coach.lastName?.trim() ?? ""}`.trim() || "Coach";
  return `${ageGroup} · ${sex} · ${name}`;
}

type Props = {
  searchParams?: Promise<{
    locationId?: string;
    date?: string;
    requestId?: string;
    error?: string;
    view?: string;
    complexId?: string;
    durationMinutes?: string;
    windowStart?: string;
    notice?: string;
  }>;
};

function asString(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  return undefined;
}

export default async function FieldSchedulePage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  let viewerStaffRole: import("@prisma/client").StaffRole | null = null;
  let primaryLocationId: string | null = null;
  if (session.role !== "SUPER_ADMIN") {
    if (!isCoachSession(session)) redirect("/login");
    const row = await prisma.coach.findFirst({
      where: { id: session.coachId, isActive: true },
      select: { staffRole: true, primaryLocationId: true },
    });
    if (!row) redirect("/login");
    viewerStaffRole = row.staffRole;
    primaryLocationId = row.primaryLocationId;
    if (!mayAccessFieldInfrastructureAdmin(session, viewerStaffRole)) redirect("/teams");
  }

  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? decodeURIComponent(sp.error) : null;

  const locations = await prisma.location.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const requestedLoc = asString(sp.locationId)?.trim();
  const requestedDate = asString(sp.date)?.trim();

  let selectedLocationId: string | null = null;
  if (session.role === "SUPER_ADMIN") {
    selectedLocationId =
      requestedLoc && locations.some((l) => l.id === requestedLoc)
        ? requestedLoc
        : null;
  } else {
    selectedLocationId = primaryLocationId;
  }

  if (
    selectedLocationId &&
    !canManageFieldComplexesForLocation(
      session,
      viewerStaffRole,
      primaryLocationId,
      selectedLocationId
    )
  ) {
    redirect("/teams");
  }

  if (!selectedLocationId) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-6 sm:px-6">
        <h1 className="text-xl font-semibold text-slate-900">Field schedule</h1>
        {session.role === "SUPER_ADMIN" ? (
          <form className="space-y-3 rounded border border-slate-200 bg-white p-4" method="get">
            <input type="hidden" name="date" value={requestedDate ?? formatYmdLocal(new Date())} />
            <label className="block text-xs font-medium text-slate-700" htmlFor="loc">
              Location
            </label>
            <select
              id="loc"
              name="locationId"
              required
              className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select location…
              </option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Continue
            </button>
            <button
              type="submit"
              name="view"
              value="wizard"
              className="ml-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              Scheduling wizard
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-600">
            Set a primary location on your staff profile to use the schedule grid.
          </p>
        )}
      </div>
    );
  }

  const today = new Date();
  const selectedDate =
    requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? parseYmdLocal(requestedDate)
      : today;
  const dateYmd = formatYmdLocal(selectedDate);
  const dow = dayOfWeekFromDate(selectedDate);
  const weekStart = startOfWeekSunday(selectedDate);

  const locationRow = locations.find((l) => l.id === selectedLocationId);
  const locationName = locationRow?.name ?? "Location";

  const reqIdParam = asString(sp.requestId)?.trim();
  const viewMode = asString(sp.view)?.trim() === "wizard" ? "wizard" : "grid";
  const requestedComplexId = asString(sp.complexId)?.trim();
  const requestedDuration = asString(sp.durationMinutes)?.trim();
  const requestedWindowStart = asString(sp.windowStart)?.trim();
  const notice = typeof sp.notice === "string" ? decodeURIComponent(sp.notice) : null;

  const dateYmdToday = formatYmdLocal(new Date());
  const equipmentReservationFromDate =
    dateYmd < dateYmdToday ? parseYmdLocal(dateYmdToday) : selectedDate;

  const [
    complexes,
    fields,
    assignments,
    pendingRequests,
    locationDayAvailability,
    fieldDayAvailability,
    prefillRequest,
    teams,
    blackouts,
    weeklyAssignmentCounts,
    openEquipmentReservations,
    equipmentCatalogItems,
  ] = await Promise.all([
    prisma.complex.findMany({
      where: { isActive: true, locationId: selectedLocationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.field.findMany({
      where: {
        isActive: true,
        complex: { locationId: selectedLocationId, isActive: true },
      },
      include: { complex: { select: { name: true } } },
      orderBy: [{ complex: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.fieldAssignment.findMany({
      where: {
        assignmentDate: selectedDate,
        field: { complex: { locationId: selectedLocationId } },
      },
      include: {
        team: {
          select: {
            teamName: true,
            gender: true,
            ageGroup: true,
            coach: { select: { firstName: true, lastName: true } },
          },
        },
        field: { select: { name: true } },
      },
      orderBy: [{ startTime: "asc" }],
    }),
    prisma.fieldRequest.findMany({
      where: {
        status: FieldRequestStatus.PENDING,
        team: { locationId: selectedLocationId },
      },
      include: {
        team: { select: { teamName: true, seasonLabel: true } },
        requestedByCoach: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.complexAvailability.findMany({
      where: {
        isActive: true,
        dayOfWeek: dow,
        complex: { locationId: selectedLocationId, isActive: true },
      },
      select: { startTime: true, endTime: true, complexId: true },
    }),
    prisma.fieldAvailability.findMany({
      where: {
        isActive: true,
        dayOfWeek: dow,
        field: { complex: { locationId: selectedLocationId, isActive: true } },
      },
      select: { startTime: true, endTime: true, fieldId: true },
    }),
    reqIdParam
      ? prisma.fieldRequest.findFirst({
          where: {
            id: reqIdParam,
            team: { locationId: selectedLocationId },
          },
          include: { team: { select: { id: true } } },
        })
      : Promise.resolve(null),
    prisma.team.findMany({
      where: { locationId: selectedLocationId },
      orderBy: { teamName: "asc" },
      select: {
        id: true,
        teamName: true,
        seasonLabel: true,
        gender: true,
        ageGroup: true,
        coach: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.fieldBlackout.findMany({
      where: {
        blackoutDate: selectedDate,
        complex: { locationId: selectedLocationId },
      },
      select: {
        id: true,
        complexId: true,
        fieldId: true,
        startTime: true,
        endTime: true,
        reason: true,
      },
    }),
    prisma.fieldAssignment.groupBy({
      by: ["teamId"],
      where: {
        assignmentDate: {
          gte: weekStart,
          lte: addDaysLocal(weekStart, 6),
        },
        team: { locationId: selectedLocationId },
      },
      _count: { _all: true },
    }),
    prisma.equipmentReservation.findMany({
      where: {
        status: EquipmentReservationStatus.ACTIVE,
        reservationDate: {
          gte: equipmentReservationFromDate,
        },
        equipmentItem: { locationId: selectedLocationId },
      },
      include: {
        equipmentItem: { select: { name: true } },
        team: { select: { teamName: true } },
        reservedByCoach: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }],
      take: 40,
    }),
    prisma.equipmentItem.findMany({
      where: { locationId: selectedLocationId, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        concurrentCapacity: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const assignmentCountByTeam = new Map(
    weeklyAssignmentCounts.map((row) => [row.teamId, row._count._all])
  );
  const underScheduledTeams = teams
    .map((team) => ({
      id: team.id,
      ageGroup: team.ageGroup,
      gender: team.gender,
      coach: team.coach,
      assignmentCount: assignmentCountByTeam.get(team.id) ?? 0,
    }))
    .filter((team) => team.assignmentCount < 2)
    .sort((a, b) => a.assignmentCount - b.assignmentCount || a.ageGroup.localeCompare(b.ageGroup));

  const availabilityWindowsByComplex = new Map<string, { startTime: string; endTime: string }[]>();
  for (const row of locationDayAvailability) {
    const list = availabilityWindowsByComplex.get(row.complexId) ?? [];
    list.push({ startTime: row.startTime, endTime: row.endTime });
    availabilityWindowsByComplex.set(row.complexId, list);
  }
  const fieldAvailabilityByField = new Map<string, { startTime: string; endTime: string }[]>();
  for (const row of fieldDayAvailability) {
    const list = fieldAvailabilityByField.get(row.fieldId) ?? [];
    list.push({ startTime: row.startTime, endTime: row.endTime });
    fieldAvailabilityByField.set(row.fieldId, list);
  }

  let slotStarts =
    locationDayAvailability.length > 0
      ? buildSlotStartsFromAvailabilityWindows(
          locationDayAvailability.map(({ startTime, endTime }) => ({ startTime, endTime })),
          SLOT_MINUTES
        )
      : await buildScheduleSlotStartsForLocation(selectedLocationId, dow, SLOT_MINUTES);
  if (slotStarts.length === 0) {
    slotStarts = await buildScheduleSlotStartsForLocation(selectedLocationId, dow, SLOT_MINUTES);
  }

  const selectedComplexId =
    requestedComplexId && complexes.some((c) => c.id === requestedComplexId)
      ? requestedComplexId
      : complexes[0]?.id ?? "";

  const wizardFields = selectedComplexId
    ? fields
        .filter((f) => f.complexId === selectedComplexId)
        .map((f) => ({
          id: f.id,
          name: f.name,
          availabilityWindows:
            fieldAvailabilityByField.get(f.id) ??
            (availabilityWindowsByComplex.get(f.complexId) ?? []),
        }))
    : [];

  const availabilityRows = selectedComplexId
    ? locationDayAvailability.filter((r) => r.complexId === selectedComplexId)
    : [];

  /** Wizard uses this complex's operating windows only — never the location-wide union (avoids 8am when this complex opens at 6pm). */
  let wizardSlotStarts: string[] = [];
  if (availabilityRows.length > 0) {
    wizardSlotStarts = buildSlotStartsFromAvailabilityWindows(
      availabilityRows.map(({ startTime, endTime }) => ({ startTime, endTime })),
      SLOT_MINUTES
    );
  }

  const defaultEndHm =
    prefillRequest != null
      ? addMinutesToHm(
          prefillRequest.preferredStartTime,
          prefillRequest.preferredSessionLengthMinutes
        ) ?? "19:00"
      : slotStarts[1] ?? "19:00";

  const prevDay = addDaysLocal(selectedDate, -1);
  const nextDay = addDaysLocal(selectedDate, 1);
  const prevWeek = addDaysLocal(selectedDate, -7);
  const nextWeek = addDaysLocal(selectedDate, 7);

  const defaultSourceWeekAnchor = formatYmdLocal(addDaysLocal(selectedDate, -7));
  const sessionLengthMinutes: 30 | 60 | 90 =
    requestedDuration === "30" ? 30 : requestedDuration === "90" ? 90 : 60;

  const windowStart =
    clampSlotWindowStart(wizardSlotStarts, requestedWindowStart) || wizardSlotStarts[0] || "00:00";
  const windowStartIndex = Math.max(0, wizardSlotStarts.indexOf(windowStart));
  const visibleSlotStarts = wizardSlotStarts.slice(windowStartIndex, windowStartIndex + 6);
  const earlierWindowStart =
    windowStartIndex > 0 ? wizardSlotStarts[Math.max(0, windowStartIndex - 6)] : windowStart;
  const laterWindowStart =
    windowStartIndex + 6 < wizardSlotStarts.length
      ? wizardSlotStarts[Math.min(wizardSlotStarts.length - 1, windowStartIndex + 6)]
      : windowStart;

  const qs = (d: Date) =>
    `/fields/schedule?locationId=${encodeURIComponent(selectedLocationId!)}&date=${encodeURIComponent(formatYmdLocal(d))}`;

  const wizardQs = (windowStartHm: string) =>
    `/fields/schedule?locationId=${encodeURIComponent(selectedLocationId!)}&date=${encodeURIComponent(
      dateYmd
    )}&view=wizard&complexId=${encodeURIComponent(selectedComplexId)}&durationMinutes=${encodeURIComponent(
      String(sessionLengthMinutes)
    )}&windowStart=${encodeURIComponent(windowStartHm)}`;
  const wizardDateQs = (d: Date) =>
    `/fields/schedule?locationId=${encodeURIComponent(selectedLocationId!)}&date=${encodeURIComponent(
      formatYmdLocal(d)
    )}&view=wizard&complexId=${encodeURIComponent(selectedComplexId)}&durationMinutes=${encodeURIComponent(
      String(sessionLengthMinutes)
    )}&windowStart=${encodeURIComponent(windowStart)}`;

  const blackoutsHref = `/fields/blackouts?locationId=${encodeURIComponent(selectedLocationId!)}`;
  const dashboardHref = `/fields/dashboard?locationId=${encodeURIComponent(selectedLocationId!)}&date=${encodeURIComponent(dateYmd)}`;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Field schedule</h1>
          <p className="mt-1 text-sm text-slate-600">
            {locationName} · {dayOfWeekLabel(dow)} · {dateYmd}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            className="rounded border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
            href={qs(prevDay)}
          >
            ← Previous day
          </Link>
          <Link
            className="rounded border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
            href={qs(nextDay)}
          >
            Next day →
          </Link>
          <Link
            className="rounded border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
            href={qs(prevWeek)}
          >
            − Week
          </Link>
          <Link
            className="rounded border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
            href={qs(nextWeek)}
          >
            + Week
          </Link>
          <Link
            className="rounded border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
            href={dashboardHref}
          >
            Usage
          </Link>
          <Link
            className="rounded border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
            href={blackoutsHref}
          >
            Blackouts
          </Link>
          {session.role === "SUPER_ADMIN" ? (
            <Link
              className="rounded border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
              href="/fields/schedule"
            >
              Switch location
            </Link>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Week of {formatYmdLocal(weekStart)} — conflicts block saves (same field or same team overlap).
        Blackouts highlight slots; assignments stay on the board until you remove them.
      </p>

      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}

      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/fields/schedule?locationId=${encodeURIComponent(selectedLocationId)}&date=${encodeURIComponent(
            dateYmd
          )}`}
          className={`rounded border px-3 py-1.5 ${viewMode === "grid" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white hover:bg-slate-50"}`}
        >
          Grid
        </Link>
        <Link
          href={`/fields/schedule?locationId=${encodeURIComponent(
            selectedLocationId
          )}&date=${encodeURIComponent(dateYmd)}&view=wizard&complexId=${encodeURIComponent(
            selectedComplexId
          )}&durationMinutes=${encodeURIComponent(String(sessionLengthMinutes))}&windowStart=${encodeURIComponent(
            windowStart
          )}`}
          className={`rounded border px-3 py-1.5 ${viewMode === "wizard" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white hover:bg-slate-50"}`}
        >
          Wizard
        </Link>
      </div>

      {viewMode === "wizard" ? (
        <ScheduleWizard
          locationId={selectedLocationId}
          locations={locations}
          selectedDate={dateYmd}
          selectedDow={dow}
          selectedComplexId={selectedComplexId}
          windowStart={windowStart}
          complexes={complexes}
          fields={wizardFields}
          teams={teams}
          pendingRequests={pendingRequests.map((r) => ({
            id: r.id,
            teamId: r.teamId,
            teamName: r.team.teamName,
            preferredDayOfWeek: r.preferredDayOfWeek,
            preferredStartTime: r.preferredStartTime,
            preferredSessionLengthMinutes: r.preferredSessionLengthMinutes,
            coachName: `${r.requestedByCoach.firstName} ${r.requestedByCoach.lastName}`.trim(),
          }))}
          underScheduledTeams={underScheduledTeams}
          equipmentReservationReviews={openEquipmentReservations.map((r) => ({
            id: r.id,
            teamName: r.team.teamName,
            itemName: r.equipmentItem.name,
            reservationDate: formatYmdLocal(r.reservationDate),
            startTime: r.startTime,
            endTime: r.endTime,
            quantity: r.quantity,
            requesterName: `${r.reservedByCoach.firstName} ${r.reservedByCoach.lastName}`.trim(),
          }))}
          equipmentCatalog={equipmentCatalogItems.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            concurrentCapacity: item.concurrentCapacity,
          }))}
          assignments={assignments.map((a) => ({
            id: a.id,
            recurrenceGroupId: a.recurrenceGroupId,
            summaryLabel: wizardTeamLabel(
              a.team.gender,
              a.team.ageGroup,
              a.team.coach
            ),
            fieldId: a.fieldId,
            fieldName: a.field.name,
            startTime: a.startTime,
            endTime: a.endTime,
          }))}
          visibleSlotStarts={visibleSlotStarts}
          sessionLengthMinutes={sessionLengthMinutes}
          earlierHref={wizardQs(earlierWindowStart)}
          laterHref={wizardQs(laterWindowStart)}
          showEarlier={windowStartIndex > 0}
          showLater={windowStartIndex + 6 < wizardSlotStarts.length}
          complexOpenOnDate={wizardSlotStarts.length > 0}
          prevDayHref={wizardDateQs(prevDay)}
          nextDayHref={wizardDateQs(nextDay)}
          prevWeekHref={wizardDateQs(prevWeek)}
          nextWeekHref={wizardDateQs(nextWeek)}
        />
      ) : fields.length === 0 ? (
        <p className="text-sm text-slate-600">
          No active fields for this location yet. Add complexes and fields under{" "}
          <Link href="/fields/complexes" className="underline">
            Field setup
          </Link>
          .
        </p>
      ) : (
        <ScheduleGridScrollArea
          slotStarts={slotStarts}
          defaultScrollToHm={DEFAULT_SCHEDULE_VIEW_START_HM}
          viewportHours={DEFAULT_SCHEDULE_VIEWPORT_HOURS}
          slotMinutes={SLOT_MINUTES}
        >
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 top-0 z-30 border-b border-slate-200 bg-slate-50 px-2 py-2 shadow-[1px_0_0_0_rgb(226_232_240)]">
                  Time
                </th>
                {fields.map((f) => (
                  <th
                    key={f.id}
                    className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-2 py-2 text-center align-bottom"
                  >
                    <div className="font-semibold text-slate-900">{f.name}</div>
                    <div className="text-xs font-normal text-slate-500">{f.complex.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slotStarts.map((slot) => (
                <tr
                  key={slot}
                  data-schedule-slot={slot}
                  className="border-b border-slate-100"
                >
                  <td className="sticky left-0 bg-white px-2 py-1 font-mono text-xs text-slate-700">
                    {slot}
                  </td>
                  {fields.map((f) => {
                    const cellAssignments = assignments.filter(
                      (a) =>
                        a.fieldId === f.id &&
                        assignmentOverlapsSlot(a.startTime, a.endTime, slot, SLOT_MINUTES)
                    );
                    const cellBlackouts = blackouts.filter(
                      (b) =>
                        blackoutAppliesToField(b, { id: f.id, complexId: f.complexId }) &&
                        blackoutBlocksSlot(b, slot, SLOT_MINUTES)
                    );
                    const blackoutActive = cellBlackouts.length > 0;
                    const effectiveHours =
                      fieldAvailabilityByField.get(f.id) ??
                      (availabilityWindowsByComplex.get(f.complexId) ?? []);
                    const outsideFieldHours =
                      !blackoutActive &&
                      effectiveHours.length > 0 &&
                      !slotCoveredByAvailabilityWindows(slot, SLOT_MINUTES, effectiveHours);
                    return (
                      <td
                        key={f.id}
                        className={`align-top px-1 py-1 text-xs ${
                          blackoutActive ? "bg-amber-50/90 ring-1 ring-amber-200/80" : ""
                        } ${
                          outsideFieldHours
                            ? "bg-slate-100/90 text-slate-500 ring-1 ring-inset ring-slate-200"
                            : ""
                        }`}
                      >
                        <div className="flex min-h-[2rem] flex-col gap-1">
                          {blackoutActive ? (
                            <div className="rounded border border-amber-300 bg-amber-100/80 px-1.5 py-1 text-amber-950">
                              <div className="font-semibold">Blackout</div>
                              {cellBlackouts.map((b) => (
                                <div key={b.id} className="text-[11px] leading-snug">
                                  {b.reason?.trim() ? b.reason : "Closed (no details)"}
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {cellAssignments.map((a) => (
                            <div
                              key={a.id}
                              className={`rounded border px-1.5 py-1 ${
                                blackoutActive
                                  ? "border-slate-300/80 bg-white/80 opacity-90"
                                  : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <div className="font-medium text-slate-900">{a.team.teamName}</div>
                              <div className="text-slate-500">
                                {a.startTime}–{a.endTime}
                              </div>
                              {a.notes ? (
                                <div className="text-slate-600">{a.notes}</div>
                              ) : null}
                              <div className="mt-1 flex flex-wrap gap-2">
                                <Link
                                  className="text-[11px] text-sky-800 underline hover:text-sky-950"
                                  href={`/fields/equipment?locationId=${encodeURIComponent(selectedLocationId!)}&assignmentId=${encodeURIComponent(a.id)}`}
                                >
                                  Equipment
                                </Link>
                                <form action={deleteFieldAssignmentAction} className="inline">
                                  <input type="hidden" name="assignmentId" value={a.id} />
                                  <button
                                    type="submit"
                                    className="text-[11px] text-red-700 underline hover:text-red-900"
                                  >
                                    Remove
                                  </button>
                                </form>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </ScheduleGridScrollArea>
      )}

      {viewMode !== "wizard" && pendingRequests.length > 0 ? (
        <section className="rounded border border-amber-200 bg-amber-50/50 p-4">
          <h2 className="text-sm font-semibold text-amber-950">Pending field requests</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {pendingRequests.map((r) => (
              <li key={r.id}>
                <Link
                  className="text-amber-950 underline"
                  href={`/fields/schedule?locationId=${encodeURIComponent(selectedLocationId)}&date=${encodeURIComponent(dateYmd)}&requestId=${encodeURIComponent(r.id)}`}
                >
                  {r.team.teamName}
                </Link>
                <span className="text-amber-900">
                  {" "}
                  — {r.requestedByCoach.firstName} {r.requestedByCoach.lastName} ·{" "}
                  {dayOfWeekLabel(r.preferredDayOfWeek)} {r.preferredStartTime} ({r.preferredSessionLengthMinutes}{" "}
                  min)
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {viewMode !== "wizard" ? (
      <section className="rounded border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Copy week</h2>
        <p className="mt-1 text-sm text-slate-600">
          Clone every assignment from a source Sunday–Saturday week into a destination week. Each
          session           lands on the same weekday in the new week. Recurrence links and linked field requests are
          cleared on the copies. If anything already exists in the destination week that
          overlaps the same field or team, the whole copy is blocked (same checks as adding one slot).
        </p>
        <form action={copyFieldWeekAction} className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="locationId" value={selectedLocationId} />
          <div className="flex flex-col gap-1">
            <label htmlFor="sourceWeekAnchor" className="text-xs font-medium text-slate-700">
              From week (any day in that week)
            </label>
            <input
              id="sourceWeekAnchor"
              name="sourceWeekAnchor"
              type="date"
              required
              defaultValue={defaultSourceWeekAnchor}
              className="rounded border border-slate-300 px-2 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="destWeekAnchor" className="text-xs font-medium text-slate-700">
              Into week (any day in that week)
            </label>
            <input
              id="destWeekAnchor"
              name="destWeekAnchor"
              type="date"
              required
              defaultValue={dateYmd}
              className="rounded border border-slate-300 px-2 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Copy assignments
          </button>
        </form>
      </section>
      ) : null}

      {viewMode !== "wizard" && complexes.length > 0 ? (
        <section className="rounded border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Copy complex day</h2>
          <p className="mt-1 text-sm text-slate-600">
            Copy every assignment for one complex on a source day onto another day (or the same weekday each
            week through an end date). Recurrence and request links are not copied. Overlaps on the destination
            day block the whole copy, same as adding sessions one by one.
          </p>
          <form action={copyComplexDayAction} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="locationId" value={selectedLocationId} />
            <div className="flex min-w-[180px] flex-col gap-1">
              <label htmlFor="copyDayComplexId" className="text-xs font-medium text-slate-700">
                Complex
              </label>
              <select
                id="copyDayComplexId"
                name="complexId"
                required
                className="rounded border border-slate-300 px-2 py-2 text-sm"
                defaultValue={selectedComplexId || complexes[0]?.id}
              >
                {complexes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="copySourceDate" className="text-xs font-medium text-slate-700">
                From date
              </label>
              <input
                id="copySourceDate"
                name="sourceDate"
                type="date"
                required
                defaultValue={dateYmd}
                className="rounded border border-slate-300 px-2 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="copyDestDate" className="text-xs font-medium text-slate-700">
                To date (first copy)
              </label>
              <input
                id="copyDestDate"
                name="destDate"
                type="date"
                required
                defaultValue={formatYmdLocal(nextDay)}
                className="rounded border border-slate-300 px-2 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="copyRecurrenceEnd" className="text-xs font-medium text-slate-700">
                Repeat weekly until (optional)
              </label>
              <input
                id="copyRecurrenceEnd"
                name="recurrenceEndDate"
                type="date"
                className="rounded border border-slate-300 px-2 py-2 text-sm"
              />
              <span className="text-[11px] text-slate-500">
                Leave blank for a single destination day. If set, copies on the same weekday each week from “To
                date” through this date (inclusive).
              </span>
            </div>
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Copy complex day
            </button>
          </form>
        </section>
      ) : null}

      {viewMode !== "wizard" ? (
      <section className="rounded border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Add assignment</h2>
        {teams.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No teams at this location.</p>
        ) : fields.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Add fields above before scheduling.</p>
        ) : (
          <form action={createFieldAssignmentAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="assignmentDate" value={dateYmd} />
            <input type="hidden" name="locationId" value={selectedLocationId} />
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-700" htmlFor="teamId">
                Team
              </label>
              <select
                id="teamId"
                name="teamId"
                required
                defaultValue={prefillRequest?.team.id ?? teams[0]?.id}
                className="rounded border border-slate-300 px-2 py-2 text-sm"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.teamName} ({t.seasonLabel})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700" htmlFor="fieldId">
                Field
              </label>
              <select
                id="fieldId"
                name="fieldId"
                required
                className="rounded border border-slate-300 px-2 py-2 text-sm"
              >
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.complex.name} — {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700" htmlFor="sourceRequestId">
                Linked request (optional)
              </label>
              <select
                id="sourceRequestId"
                name="sourceRequestId"
                className="rounded border border-slate-300 px-2 py-2 text-sm"
                defaultValue={prefillRequest?.id ?? ""}
              >
                <option value="">None</option>
                {pendingRequests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.team.teamName} — pending
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700" htmlFor="startTime">
                Start
              </label>
              <input
                id="startTime"
                name="startTime"
                required
                placeholder="18:00"
                defaultValue={
                  prefillRequest != null
                    ? prefillRequest.preferredStartTime
                    : slotStarts[0] ?? "18:00"
                }
                className="rounded border border-slate-300 px-2 py-2 font-mono text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700" htmlFor="endTime">
                End
              </label>
              <input
                id="endTime"
                name="endTime"
                required
                placeholder="19:30"
                defaultValue={
                  prefillRequest != null ? defaultEndHm : slotStarts[1] ?? "19:00"
                }
                className="rounded border border-slate-300 px-2 py-2 font-mono text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-700" htmlFor="notes">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                className="rounded border border-slate-300 px-2 py-2 text-sm"
                placeholder="e.g. south half only"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save assignment
              </button>
            </div>
          </form>
        )}
      </section>
      ) : null}
    </div>
  );
}
