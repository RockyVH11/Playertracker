"use client";

import { DayOfWeek } from "@prisma/client";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import {
  createRecurringFieldAssignmentsAction,
  wizardDeleteFieldAssignmentAction,
  wizardUpdateFieldAssignmentAction,
} from "@/app/actions/field-assignments";
import { DAY_OF_WEEK_ORDER, dayOfWeekLabel } from "@/lib/fields/day-of-week-order";

type FieldOption = { id: string; name: string };
type AssignmentChip = {
  id: string;
  recurrenceGroupId: string | null;
  rotationGroupId: string | null;
  summaryLabel: string;
  fieldId: string;
  fieldName: string;
  startTime: string;
  endTime: string;
};

type Props = {
  open: boolean;
  assignment: AssignmentChip | null;
  locationId: string;
  complexId: string;
  selectedDate: string;
  selectedDow: DayOfWeek;
  windowStart: string;
  sessionLengthMinutes: 30 | 60 | 90;
  fields: FieldOption[];
  slotStarts: string[];
  defaultRecurrenceEndYmd: string;
  busy: boolean;
  closeHref: string;
  onClose: () => void;
  onBusy: (v: boolean) => void;
  onFeedback: (msg: { kind: "ok" | "err"; text: string }) => void;
  onSuccess: () => void;
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

function durationFromSession(start: string, end: string): 30 | 60 | 90 {
  const sh = Number(start.slice(0, 2));
  const sm = Number(start.slice(3, 5));
  const eh = Number(end.slice(0, 2));
  const em = Number(end.slice(3, 5));
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins === 90) return 90;
  if (mins === 60) return 60;
  return 30;
}

