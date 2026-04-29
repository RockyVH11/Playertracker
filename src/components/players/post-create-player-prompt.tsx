"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * After creating a player, URL may include promptAddAnother=1. Offers add-another vs stay on list (No clears URL flags).
 */
export function PostCreatePlayerPrompt() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const show = searchParams.get("promptAddAnother") === "1";
  const duplicate = searchParams.get("duplicate") === "1";
  const newPlayer = searchParams.get("newPlayer") ?? "";
  if (!show) return null;

  const stripPromptParams = (): string => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("promptAddAnother");
    next.delete("newPlayer");
    next.delete("duplicate");
    const s = next.toString();
    return s ? `/players?${s}` : "/players";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-create-player-prompt-title"
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <h2 id="post-create-player-prompt-title" className="text-lg font-semibold text-slate-900">
          Player saved
        </h2>
        <p className="mt-2 text-sm text-slate-600">Add another player?</p>
        {duplicate && newPlayer ? (
          <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Possible duplicate: another profile may match name, DOB, and gender.{" "}
            <Link href={`/players/${newPlayer}`} className="font-medium underline">
              Review this profile
            </Link>
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => router.push("/players/new")}
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
