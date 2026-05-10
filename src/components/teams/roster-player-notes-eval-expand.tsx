import { EvaluationLevel } from "@prisma/client";
import { saveTeamRosterPlayerNotesEvalFormAction } from "@/app/actions/team-roster";
import { formatEval } from "@/lib/ui/formatters";

const EVAL_OPTIONS: EvaluationLevel[] = ["RL", "N1", "N2", "GRASSROOTS", "NOT_EVALUATED"];

type CoachLabel = { firstName: string; lastName: string } | null;

export function RosterPlayerNotesEvalExpand(props: {
  teamId: string;
  playerId: string;
  coachNotes: string | null;
  evaluationLevel: EvaluationLevel;
  evaluationNotes: string | null;
  evaluationAuthorCoach: CoachLabel;
  evaluationUpdatedAt: Date | null;
  canEdit: boolean;
}) {
  const {
    teamId,
    playerId,
    coachNotes,
    evaluationLevel,
    evaluationNotes,
    evaluationAuthorCoach,
    evaluationUpdatedAt,
    canEdit,
  } = props;

  const byLine =
    evaluationAuthorCoach != null
      ? `${evaluationAuthorCoach.lastName}, ${evaluationAuthorCoach.firstName}`
      : "—";

  const dateLine = evaluationUpdatedAt ? evaluationUpdatedAt.toISOString().slice(0, 10) : "";

  return (
    <details className="text-left [&[open]>summary>.plus-span]:hidden [&[open]>summary>.minus-span]:inline">
      <summary
        title="Coach notes and evaluation"
        className="mx-auto inline-flex cursor-pointer select-none list-none items-center justify-center rounded border border-slate-200 bg-white px-1.5 py-0.5 text-sm font-semibold leading-none text-slate-700 marker:hidden hover:bg-slate-50 hover:border-slate-300 [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden className="minus-span hidden">
          −
        </span>
        <span aria-hidden className="plus-span inline">
          +
        </span>
        <span className="sr-only">Toggle coach notes and evaluation</span>
      </summary>
      <div className="mt-2 w-[min(22rem,calc(100vw-2rem))] max-w-none space-y-3 rounded border border-slate-200 bg-slate-50/95 p-2 shadow-sm text-xs text-slate-800">
        <div className="space-y-0.5 border-b border-slate-200 pb-2 text-[11px] text-slate-600">
          <div>
            Evaluated by <span className="font-medium text-slate-700">{byLine}</span>
            {dateLine ? <span>{` · ${dateLine}`}</span> : null}
          </div>
        </div>
        <div className="space-y-1">
          <div className="font-medium text-slate-700">Current evaluation</div>
          <div>
            Level: <span className="font-medium">{formatEval(evaluationLevel)}</span>
          </div>
          {evaluationNotes?.trim() ? (
            <p className="whitespace-pre-wrap text-slate-700">{evaluationNotes}</p>
          ) : (
            <p className="text-slate-500">No evaluation notes saved.</p>
          )}
        </div>
        <div className="space-y-1">
          <div className="font-medium text-slate-700">Coach notes</div>
          {coachNotes?.trim() ? (
            <p className="whitespace-pre-wrap text-slate-700">{coachNotes}</p>
          ) : (
            <p className="text-slate-500">None yet.</p>
          )}
        </div>
        {canEdit ? (
          <form action={saveTeamRosterPlayerNotesEvalFormAction} className="space-y-2 border-t border-slate-200 pt-2">
            <input name="teamId" type="hidden" value={teamId} />
            <input name="playerId" type="hidden" value={playerId} />
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-slate-700">Coach notes (max 500)</span>
              <textarea
                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-sans text-xs"
                defaultValue={coachNotes ?? ""}
                maxLength={500}
                name="coachNotes"
                rows={3}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-slate-700">Evaluation level</span>
              <select
                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
                defaultValue={evaluationLevel}
                name="evaluationLevel"
                required
              >
                {EVAL_OPTIONS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-slate-700">Evaluation notes</span>
              <textarea
                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-sans text-xs"
                defaultValue={evaluationNotes ?? ""}
                name="evaluationNotes"
                rows={3}
              />
            </label>
            <button
              className="rounded bg-slate-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
              type="submit"
            >
              Save notes & evaluation
            </button>
          </form>
        ) : (
          <p className="border-t border-slate-200 pt-2 text-[11px] text-slate-500">
            You can view notes here. Coaches who manage this roster can edit.
          </p>
        )}
      </div>
    </details>
  );
}