export function WizardSessionDialog(props: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const weekdayDefaults = useMemo(() => [props.selectedDow], [props.selectedDow]);
  const a = props.assignment;

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (props.open && a) {
      try {
        dlg.showModal();
      } catch {
        /* already open */
      }
    } else {
      dlg.close();
    }
  }, [props.open, a]);

  async function saveEdit(scope: "this" | "series") {
    if (!a) return;
    const form = document.getElementById(`wizard-edit-${a.id}`) as HTMLFormElement | null;
    if (!form) return;
    props.onBusy(true);
    const fd = new FormData(form);
    fd.set("scope", scope);
    const res = await wizardUpdateFieldAssignmentAction(fd);
    props.onBusy(false);
    if (!res.ok) {
      props.onFeedback({ kind: "err", text: res.error });
      return;
    }
    props.onFeedback({
      kind: "ok",
      text: `Updated ${res.updatedCount} session${res.updatedCount === 1 ? "" : "s"}.`,
    });
    props.onClose();
    props.onSuccess();
  }

  async function applyRecurrence(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!a) return;
    props.onBusy(true);
    const fd = new FormData(e.currentTarget);
    const res = await createRecurringFieldAssignmentsAction(fd);
    props.onBusy(false);
    if (!res.ok) {
      props.onFeedback({ kind: "err", text: res.error });
      return;
    }
    props.onFeedback({
      kind: "ok",
      text: `Recurring saved: ${res.createdCount} added, ${res.skippedCount} skipped.`,
    });
    props.onClose();
    props.onSuccess();
  }

  async function deleteSession(scope: "this" | "series") {
    if (!a) return;
    const msg =
      scope === "this"
        ? "Remove this practice session only?"
        : "Delete EVERY session in this recurring group?";
    if (typeof window !== "undefined" && !window.confirm(msg)) return;
    props.onBusy(true);
    const fd = new FormData();
    fd.set("assignmentId", a.id);
    fd.set("scope", scope);
    const res = await wizardDeleteFieldAssignmentAction(fd);
    props.onBusy(false);
    if (!res.ok) {
      props.onFeedback({ kind: "err", text: res.error });
      return;
    }
    props.onClose();
    props.onSuccess();
  }

  if (!a) return null;

  const duration = durationFromSession(a.startTime, a.endTime);
  const rotationLocked = Boolean(a.rotationGroupId);

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-md rounded border border-slate-300 p-0 backdrop:bg-black/20"
      onClose={props.onClose}
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Session</h3>
        <p className="mt-1 text-sm text-slate-800">{a.summaryLabel}</p>
        <p className="mt-1 text-xs text-slate-600">
          {a.fieldName} · {hmToDisplay(a.startTime)}–{hmToDisplay(a.endTime)}
        </p>
        {rotationLocked ? (
          <p className="mt-2 text-xs text-amber-800">
            Part of a rotating field schedule — edit via the Rotation tab or delete the rotation.
          </p>
        ) : null}
      </div>

      {!rotationLocked ? (
        <form
          id={`wizard-edit-${a.id}`}
          className="space-y-3 border-b border-slate-200 p-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="text-xs font-semibold text-slate-800">Edit session</div>
          <input type="hidden" name="locationId" value={props.locationId} />
          <input type="hidden" name="assignmentId" value={a.id} />
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium text-slate-700">Field</span>
            <select
              name="fieldId"
              defaultValue={a.fieldId}
              className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
            >
              {props.fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium text-slate-700">Start time</span>
            <select
              name="startTime"
              defaultValue={a.startTime}
              className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
            >
              {props.slotStarts.map((s) => (
                <option key={s} value={s}>
                  {hmToDisplay(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium text-slate-700">Session length</span>
            <select
              name="durationMinutes"
              defaultValue={String(duration)}
              className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
            >
              <option value="30">30 min</option>
              <option value="60">60 min</option>
              <option value="90">90 min</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={props.busy}
              onClick={() => void saveEdit("this")}
              className="rounded border border-slate-300 bg-white px-2 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-70"
            >
              Save this session
            </button>
            <button
              type="button"
              disabled={props.busy || !a.recurrenceGroupId}
              onClick={() => void saveEdit("series")}
              className={`rounded border px-2 py-2 text-sm font-medium disabled:opacity-50 ${
                a.recurrenceGroupId
                  ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                  : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
              }`}
            >
              Save all in series
            </button>
          </div>
        </form>
      ) : null}

      {!rotationLocked ? (
        <form
          key={`recur-${a.id}`}
          onSubmit={applyRecurrence}
          className="space-y-3 border-b border-slate-200 p-4"
        >
          <input type="hidden" name="locationId" value={props.locationId} />
          <input type="hidden" name="complexId" value={props.complexId} />
          <input type="hidden" name="assignmentId" value={a.id} />
          <input type="hidden" name="windowStart" value={props.windowStart} />
          <input type="hidden" name="durationMinutes" value={String(props.sessionLengthMinutes)} />
          <div className="text-xs font-semibold text-slate-800">Duplicate to future dates</div>
          <p className="text-xs text-slate-600">
            Adds the same slot on selected weekdays until the end date (skips conflicts).
          </p>
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium text-slate-700">End date</span>
            <input
              name="endDate"
              type="date"
              min={props.selectedDate}
              defaultValue={props.defaultRecurrenceEndYmd}
              className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
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
            disabled={props.busy}
            className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
          >
            Apply duplication
          </button>
        </form>
      ) : null}

      <div className="space-y-2 p-4">
        <button
          type="button"
          disabled={props.busy}
          onClick={() => void deleteSession("this")}
          className="w-full rounded border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-70"
        >
          Delete this session
        </button>
        <button
          type="button"
          disabled={props.busy || !a.recurrenceGroupId}
          onClick={() => void deleteSession("series")}
          className={`w-full rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 ${
            a.recurrenceGroupId
              ? "border-red-400 bg-red-600 text-white hover:bg-red-700"
              : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
          }`}
        >
          Delete all in recurring group
        </button>
        <Link
          href={props.closeHref}
          className="block w-full rounded border border-slate-300 py-2 text-center text-sm hover:bg-slate-50"
        >
          Close
        </Link>
      </div>
    </dialog>
  );
}
