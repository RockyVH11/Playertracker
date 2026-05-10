"use client";

import { useMemo, useState } from "react";
import type { EvaluationLevel } from "@prisma/client";
import { formatEval } from "@/lib/ui/formatters";

export type EvaluationHistoryPickRow = {
  id: string;
  createdAtIso: string;
  evaluationLevel: EvaluationLevel;
  evaluationNotes: string | null;
  byLabel: string | null;
};

export function PlayerEvaluationHistoryBrowser(props: {
  currentLevel: EvaluationLevel;
  currentNotes: string | null;
  currentByLabel: string | null;
  currentDateIso: string | null;
  rows: EvaluationHistoryPickRow[];
}) {
  const { currentLevel, currentNotes, currentByLabel, currentDateIso, rows } = props;

  const [pick, setPick] = useState<string>("live");

  const snapshot = useMemo(
    () => (pick === "live" ? null : rows.find((r) => r.id === pick) ?? null),
    [pick, rows]
  );

  const displayedLevel = snapshot ? snapshot.evaluationLevel : currentLevel;
  const displayedNotes = snapshot ? snapshot.evaluationNotes : currentNotes;
  const displayedBy = snapshot ? snapshot.byLabel : currentByLabel;
  const displayedDate = snapshot ? snapshot.createdAtIso : currentDateIso;

  return (
    <div className="space-y-2 rounded border border-slate-200 bg-white p-3 text-sm">
      <div className="text-xs font-medium text-slate-600">Past evaluations</div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-600">
          The five most recent evaluation saves appear here once you record changes from the roster sheet or profile.
          Latest on-file values stay above.
        </p>
      ) : (
        <>
          <p className="text-xs text-slate-600">
            Up to five recent saves; pick a snapshot to compare wording and who recorded it.
          </p>
          <label className="block space-y-1 text-xs">
            <span className="font-medium text-slate-700">Snapshot</span>
            <select
              className="w-full rounded border border-slate-300 bg-white px-2 py-2 text-sm"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
            >
              <option value="live">
                Latest on file ({currentDateIso?.slice(0, 10) ?? "—"}
                {" · "}
                {currentByLabel ?? "—"})
              </option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.createdAtIso.slice(0, 10)} · {r.byLabel ?? "—"}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <div className="rounded border border-slate-100 bg-slate-50/80 p-2 text-xs text-slate-800">
        <div className="font-medium">{formatEval(displayedLevel)}</div>
        {displayedNotes?.trim() ? (
          <p className="mt-2 whitespace-pre-wrap">{displayedNotes}</p>
        ) : (
          <p className="mt-2 text-slate-500">No evaluation notes for this snapshot.</p>
        )}
        <p className="mt-2 text-[11px] text-slate-500">
          {displayedBy ? `Recorded by ${displayedBy}` : "Recorded by —"}
          {displayedDate ? ` · ${displayedDate.slice(0, 10)}` : ""}
        </p>
      </div>
    </div>
  );
}
