import { DayOfWeek } from "@prisma/client";
import {
  assignmentMinutes,
  availabilityHullFromRows,
  blackoutIntervalsInHull,
  netOpenMinutes,
} from "@/lib/fields/dashboard-metrics";
import { dayOfWeekFromDate } from "@/lib/fields/day-of-week-from-date";
import { dayOfWeekLabel } from "@/lib/fields/day-of-week-order";
import { formatYmdLocal } from "@/lib/fields/local-date";
import { prisma } from "@/lib/prisma";

export type ComplexRollup = {
  complexId: string;
  complexName: string;
  netCapacityMinutes: number;
  scheduledMinutes: number;
};

export type WeekdayScheduledBar = {
  dow: DayOfWeek;
  label: string;
  scheduledMinutes: number;
};

export type DashboardPeriodRollup = {
  netCapacityMinutes: number;
  scheduledMinutes: number;
  byComplex: ComplexRollup[];
  byWeekday: WeekdayScheduledBar[];
};

function blackoutsApplicableToField<
  T extends {
    complexId: string;
    fieldId: string | null;
    blackoutDate: Date;
    startTime: string | null;
    endTime: string | null;
  },
>(rows: T[], field: { id: string; complexId: string }, day: Date): T[] {
  const ymd = formatYmdLocal(day);
  return rows.filter((b) => {
    if (b.complexId !== field.complexId) return false;
    if (formatYmdLocal(b.blackoutDate) !== ymd) return false;
    if (b.fieldId != null && b.fieldId !== field.id) return false;
    return true;
  });
}

/** Capacity + scheduled minutes for each calendar day in `days` (location-wide). */
export async function rollupFieldDashboardForDays(
  locationId: string,
  days: Date[]
): Promise<DashboardPeriodRollup> {
  if (days.length === 0) {
    return {
      netCapacityMinutes: 0,
      scheduledMinutes: 0,
      byComplex: [],
      byWeekday: [],
    };
  }

  const fields = await prisma.field.findMany({
    where: {
      isActive: true,
      complex: { locationId, isActive: true },
    },
    select: {
      id: true,
      complexId: true,
      complex: { select: { id: true, name: true } },
    },
  });

  const complexIds = [...new Set(fields.map((f) => f.complexId))];
  const availRows = await prisma.complexAvailability.findMany({
    where: {
      isActive: true,
      complexId: { in: complexIds },
    },
    select: {
      complexId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
    },
  });

  const rangeStart = days.reduce((a, b) => (a < b ? a : b));
  const rangeEnd = days.reduce((a, b) => (a > b ? a : b));

  const [assignments, blackouts] = await Promise.all([
    prisma.fieldAssignment.findMany({
      where: {
        field: { complex: { locationId } },
        assignmentDate: { gte: rangeStart, lte: rangeEnd },
      },
      select: {
        fieldId: true,
        assignmentDate: true,
        startTime: true,
        endTime: true,
      },
    }),
    prisma.fieldBlackout.findMany({
      where: {
        complex: { locationId },
        blackoutDate: { gte: rangeStart, lte: rangeEnd },
      },
      select: {
        complexId: true,
        fieldId: true,
        blackoutDate: true,
        startTime: true,
        endTime: true,
      },
    }),
  ]);

  const assignmentsByFieldDay = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const key = `${a.fieldId}:${formatYmdLocal(a.assignmentDate)}`;
    const list = assignmentsByFieldDay.get(key) ?? [];
    list.push(a);
    assignmentsByFieldDay.set(key, list);
  }

  const complexTotals = new Map<
    string,
    { name: string; netCapacityMinutes: number; scheduledMinutes: number }
  >();

  const weekdayScheduled = new Map<DayOfWeek, number>();

  for (const f of fields) {
    const cname = f.complex.name;
    if (!complexTotals.has(f.complexId)) {
      complexTotals.set(f.complexId, {
        name: cname,
        netCapacityMinutes: 0,
        scheduledMinutes: 0,
      });
    }

    for (const day of days) {
      const dow = dayOfWeekFromDate(day);
      const rowsForHull = availRows.filter(
        (r) => r.complexId === f.complexId && r.dayOfWeek === dow
      );
      const hull = availabilityHullFromRows(rowsForHull);
      if (!hull) continue;

      const dayBlackouts = blackoutsApplicableToField(blackouts, f, day);
      const bi = blackoutIntervalsInHull(dayBlackouts, hull);
      const net = netOpenMinutes(hull, bi);

      const ct = complexTotals.get(f.complexId)!;
      ct.netCapacityMinutes += net;

      const key = `${f.id}:${formatYmdLocal(day)}`;
      const dayAssignments = assignmentsByFieldDay.get(key) ?? [];
      let used = 0;
      for (const a of dayAssignments) {
        const m = assignmentMinutes(a.startTime, a.endTime);
        used += m;
        const wd = dayOfWeekFromDate(a.assignmentDate);
        weekdayScheduled.set(wd, (weekdayScheduled.get(wd) ?? 0) + m);
      }
      ct.scheduledMinutes += used;
    }
  }

  let netCapacityMinutes = 0;
  let scheduledMinutes = 0;
  const byComplex: ComplexRollup[] = [];
  for (const [complexId, v] of complexTotals) {
    netCapacityMinutes += v.netCapacityMinutes;
    scheduledMinutes += v.scheduledMinutes;
    byComplex.push({
      complexId,
      complexName: v.name,
      netCapacityMinutes: v.netCapacityMinutes,
      scheduledMinutes: v.scheduledMinutes,
    });
  }

  byComplex.sort((a, b) => a.complexName.localeCompare(b.complexName));

  const weekOrder: DayOfWeek[] = [
    DayOfWeek.SUN,
    DayOfWeek.MON,
    DayOfWeek.TUE,
    DayOfWeek.WED,
    DayOfWeek.THU,
    DayOfWeek.FRI,
    DayOfWeek.SAT,
  ];

  const byWeekday: WeekdayScheduledBar[] = weekOrder.map((dow) => ({
    dow,
    label: dayOfWeekLabel(dow),
    scheduledMinutes: weekdayScheduled.get(dow) ?? 0,
  }));

  return {
    netCapacityMinutes,
    scheduledMinutes,
    byComplex,
    byWeekday,
  };
}
