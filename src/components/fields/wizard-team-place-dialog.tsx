"use client";

import { useRef, useEffect } from "react";
import { createFieldAssignmentFromWizardDropAction } from "@/app/actions/field-assignments";

type FieldOption = { id: string; name: string };

type Props = {
  open: boolean;
  teamLabel: string;
  teamId: string;
  locationId: string;
  complexId: string;
  assignmentDate: string;
  windowStart: string;
  defaultDurationMinutes: 30 | 60 | 90;
  fields: FieldOption[];
  slotStarts: string[];
  defaultFieldId: string;
  busy: boolean;
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

export function WizardTeamPlaceDialog(props: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (props.open) {
      try {
        dlg.showModal();
      } catch {
        /* already open */
      }
    } else {
      dlg.close();
    }
  }, [props.open]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    props.onBusy(true);
    const res = await createFieldAssignmentFromWizardDropAction(fd);
    props.onBusy(false);
    if (!res.ok) {
      props.onFeedback({ kind: "err", text: res.error });
      return;
    }
    props.onClose();
    props.onSuccess();
  }

  if (!props.open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-md rounded border border-slate-300 p-0 backdrop:bg-black/20"
      onClose={props.onClose}
    >
      <form onSubmit={onSubmit} className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Schedule team</h3>
        <p className="text-xs text-slate-600">{props.teamLabel}</p>
        <input type="hidden" name="locationId" value={props.locationId} />
        <input type="hidden" name="complexId" value={props.complexId} />
        <input type="hidden" name="teamId" value={props.teamId} />
        <input type="hidden" name="assignmentDate" value={props.assignmentDate} />
        <input type="hidden" name="windowStart" value={props.windowStart} />
        <label className="block space-y-1 text-sm">
          <span className="text-xs font-medium text-slate-700">Field</span>
          <select
            name="fieldId"
            required
            defaultValue={props.defaultFieldId}
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
            required
            defaultValue={props.slotStarts[0] ?? "18:00"}
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
            defaultValue={String(props.defaultDurationMinutes)}
            className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="30">30 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
          </select>
        </label>
        <button
          type="button"
          onClick={props.onClose}
          className="w-full rounded border border-slate-300 py-2 text-sm hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={props.busy}
          className="w-full rounded bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
        >
          Place on schedule
        </button>
      </form>
    </dialog>
  );
}
