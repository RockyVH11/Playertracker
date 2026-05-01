"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type PostCreateTeamPromptProps = {
  /** Super admins use `/teams/new`; coaches use `/teams/add?seasonLabel=…`. */
  createAnotherHref: string;
};

/** After creating a team, URL may include promptAddAnother=1 — same UX as players. */
export function PostCreateTeamPrompt({ createAnotherHref }: PostCreateTeamPromptProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const show = searchParams.get("promptAddAnother") === "1";
  const newTeamId = searchParams.get("newTeam") ?? "";

  const stripPromptParams = (): string => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("promptAddAnother");
    next.delete("newTeam");
    const s = next.toString();
    return s ? `/teams?${s}` : "/teams";
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-create-team-prompt-title"
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <h2 id="post-create-team-prompt-title" className="text-lg font-semibold text-slate-900">
          Team saved
        </h2>
        <p className="mt-2 text-sm text-slate-600">Add another team?</p>
        {newTeamId ? (
          <p className="mt-2 text-sm text-slate-600">
            <Link href={`/teams/${newTeamId}`} className="font-medium text-slate-900 underline">
              View this roster
            </Link>
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => router.push(createAnotherHref)}
          >
            Yes
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            onClick={() => router.replace(stripPromptParams())}
          >
            No, back to list
          </button>
        </div>
      </div>
    </div>
  );
}
