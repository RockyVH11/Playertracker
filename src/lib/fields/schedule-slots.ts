import { DayOfWeek } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hmToMinutes } from "@/lib/validation/fields-availability";
import { minutesToHm } from "@/lib/fields/assignment-intervals";

/** Generate slot start labels every `stepMinutes` from [startHm, endHm). */
export function generateSlotStarts(startHm: string, endHm: string, stepMinutes: number): string[] {
  const s = hmToMinutes(startHm);
  const e = hmToMinutes(endHm);
  if (s == null || e == null || stepMinutes <= 0 || e <= s) return [];
  const out: string[] = [];
  for (let t = s; t < e; t += stepMinutes) {
    out.push(minutesToHm(t));
  }
  return out;
}

/**
 * Union of availability windows for the location on `dow`.
 * Falls back to 08:00–22:00 if none configured.
 */
export async function buildScheduleSlotStartsForLocation(
  locationId: string,
  dow: DayOfWeek,
  slotMinutes: number
): Promise<string[]> {
  const rows = await prisma.complexAvailability.findMany({
    where: {
      isActive: true,
      dayOfWeek: dow,
      complex: { locationId, isActive: true },
    },
    select: { startTime: true, endTime: true },
  });

  if (rows.length === 0) {
    return generateSlotStarts("08:00", "22:00", slotMinutes);
  }

  let minM = Infinity;
  let maxM = -Infinity;
  for (const r of rows) {
    const a = hmToMinutes(r.startTime);
    const b = hmToMinutes(r.endTime);
    if (a == null || b == null) continue;
    minM = Math.min(minM, a);
    maxM = Math.max(maxM, b);
  }
  if (!Number.isFinite(minM) || !Number.isFinite(maxM) || maxM <= minM) {
    return generateSlotStarts("08:00", "22:00", slotMinutes);
  }

  return generateSlotStarts(minutesToHm(minM), minutesToHm(maxM), slotMinutes);
}

export function buildSlotStartsFromAvailabilityWindows(
  windows: Array<{ startTime: string; endTime: string }>,
  stepMinutes: number
): string[] {
  const starts = new Set<string>();
  for (const w of windows) {
    for (const s of generateSlotStarts(w.startTime, w.endTime, stepMinutes)) {
      starts.add(s);
    }
  }
  const out = Array.from(starts);
  out.sort((a, b) => {
    const am = hmToMinutes(a) ?? 0;
    const bm = hmToMinutes(b) ?? 0;
    return am - bm;
  });
  return out;
}
