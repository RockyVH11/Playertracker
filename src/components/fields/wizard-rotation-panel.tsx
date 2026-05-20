"use client";

import { DayOfWeek } from "@prisma/client";
import { useState } from "react";
import {
  createFieldRotationGroupAction,
  deleteFieldRotationGroupAction,
  rematerializeFieldRotationGroupAction,
} from "@/app/actions/field-rotation";
import { DAY_OF_WEEK_ORDER, dayOfWeekLabel } from "@/lib/fields/day-of-week-order";

type TeamOption = { id: string; ageGroup: string; gender: "BOYS" | "GIRLS" };
type FieldOption = { id: string; name: string };
type RotationSummary = {
  id: string;
  cadence: string;
  startTime: string;
  endTime: string;
  daysOfWeek: DayOfWeek[];
  recurrenceEndDate: string;
  memberLabels: string[];
};

type Props = {
  locationId: string;
  complexId: string;
  selectedDate: string;
  teams: TeamOption[];
  fields: FieldOption[];
  slotStarts: string[];
  defaultDurationMinutes: 30 | 60 | 90;
  rotations: RotationSummary[];
  busy: boolean;
  onBusy: (v: boolean) => void;
  onFeedback: (msg: { kind: "ok" | "err"; text: string }) => void;
  onSuccess: () => void;
};

function sexLabel(g: "BOYS" | "GIRLS"): string {
  return g === "BOYS" ? "Boys" : "Girls";
}

function teamLabel(t: TeamOption): string {
  return `${t.ageGroup} · ${sexLabel(t.gender)}`;
}

