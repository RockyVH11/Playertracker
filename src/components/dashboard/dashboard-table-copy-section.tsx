"use client";

import { type ReactNode, useCallback, useRef, useState } from "react";
import { normalizeCellText, tabDelimitedFromRows } from "@/lib/ui/table-tsv";

/** Extract visible cell text as tab-separated rows (paste into Excel, Sheets, or email). */
export function tableToTabDelimited(table: HTMLTableElement): string {
  const rows: string[][] = [];
  for (const tr of table.querySelectorAll("tr")) {
    const cells: string[] = [];
    for (const cell of tr.querySelectorAll("th, td")) {
      cells.push(normalizeCellText(cell.textContent ?? ""));
    }
    if (cells.length > 0) rows.push(cells);
  }
  return tabDelimitedFromRows(rows);
}

export function DashboardTableCopySection({
  title,
  copyIntro,
  copyButtonLabel,
  children,
}: {
  title: string;
  /** Prepended to the clipboard only (context line). */
  copyIntro?: string;
  copyButtonLabel: string;
  children: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const copy = useCallback(async () => {
    const table = wrapRef.current?.querySelector("table");
    if (!table) {
      setFeedback("Nothing to copy");
      setTimeout(() => setFeedback(null), 2500);
      return;
    }
    const tsv = tableToTabDelimited(table);
    const text = copyIntro?.trim() ? `${copyIntro.trim()}\n\n${tsv}` : tsv;
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("Copied");
    } catch {
      setFeedback("Copy blocked — use a secure page or allow clipboard access");
    }
    setTimeout(() => setFeedback(null), 2200);
  }, [copyIntro]);

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <div className="flex items-center gap-2">
          {feedback ? (
            <span className="text-xs text-slate-600" aria-live="polite">
              {feedback}
            </span>
          ) : null}
          <button
            type="button"
            onClick={copy}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            {copyButtonLabel}
          </button>
        </div>
      </div>
      <div ref={wrapRef}>{children}</div>
    </section>
  );
}
