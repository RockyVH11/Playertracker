"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import {
  indexFirstSlotAtOrAfter,
  viewportRowCount,
} from "@/lib/fields/schedule-view-window";

type Props = {
  slotStarts: string[];
  defaultScrollToHm: string;
  viewportHours: number;
  slotMinutes: number;
  children: ReactNode;
};

/** Scrollable grid; defaults to showing ~`viewportHours` at a time, scrolled to `defaultScrollToHm`. */
export function ScheduleGridScrollArea({
  slotStarts,
  defaultScrollToHm,
  viewportHours,
  slotMinutes,
  children,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = scrollRef.current;
    if (!root || slotStarts.length === 0) return;
    const i = indexFirstSlotAtOrAfter(slotStarts, defaultScrollToHm);
    const hm = slotStarts[i];
    const row = root.querySelector(`[data-schedule-slot="${hm}"]`);
    row?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [slotStarts, defaultScrollToHm]);

  const rowsVisible = viewportRowCount(viewportHours, slotMinutes);
  const maxHeightRem = Math.min(36, rowsVisible * 2.75);

  return (
    <div
      ref={scrollRef}
      className="overflow-auto border border-slate-200 bg-white"
      style={{ maxHeight: `min(70vh, ${maxHeightRem}rem)` }}
    >
      {children}
    </div>
  );
}
