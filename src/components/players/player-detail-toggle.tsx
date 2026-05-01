"use client";

import { type ReactNode, useState } from "react";

/** Collapsed by default: summary only. Click the name to show evaluation, roster details, contact, and edit. */
export function PlayerDetailToggle({
  title,
  seasonLine,
  summary,
  details,
}: {
  title: ReactNode;
  seasonLine: ReactNode;
  summary: ReactNode;
  details: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div>
        <button
          type="button"
          className="text-left text-2xl font-semibold tracking-tight text-slate-900 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 rounded-sm"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {title}
        </button>
        <div className="mt-1 text-sm text-slate-600">{seasonLine}</div>
        <p className="mt-2 text-xs text-slate-500">
          {open ? "Click name to hide full profile." : "Click name for evaluation, assignment details, and editing."}
        </p>
      </div>
      {summary}
      {open ? <div className="space-y-6">{details}</div> : null}
    </div>
  );
}
