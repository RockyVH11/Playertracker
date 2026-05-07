"use client";

import { DayOfWeek } from "@prisma/client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { assignmentOverlapsSlot, slotCoveredByAvailabilityWindows } from "@/lib/fields/assignment-intervals";
import { DAY_OF_WEEK_ORDER, dayOfWeekLabel } from "@/lib/fields/day-of-week-order";
import {
  createFieldAssignmentFromWizardDropAction,
  createRecurringFieldAssignmentsAction,
  moveFieldAssignmentFromWizardDragAction,
  wizardDeleteFieldAssignmentAction,
} from "@/app/actions/field-assignments";
import {
  createWizardEquipmentReservationOnAssignmentAction,
  reviewEquipmentReservationFromWizardAction,
} from "@/app/actions/equipment-reservations";

type CoachRef = { firstName: string; lastName: string };
type TeamOption = {
  id: string;
  ageGroup: string;
  gender: "BOYS" | "GIRLS";
  coach: CoachRef;
};
type PendingRequestOption = {
  id: string;
  teamId: string;
  teamName: string;
  preferredDayOfWeek: DayOfWeek;
  preferredStartTime: string;
  preferredSessionLengthMinutes: number;
  coachName: string;
};
type UnderScheduledTeamOption = TeamOption & { assignmentCount: number };
type EquipmentReservationReviewOption = {
  id: string;
  teamName: string;
  itemName: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  quantity: number;
  requesterName: string;
};
type EquipmentCatalogItemOption = {
  id: string;
  name: string;
  description: string | null;
  concurrentCapacity: number;
};
type FieldOption = { id: string; name: string; availabilityWindows: { startTime: string; endTime: string }[] };
type ComplexOption = { id: string; name: string };
type LocationOption = { id: string; name: string };
type AssignmentChip = {
  id: string;
  recurrenceGroupId: string | null;
  summaryLabel: string;
  fieldId: string;
  fieldName: string;
  startTime: string;
  endTime: string;
};

type Props = {
  locationId: string;
  locations: LocationOption[];
  selectedDate: string;
  selectedDow: DayOfWeek;
  selectedComplexId: string;
  windowStart: string;
  complexes: ComplexOption[];
  fields: FieldOption[];
  teams: TeamOption[];
  pendingRequests: PendingRequestOption[];
  underScheduledTeams: UnderScheduledTeamOption[];
  equipmentReservationReviews: EquipmentReservationReviewOption[];
  equipmentCatalog: EquipmentCatalogItemOption[];
  assignments: AssignmentChip[];
  visibleSlotStarts: string[];
  sessionLengthMinutes: 30 | 60 | 90;
  earlierHref: string;
  laterHref: string;
  showEarlier: boolean;
  showLater: boolean;
  complexOpenOnDate: boolean;
  prevDayHref: string;
  nextDayHref: string;
  prevWeekHref: string;
  nextWeekHref: string;
};