export function WizardRotationPanel(props: Props) {
  const [memberCount, setMemberCount] = useState(2);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    props.onBusy(true);
    const fd = new FormData(e.currentTarget);
    const res = await createFieldRotationGroupAction(fd);
    props.onBusy(false);
    if (!res.ok) {
      props.onFeedback({ kind: "err", text: res.error });
      return;
    }
    props.onFeedback({
      kind: "ok",
      text: `Rotation created: ${res.createdCount} sessions placed, ${res.skippedCount} skipped.`,
    });
    props.onSuccess();
  }

  async function onDelete(groupId: string) {
    if (typeof window !== "undefined" && !window.confirm("Remove this rotation and all its generated sessions?")) {
      return;
    }
    props.onBusy(true);
    const fd = new FormData();
    fd.set("locationId", props.locationId);
    fd.set("groupId", groupId);
    const res = await deleteFieldRotationGroupAction(fd);
    props.onBusy(false);
    if (!res.ok) {
      props.onFeedback({ kind: "err", text: res.error });
      return;
    }
    props.onSuccess();
  }

  async function onRefresh(groupId: string) {
    props.onBusy(true);
    const fd = new FormData();
    fd.set("locationId", props.locationId);
    fd.set("groupId", groupId);
    const res = await rematerializeFieldRotationGroupAction(fd);
    props.onBusy(false);
    if (!res.ok) {
      props.onFeedback({ kind: "err", text: res.error });
      return;
    }
    props.onFeedback({
      kind: "ok",
      text: `Regenerated: ${res.createdCount} sessions, ${res.skippedCount} skipped.`,
    });
    props.onSuccess();
  }

  return (
    <div className="mt-2 space-y-4">
      <p className="text-[11px] text-slate-600">
        Up to 4 teams share the same start time and weekdays. Fields swap on a daily, weekly,
        bi-weekly, or monthly cadence. When a team leaves the rotation, remaining teams keep their
        primary field.
      </p>

      {props.rotations.length > 0 ? (
        <div className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            Active rotations
          </div>
          {props.rotations.map((r) => (
            <div key={r.id} className="rounded border border-slate-300 bg-white p-2 text-[10px]">
              <div className="font-medium text-slate-900">
                {r.cadence} · {r.startTime}–{r.endTime}
              </div>
              <div className="text-slate-600">
                {r.daysOfWeek.map((d) => dayOfWeekLabel(d)).join(", ")} until {r.recurrenceEndDate}
              </div>
              <div className="mt-0.5 text-slate-700">{r.memberLabels.join(" · ")}</div>
              <div className="mt-1 flex gap-1">
                <button
                  type="button"
                  disabled={props.busy}
                  onClick={() => void onRefresh(r.id)}
                  className="rounded border border-slate-300 px-1.5 py-0.5 hover:bg-slate-50 disabled:opacity-60"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  disabled={props.busy}
                  onClick={() => void onDelete(r.id)}
                  className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-red-900 hover:bg-red-100 disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <form onSubmit={onCreate} className="space-y-2 rounded border border-slate-200 bg-slate-50 p-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">
          New rotation
        </div>
        <input type="hidden" name="locationId" value={props.locationId} />
        <input type="hidden" name="complexId" value={props.complexId} />
        <input type="hidden" name="anchorDate" value={props.selectedDate} />
        <label className="block text-[10px] text-slate-700">
          Teams in rotation
          <select
            value={memberCount}
            onChange={(e) => setMemberCount(Number(e.target.value))}
            className="mt-0.5 block w-full rounded border border-slate-300 bg-white px-1.5 py-1"
          >
            <option value={2}>2 teams</option>
            <option value={3}>3 teams</option>
            <option value={4}>4 teams</option>
          </select>
        </label>
        {Array.from({ length: memberCount }, (_, i) => (
          <div key={i} className="grid grid-cols-2 gap-1">
            <label className="text-[10px] text-slate-700">
              Team {i + 1}
              <select
                name={`memberTeamId_${i}`}
                required
                className="mt-0.5 block w-full rounded border border-slate-300 bg-white px-1 py-1"
              >
                <option value="">Select</option>
                {props.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {teamLabel(t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] text-slate-700">
              Primary field
              <select
                name={`memberFieldId_${i}`}
                required
                className="mt-0.5 block w-full rounded border border-slate-300 bg-white px-1 py-1"
              >
                <option value="">Select</option>
                {props.fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
        <label className="block text-[10px] text-slate-700">
          Swap cadence
          <select
            name="cadence"
            required
            defaultValue="WEEKLY"
            className="mt-0.5 block w-full rounded border border-slate-300 bg-white px-1.5 py-1"
          >
            <option value="DAILY">Daily (alternate by weekday)</option>
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Bi-weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </label>
        <label className="block text-[10px] text-slate-700">
          Start time
          <select
            name="startTime"
            required
            defaultValue={props.slotStarts[0]}
            className="mt-0.5 block w-full rounded border border-slate-300 bg-white px-1.5 py-1"
          >
            {props.slotStarts.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] text-slate-700">
          Session length
          <select
            name="durationMinutes"
            defaultValue={String(props.defaultDurationMinutes)}
            className="mt-0.5 block w-full rounded border border-slate-300 bg-white px-1.5 py-1"
          >
            <option value="30">30 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
          </select>
        </label>
        <label className="block text-[10px] text-slate-700">
          Through date
          <input
            name="recurrenceEndDate"
            type="date"
            required
            min={props.selectedDate}
            className="mt-0.5 block w-full rounded border border-slate-300 bg-white px-1.5 py-1"
          />
        </label>
        <fieldset>
          <legend className="text-[10px] font-medium text-slate-700">Weekdays</legend>
          <div className="mt-1 grid grid-cols-2 gap-1 text-[10px]">
            {DAY_OF_WEEK_ORDER.map((d) => (
              <label key={d} className="inline-flex items-center gap-1">
                <input type="checkbox" name="weekdays" value={d} />
                {dayOfWeekLabel(d)}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          disabled={props.busy}
          className="w-full rounded bg-slate-900 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800 disabled:opacity-70"
        >
          Create rotation
        </button>
      </form>
    </div>
  );
}
