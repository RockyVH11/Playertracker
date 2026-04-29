"use client";

import {
  discardTeamSquadDraftAction,
  finalizeSquadBlackRedSplitAction,
} from "@/app/actions/teams";

type FormBaseRoute = "teams" | "admin";

/**
 * Shown after a duplicate auto-generated team name: offer -Black/-Red split workflow.
 */
export function TeamSquadSplitModal({
  show,
  stale,
  formBase,
}: {
  show: boolean;
  stale: boolean;
  formBase: FormBaseRoute;
}) {
  if (!show) return null;

  const hiddenBase = formBase === "admin" ? "admin" : "teams";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="squad-split-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <h2 id="squad-split-title" className="text-lg font-semibold text-slate-900">
          Duplicate roster name (auto-generated)
        </h2>
        {stale ? (
          <p className="mt-3 text-sm text-amber-900">
            This dialog has expired—submit the form again to retry the squad split, or discard below.
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            A roster already matches this auto-calculated display name for the season. If you intentionally
            run two parallel squads, continuing will rename that existing roster to end with{" "}
            <strong>-Black</strong> and save the roster you&apos;re adding as<strong> -Red</strong>.
          </p>
        )}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <form action={finalizeSquadBlackRedSplitAction}>
            <input type="hidden" name="_formBase" value={hiddenBase} />
            <button
              type="submit"
              className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto"
            >
              Rename first to –Black &amp; create second as –Red
            </button>
          </form>
          <form action={discardTeamSquadDraftAction}>
            <input type="hidden" name="_formBase" value={hiddenBase} />
            <button
              type="submit"
              className="w-full rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:w-auto"
            >
              Discard and stay on form
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
