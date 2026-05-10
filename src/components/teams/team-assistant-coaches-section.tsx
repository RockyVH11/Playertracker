import {
  addAssistantCoachAction,
  removeAssistantCoachAction,
} from "@/app/actions/team-assistants";
import type { TeamAssistantCoachRow } from "@/lib/services/teams.service";
import { formatCoachPickerLabel } from "@/lib/ui/formatters";

type CoachOption = {
  id: string;
  firstName: string;
  lastName: string;
  staffRoleLabel?: string | null;
};

export function TeamAssistantCoachesSection(props: {
  teamId: string;
  assistants: TeamAssistantCoachRow[];
  coachChoices: CoachOption[];
  canManage: boolean;
}) {
  const { teamId, assistants, coachChoices, canManage } = props;

  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Assistant coaches</h2>
      <p className="mt-1 text-xs text-slate-600">
        Assistant coaches appear on this squad&apos;s staff roster (separate from the listed head coach above).
      </p>

      {assistants.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No assistant coaches assigned yet.</p>
      ) : (
        <ul className="mt-3 list-inside list-disc text-sm text-slate-800">
          {assistants.map((a) => (
            <li key={a.id}>
              {a.coach.lastName}, {a.coach.firstName}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="mt-4 space-y-4">
          <form action={addAssistantCoachAction} className="flex flex-wrap items-end gap-2">
            <input name="teamId" type="hidden" value={teamId} />
            <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs text-slate-600">
              <span>Add assistant</span>
              <select
                name="coachId"
                className="rounded border border-slate-300 px-2 py-2 text-sm text-slate-900"
                defaultValue=""
              >
                <option value="">No assistant</option>
                {coachChoices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatCoachPickerLabel(c)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            >
              Assign assistant
            </button>
          </form>

          <form action={removeAssistantCoachAction} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
            <input name="teamId" type="hidden" value={teamId} />
            <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs text-slate-600">
              <span>Remove assistant</span>
              <select
                name="teamCoachId"
                className="rounded border border-slate-300 px-2 py-2 text-sm text-slate-900"
                defaultValue=""
              >
                <option value="">No assistant</option>
                {assistants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.coach.lastName}, {a.coach.firstName}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              Remove selected
            </button>
          </form>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          Only staff authorized for this team can assign assistants.
        </p>
      )}
    </section>
  );
}