function hmToDisplay(hm: string): string {
  const [hs, ms] = hm.split(":");
  const h = Number(hs);
  const m = Number(ms);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hm;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function sexLabel(g: "BOYS" | "GIRLS"): string {
  return g === "BOYS" ? "Boys" : "Girls";
}

function coachName(c: CoachRef): string {
  const s = `${c.firstName?.trim() ?? ""} ${c.lastName?.trim() ?? ""}`.trim();
  return s.length ? s : "Coach";
}

function wizardUrlQuery(props: Props): string {
  const p = new URLSearchParams({
    locationId: props.locationId,
    date: props.selectedDate,
    view: "wizard",
    complexId: props.selectedComplexId,
    durationMinutes: String(props.sessionLengthMinutes),
    windowStart: props.windowStart,
  });
  return p.toString();
}

export function ScheduleWizard(props: Props) {
  const router = useRouter();
  const [dragTeamId, setDragTeamId] = useState<string | null>(null);
  const [dragAssignmentId, setDragAssignmentId] = useState<string | null>(null);
  const [dragEquipmentItemId, setDragEquipmentItemId] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [menuAssignmentId, setMenuAssignmentId] = useState<string | null>(null);

  const sessionDialogRef = useRef<HTMLDialogElement>(null);
  const recurrenceFormRef = useRef<HTMLFormElement>(null);

  const now = new Date();
  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const weekdayDefaults = useMemo(() => [props.selectedDow], [props.selectedDow]);

  const [genderFilter, setGenderFilter] = useState<"ALL" | "BOYS" | "GIRLS">("ALL");
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>("ALL");
  const [unscheduledView, setUnscheduledView] = useState<
    "pending" | "under2" | "allTeams" | "equipment"
  >("pending");

  const ageGroups = useMemo(() => Array.from(new Set(props.teams.map((t) => t.ageGroup))).sort(), [props.teams]);

  const filteredTeams = useMemo(() => {
    return props.teams.filter((t) => {
      if (genderFilter !== "ALL" && t.gender !== genderFilter) return false;
      if (ageGroupFilter !== "ALL" && t.ageGroup !== ageGroupFilter) return false;
      return true;
    });
  }, [props.teams, genderFilter, ageGroupFilter]);

  const defaultRecurrenceEndYmd = useMemo(() => {
    const [y, m, d] = props.selectedDate.split("-").map((x) => Number(x));
    if (!y || !m || !d) return props.selectedDate;
    const base = new Date(y, m - 1, d, 12, 0, 0, 0);
    base.setDate(base.getDate() + 7);
    const yy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, "0");
    const dd = String(base.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }, [props.selectedDate]);

  const selectedAssignment = menuAssignmentId
    ? props.assignments.find((a) => a.id === menuAssignmentId)
    : null;

  useEffect(() => {
    const dlg = sessionDialogRef.current;
    if (!dlg) return;
    if (menuAssignmentId && selectedAssignment) {
      try {
        dlg.showModal();
      } catch {
        // already open
      }
    } else {
      dlg.close();
    }
  }, [menuAssignmentId, selectedAssignment]);

  async function dropTeamOnSlot(fieldId: string, slot: string) {
    if (!dragTeamId) return;
    setBusy(true);
    setFeedback(null);
    const fd = new FormData();
    fd.set("locationId", props.locationId);
    fd.set("complexId", props.selectedComplexId);
    fd.set("teamId", dragTeamId);
    fd.set("fieldId", fieldId);
    fd.set("assignmentDate", props.selectedDate);
    fd.set("startTime", slot);
    fd.set("windowStart", props.windowStart);
    fd.set("durationMinutes", String(props.sessionLengthMinutes));
    const res = await createFieldAssignmentFromWizardDropAction(fd);
    setDragTeamId(null);
    setHoverKey(null);
    setBusy(false);
    if (!res.ok) {
      setFeedback({ kind: "err", text: res.error });
      return;
    }
    router.refresh();
  }

  async function moveAssignmentToSlot(fieldId: string, slot: string) {
    if (!dragAssignmentId) return;
    setBusy(true);
    setFeedback(null);
    const fd = new FormData();
    fd.set("locationId", props.locationId);
    fd.set("assignmentId", dragAssignmentId);
    fd.set("fieldId", fieldId);
    fd.set("assignmentDate", props.selectedDate);
    fd.set("startTime", slot);
    const res = await moveFieldAssignmentFromWizardDragAction(fd);
    setDragAssignmentId(null);
    setHoverKey(null);
    setBusy(false);
    if (!res.ok) {
      setFeedback({ kind: "err", text: res.error });
      return;
    }
    router.refresh();
  }

  async function applyRecurrence(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedAssignment) return;
    const formEl = recurrenceFormRef.current;
    if (!formEl) return;
    setBusy(true);
    setFeedback(null);
    const fd = new FormData(formEl);
    const res = await createRecurringFieldAssignmentsAction(fd);
    setBusy(false);
    if (!res.ok) {
      setFeedback({ kind: "err", text: res.error });
      return;
    }
    setFeedback({
      kind: "ok",
      text: `Recurring saved: ${res.createdCount} added, ${res.skippedCount} skipped.`,
    });
    setMenuAssignmentId(null);
    router.refresh();
  }

  async function deleteSession(scope: "this" | "series") {
    if (!selectedAssignment) return;
    if (scope === "this") {
      if (
        typeof window !== "undefined" &&
        !window.confirm("Remove this practice session only?")
      )
        return;
    } else {
      if (
        typeof window !== "undefined" &&
        !window.confirm("Delete EVERY session in this recurring group?")
      )
        return;
    }
    setBusy(true);
    setFeedback(null);
    const fd = new FormData();
    fd.set("assignmentId", selectedAssignment.id);
    fd.set("scope", scope);
    const res = await wizardDeleteFieldAssignmentAction(fd);
    setBusy(false);
    if (!res.ok) {
      setFeedback({ kind: "err", text: res.error });
      return;
    }
    setMenuAssignmentId(null);
    router.refresh();
  }

  async function dropEquipmentOnAssignment(fieldAssignmentId: string) {
    if (!dragEquipmentItemId) return;
    setBusy(true);
    setFeedback(null);
    const fd = new FormData();
    fd.set("locationId", props.locationId);
    fd.set("equipmentItemId", dragEquipmentItemId);
    fd.set("fieldAssignmentId", fieldAssignmentId);
    const res = await createWizardEquipmentReservationOnAssignmentAction(fd);
    setDragEquipmentItemId(null);
    setHoverKey(null);
    setBusy(false);
    if (!res.ok) {
      setFeedback({ kind: "err", text: res.error });
      return;
    }
    setFeedback({ kind: "ok", text: "Equipment reserved for this session." });
    router.refresh();
  }

  async function reviewEquipmentRequest(reservationId: string, decision: "approve" | "deny") {
    setBusy(true);
    setFeedback(null);
    const fd = new FormData();
    fd.set("reservationId", reservationId);
    fd.set("decision", decision);
    const res = await reviewEquipmentReservationFromWizardAction(fd);
    setBusy(false);
    if (!res.ok) {
      setFeedback({ kind: "err", text: res.error });
      return;
    }
    setFeedback({
      kind: "ok",
      text:
        decision === "approve"
          ? "Equipment request approved."
          : "Equipment request denied and cancelled.",
    });
    router.refresh();
  }

  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Scheduling wizard</h2>
          <p className="text-xs text-slate-600">
            Drag a team onto a cell to place a session · Drag open equipment onto a session block to
            reserve it · Click a block to recur or delete.
          </p>
        </div>
        <a
          href={`/fields/schedule?locationId=${encodeURIComponent(props.locationId)}&date=${encodeURIComponent(props.selectedDate)}`}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Back to grid
        </a>
      </div>

      {busy ? (
        <p className="mt-3 text-xs text-slate-500">Saving…</p>
      ) : null}

      {feedback ? (
        <p
          className={`mt-3 rounded px-3 py-2 text-sm ${feedback.kind === "err" ? "border border-amber-200 bg-amber-50 text-amber-950" : "border border-emerald-200 bg-emerald-50 text-emerald-950"}`}
        >
          {feedback.text}
        </p>
      ) : null}

      <form className="mt-4 grid gap-3 md:grid-cols-4" method="get">
        <input type="hidden" name="view" value="wizard" />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700" htmlFor="wizardLocation">
            Location
          </label>
          <select
            id="wizardLocation"
            name="locationId"
            defaultValue={props.locationId}
            className="rounded border border-slate-300 px-2 py-2 text-sm"
          >
            {props.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700" htmlFor="wizardComplex">
            Complex
          </label>
          <select
            id="wizardComplex"
            name="complexId"
            defaultValue={props.selectedComplexId}
            className="rounded border border-slate-300 px-2 py-2 text-sm"
          >
            {props.complexes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700" htmlFor="wizardDate">
            Date
          </label>
          <input
            id="wizardDate"
            name="date"
            type="date"
            min={todayYmd}
            defaultValue={props.selectedDate}
            className="rounded border border-slate-300 px-2 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700" htmlFor="wizardDuration">
            Session length
          </label>
          <select
            id="wizardDuration"
            name="durationMinutes"
            defaultValue={String(props.sessionLengthMinutes)}
            className="rounded border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="30">30 minutes</option>
            <option value="60">60 minutes</option>
            <option value="90">90 minutes</option>
          </select>
        </div>
        <div className="md:col-span-4">
          <button
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Update wizard view
          </button>
        </div>
      </form>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-900">
            {dayOfWeekLabel(props.selectedDow)} · {props.selectedDate}
          </div>
          <div className="text-xs text-slate-500">{props.visibleSlotStarts.length} time slots in view</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={props.prevDayHref}
            className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs hover:bg-slate-50"
          >
            ← Day
          </a>
          <a
            href={props.nextDayHref}
            className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs hover:bg-slate-50"
          >
            Day →
          </a>
          <a
            href={props.prevWeekHref}
            className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs hover:bg-slate-50"
          >
            − Week
          </a>
          <a
            href={props.nextWeekHref}
            className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs hover:bg-slate-50"
          >
            + Week
          </a>
          <a
            href={props.earlierHref}
            className={`rounded border px-3 py-1.5 text-sm ${
              props.complexOpenOnDate && props.showEarlier
                ? "border-slate-300 bg-white hover:bg-slate-50"
                : "pointer-events-none border-slate-200 text-slate-400"
            }`}
          >
            Earlier
          </a>
          <a
            href={props.laterHref}
            className={`rounded border px-3 py-1.5 text-sm ${
              props.complexOpenOnDate && props.showLater
                ? "border-slate-300 bg-white hover:bg-slate-50"
                : "pointer-events-none border-slate-200 text-slate-400"
            }`}
          >
            Later
          </a>
        </div>
      </div>

      {!props.complexOpenOnDate ? (
        <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          This complex is not open on {dayOfWeekLabel(props.selectedDow)}. Set operating hours for
          this day to schedule sessions.
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-[220px_minmax(0,1fr)] gap-3">
        <aside className="rounded border border-slate-200 bg-slate-50 p-2">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Unscheduled
          </div>
          <div className="mb-2 grid grid-cols-1 gap-1">
            <button
              type="button"
              onClick={() => setUnscheduledView("pending")}
              className={`rounded border px-2 py-1 text-left text-[11px] ${
                unscheduledView === "pending"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white hover:bg-slate-100"
              }`}
            >
              Pending (
              {props.pendingRequests.length + props.equipmentReservationReviews.length})
            </button>
            <button
              type="button"
              onClick={() => setUnscheduledView("under2")}
              className={`rounded border px-2 py-1 text-left text-[11px] ${
                unscheduledView === "under2"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white hover:bg-slate-100"
              }`}
            >
              Under 2 sessions ({props.underScheduledTeams.length})
            </button>
            <button
              type="button"
              onClick={() => setUnscheduledView("allTeams")}
              className={`rounded border px-2 py-1 text-left text-[11px] ${
                unscheduledView === "allTeams"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white hover:bg-slate-100"
              }`}
            >
              All teams ({props.teams.length})
            </button>
            <button
              type="button"
              onClick={() => setUnscheduledView("equipment")}
              className={`rounded border px-2 py-1 text-left text-[11px] ${
                unscheduledView === "equipment"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white hover:bg-slate-100"
              }`}
            >
              Open equipment ({props.equipmentCatalog.length})
            </button>
          </div>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <label className="text-[11px] text-slate-600">
              Sex
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as "ALL" | "BOYS" | "GIRLS")}
                className="mt-1 block w-full rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px]"
              >
                <option value="ALL">All</option>
                <option value="BOYS">Boys</option>
                <option value="GIRLS">Girls</option>
              </select>
            </label>
            <label className="text-[11px] text-slate-600">
              Age group
              <select
                value={ageGroupFilter}
                onChange={(e) => setAgeGroupFilter(e.target.value)}
                className="mt-1 block w-full rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px]"
              >
                <option value="ALL">All</option>
                {ageGroups.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {unscheduledView === "pending" ? (
            <div className="mt-2 space-y-4">
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Field requests
                </div>
                {props.pendingRequests.length === 0 ? (
                  <p className="text-[11px] text-slate-500">No pending field requests.</p>
                ) : (
                  <div className="space-y-2">
                    {props.pendingRequests.map((request) => (
                      <button
                        key={request.id}
                        type="button"
                        draggable
                        onDragStart={() => {
                          setDragTeamId(request.teamId);
                          setDragAssignmentId(null);
                          setDragEquipmentItemId(null);
                        }}
                        onDragEnd={() => {
                          setDragTeamId(null);
                          setHoverKey(null);
                        }}
                        className={`w-full rounded border px-1.5 py-1 text-left text-[10px] leading-snug ${
                          dragTeamId === request.teamId
                            ? "border-sky-500 bg-sky-50"
                            : "border-slate-300 bg-white hover:bg-slate-100"
                        }`}
                      >
                        <div className="font-medium text-slate-900">{request.teamName}</div>
                        <div className="text-slate-600">
                          {dayOfWeekLabel(request.preferredDayOfWeek)} {request.preferredStartTime}{" "}
                          ({request.preferredSessionLengthMinutes}m)
                        </div>
                        <div className="truncate text-slate-500">{request.coachName}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Equipment reservations
                </div>
                {props.equipmentReservationReviews.length === 0 ? (
                  <p className="text-[11px] text-slate-500">No gear reservations yet.</p>
                ) : (
                  <div className="space-y-2">
                    {props.equipmentReservationReviews.map((request) => (
                      <div key={request.id} className="rounded border border-slate-300 bg-white p-1.5">
                        <div className="text-[10px] font-medium text-slate-900">{request.teamName}</div>
                        <div className="text-[10px] text-slate-600">
                          {request.itemName} ×{request.quantity}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          {request.reservationDate} {request.startTime}–{request.endTime}
                        </div>
                        <div className="text-[9px] text-slate-500">{request.requesterName}</div>
                        <div className="mt-1 flex gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void reviewEquipmentRequest(request.id, "approve")}
                            className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void reviewEquipmentRequest(request.id, "deny")}
                            className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-[10px] text-red-900 hover:bg-red-100 disabled:opacity-60"
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
          {unscheduledView === "under2" ? (
            <>
              <div className="text-[11px] text-slate-500">
                Showing {filteredTeams.length} team{filteredTeams.length === 1 ? "" : "s"}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {filteredTeams
                  .filter((team) => props.underScheduledTeams.some((u) => u.id === team.id))
                  .map((team) => {
                    const under2 = props.underScheduledTeams.find((u) => u.id === team.id);
                    return (
                      <button
                        key={team.id}
                        type="button"
                        draggable
                        onDragStart={() => {
                          setDragTeamId(team.id);
                          setDragAssignmentId(null);
                          setDragEquipmentItemId(null);
                        }}
                        onDragEnd={() => {
                          setDragTeamId(null);
                          setHoverKey(null);
                        }}
                        className={`w-full rounded border px-1.5 py-1 text-left text-[10px] leading-snug ${
                          dragTeamId === team.id
                            ? "border-sky-500 bg-sky-50"
                            : "border-slate-300 bg-white hover:bg-slate-100"
                        }`}
                      >
                        <div className="font-medium text-slate-900">
                          {team.ageGroup} · {sexLabel(team.gender)}
                        </div>
                        <div className="truncate text-slate-600">{coachName(team.coach)}</div>
                        <div className="text-[9px] text-amber-700">
                          {under2?.assignmentCount ?? 0} session(s) this week
                        </div>
                      </button>
                    );
                  })}
              </div>
            </>
          ) : null}
          {unscheduledView === "allTeams" ? (
            <>
              <div className="text-[11px] text-slate-500">
                Showing {filteredTeams.length} team{filteredTeams.length === 1 ? "" : "s"}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {filteredTeams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    draggable
                    onDragStart={() => {
                      setDragTeamId(team.id);
                      setDragAssignmentId(null);
                      setDragEquipmentItemId(null);
                    }}
                    onDragEnd={() => {
                      setDragTeamId(null);
                      setHoverKey(null);
                    }}
                    className={`w-full rounded border px-1.5 py-1 text-left text-[10px] leading-snug ${
                      dragTeamId === team.id
                        ? "border-sky-500 bg-sky-50"
                        : "border-slate-300 bg-white hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-medium text-slate-900">
                      {team.ageGroup} · {sexLabel(team.gender)}
                    </div>
                    <div className="truncate text-slate-600">{coachName(team.coach)}</div>
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {unscheduledView === "equipment" ? (
            <div className="mt-2 space-y-2">
              <p className="text-[11px] text-slate-500">
                Drag an item onto a scheduled session to book it for that team and time. Or use the
                equipment page for more options.
              </p>
              <Link
                href={`/fields/equipment?locationId=${encodeURIComponent(props.locationId)}`}
                className="inline-block rounded border border-sky-300 bg-white px-2 py-1 text-[10px] font-medium text-sky-900 hover:bg-sky-50"
              >
                Open equipment page
              </Link>
              {props.equipmentCatalog.length === 0 ? (
                <p className="text-[11px] text-slate-500">No active equipment items.</p>
              ) : (
                <ul className="max-h-64 space-y-1.5 overflow-y-auto">
                  {props.equipmentCatalog.map((item) => (
                    <li
                      key={item.id}
                      draggable
                      onDragStart={() => {
                        setDragEquipmentItemId(item.id);
                        setDragTeamId(null);
                        setDragAssignmentId(null);
                      }}
                      onDragEnd={() => {
                        setDragEquipmentItemId(null);
                        setHoverKey(null);
                      }}
                      className={`rounded border px-1.5 py-1 text-[10px] leading-snug ${
                        dragEquipmentItemId === item.id
                          ? "border-sky-500 bg-sky-50"
                          : "cursor-grab border-slate-300 bg-white"
                      }`}
                    >
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="text-slate-600">Pool: {item.concurrentCapacity} at once</div>
                      {item.description?.trim() ? (
                        <div className="text-[9px] text-slate-500">{item.description.trim()}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </aside>

        {props.complexOpenOnDate ? (
          <div className="overflow-x-auto overflow-y-auto rounded border border-slate-200">
            <table className="w-max min-w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="sticky left-0 z-20 min-w-[2.5rem] border-b border-r border-slate-200 bg-slate-50 px-1 py-1 text-[10px] font-semibold text-slate-700 shadow-[1px_0_0_0_rgb(226_232_240)]">
                    Field
                  </th>
                  {props.visibleSlotStarts.map((slot) => (
                    <th
                      key={slot}
                      className="min-w-[3.75rem] max-w-[4.25rem] border-b border-slate-200 px-0.5 py-1 text-center text-[10px] font-normal leading-tight text-slate-700"
                    >
                      {hmToDisplay(slot)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {props.fields.map((field) => (
                  <tr key={field.id} className="border-b border-slate-100">
                    <td className="sticky left-0 z-10 border-r border-slate-100 bg-white px-1 py-0.5 text-[11px] font-semibold text-slate-900 shadow-[1px_0_0_0_rgb(226_232_240)]">
                      {field.name}
                    </td>
                    {props.visibleSlotStarts.map((slot) => {
                      const key = `${field.id}|${slot}`;
                      const fieldOpenAtSlot =
                        field.availabilityWindows.length > 0 &&
                        slotCoveredByAvailabilityWindows(slot, 30, field.availabilityWindows);
                      const cellAssignments = props.assignments.filter(
                        (a) =>
                          a.fieldId === field.id &&
                          assignmentOverlapsSlot(a.startTime, a.endTime, slot, 30)
                      );
                      return (
                        <td
                          key={`${field.id}:${slot}`}
                          onDragOver={(e) => {
                            if (!fieldOpenAtSlot) return;
                            if (dragEquipmentItemId) return;
                            if (!dragTeamId && !dragAssignmentId) return;
                            e.preventDefault();
                            setHoverKey(key);
                          }}
                          onDragLeave={() => setHoverKey((prev) => (prev === key ? null : prev))}
                          onDrop={(e) => {
                            if (!fieldOpenAtSlot) return;
                            if (dragEquipmentItemId) {
                              e.preventDefault();
                              return;
                            }
                            e.preventDefault();
                            if (dragAssignmentId) {
                              void moveAssignmentToSlot(field.id, slot);
                              return;
                            }
                            void dropTeamOnSlot(field.id, slot);
                          }}
                          className={`align-top px-0.5 py-0.5 ${
                            hoverKey === key ? "bg-sky-50 ring-1 ring-inset ring-sky-300" : ""
                          } ${fieldOpenAtSlot ? "" : "bg-slate-100/90 text-slate-500 ring-1 ring-inset ring-slate-200"}`}
                        >
                          <div className="flex min-h-[2rem] flex-col gap-0.5">
                            {cellAssignments.map((a) => (
                              <div
                                key={a.id}
                                onDragOver={(e) => {
                                  if (!dragEquipmentItemId) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onDrop={(e) => {
                                  if (!dragEquipmentItemId) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  void dropEquipmentOnAssignment(a.id);
                                }}
                                className="w-full rounded border border-indigo-200 bg-indigo-50 px-1 py-0.5"
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setMenuAssignmentId(a.id)}
                                    className="flex-1 cursor-pointer text-left hover:underline"
                                  >
                                    <div className="text-[10px] font-medium leading-tight text-indigo-950">
                                      {a.summaryLabel}
                                    </div>
                                    <div className="text-[9px] text-indigo-800">
                                      {hmToDisplay(a.startTime)}–{hmToDisplay(a.endTime)}
                                    </div>
                                    {a.recurrenceGroupId ? (
                                      <div className="mt-0.5 text-[9px] font-medium uppercase text-indigo-700">
                                        Recurring
                                      </div>
                                    ) : null}
                                  </button>
                                  <button
                                    type="button"
                                    draggable
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      setDragAssignmentId(a.id);
                                      setDragTeamId(null);
                                      setDragEquipmentItemId(null);
                                    }}
                                    onDragEnd={() => {
                                      setDragAssignmentId(null);
                                      setHoverKey(null);
                                    }}
                                    aria-label="Drag to move session"
                                    className={`shrink-0 cursor-grab rounded border px-1 text-[10px] leading-tight ${
                                      dragAssignmentId === a.id
                                        ? "border-sky-500 bg-sky-50 text-sky-800"
                                        : "border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-100"
                                    }`}
                                  >
                                    Move
                                  </button>
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
          </div>
        ) : (
          <div className="rounded border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-600">
            Complex closed for this date.
          </div>
        )}
      </div>

      <dialog
        ref={sessionDialogRef}
        className="w-full max-w-md rounded border border-slate-300 p-0 backdrop:bg-black/20"
        onClose={() => setMenuAssignmentId(null)}
      >
        {selectedAssignment ? (
          <>
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Session</h3>
              <p className="mt-1 text-sm text-slate-800">{selectedAssignment.summaryLabel}</p>
              <p className="mt-1 text-xs text-slate-600">
                {selectedAssignment.fieldName} · {hmToDisplay(selectedAssignment.startTime)}–
                {hmToDisplay(selectedAssignment.endTime)}
              </p>
            </div>
            <form
              key={selectedAssignment.id}
              ref={recurrenceFormRef}
              onSubmit={applyRecurrence}
              className="space-y-3 border-b border-slate-200 p-4"
            >
              <input type="hidden" name="locationId" value={props.locationId} />
              <input type="hidden" name="complexId" value={props.selectedComplexId} />
              <input type="hidden" name="assignmentId" value={selectedAssignment.id} />
              <input type="hidden" name="baseDate" value={props.selectedDate} />
              <input type="hidden" name="windowStart" value={props.windowStart} />
              <input type="hidden" name="durationMinutes" value={String(props.sessionLengthMinutes)} />
              <div className="text-xs font-semibold text-slate-800">Duplicate to future dates</div>
              <div className="text-xs text-slate-600">
                Adds the same slot on selected weekdays until the end date (skips conflicts). Also
                links sessions so you can delete the whole series later.
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="endDate" className="text-xs font-medium text-slate-700">
                  End date
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  min={props.selectedDate}
                  defaultValue={defaultRecurrenceEndYmd}
                  className="rounded border border-slate-300 px-2 py-2 text-sm"
                />
              </div>
              <fieldset>
                <legend className="text-xs font-medium text-slate-700">Weekdays to add</legend>
                <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                  {DAY_OF_WEEK_ORDER.map((d: DayOfWeek) => (
                    <label key={d} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="weekdays"
                        value={d}
                        defaultChecked={weekdayDefaults.includes(d)}
                      />
                      {dayOfWeekLabel(d)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
              >
                Apply duplication
              </button>
            </form>
            <div className="space-y-2 p-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteSession("this")}
                className="w-full rounded border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-70"
              >
                Delete this session
              </button>
              <button
                type="button"
                disabled={busy || !selectedAssignment.recurrenceGroupId}
                onClick={() => void deleteSession("series")}
                className={`w-full rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 ${
                  selectedAssignment.recurrenceGroupId
                    ? "border-red-400 bg-red-600 text-white hover:bg-red-700"
                    : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                }`}
              >
                Delete all in recurring group
              </button>
              {!selectedAssignment.recurrenceGroupId ? (
                <p className="text-[11px] text-slate-500">
                  Turn on “Apply duplication” first to group sessions, or delete this session only.
                </p>
              ) : null}
              <a
                href={`/fields/schedule?${wizardUrlQuery(props)}`}
                className="block w-full rounded border border-slate-300 py-2 text-center text-sm hover:bg-slate-50"
              >
                Close
              </a>
            </div>
          </>
        ) : null}
      </dialog>
    </section>
  );
}
