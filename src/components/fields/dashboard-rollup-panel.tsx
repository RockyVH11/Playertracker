import type { DashboardPeriodRollup } from "@/lib/fields/field-dashboard-rollup";

function hoursOneDecimal(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

export function DashboardRollupPanel({
  title,
  rangeDescription,
  rollup,
}: {
  title: string;
  rangeDescription: string;
  rollup: DashboardPeriodRollup;
}) {
  const utilPct =
    rollup.netCapacityMinutes > 0
      ? (rollup.scheduledMinutes / rollup.netCapacityMinutes) * 100
      : null;

  const maxWeekday = Math.max(
    1,
    ...rollup.byWeekday.map((w) => w.scheduledMinutes)
  );

  return (
    <section className="space-y-4 rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{rangeDescription}</p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Net capacity
          </dt>
          <dd className="text-lg font-semibold text-slate-900">
            {hoursOneDecimal(rollup.netCapacityMinutes)} h
          </dd>
          <dd className="text-xs text-slate-500">
            Open hours minus blackouts, all fields included once each.
          </dd>
        </div>
        <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Scheduled
          </dt>
          <dd className="text-lg font-semibold text-slate-900">
            {hoursOneDecimal(rollup.scheduledMinutes)} h
          </dd>
          <dd className="text-xs text-slate-500">Assignment durations summed.</dd>
        </div>
        <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Utilization
          </dt>
          <dd className="text-lg font-semibold text-slate-900">
            {utilPct != null ? `${utilPct.toFixed(1)}%` : "—"}
          </dd>
          <dd className="text-xs text-slate-500">
            Scheduled ÷ net capacity (can exceed 100% if bookings sit outside published windows).
          </dd>
        </div>
      </dl>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">By complex</h3>
        {rollup.byComplex.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No active fields for this location.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-2 py-2">Complex</th>
                  <th className="px-2 py-2 text-right">Net capacity (h)</th>
                  <th className="px-2 py-2 text-right">Scheduled (h)</th>
                  <th className="px-2 py-2 text-right">Util %</th>
                </tr>
              </thead>
              <tbody>
                {rollup.byComplex.map((row) => {
                  const u =
                    row.netCapacityMinutes > 0
                      ? (row.scheduledMinutes / row.netCapacityMinutes) * 100
                      : null;
                  return (
                    <tr key={row.complexId} className="border-b border-slate-100">
                      <td className="px-2 py-2">{row.complexName}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {hoursOneDecimal(row.netCapacityMinutes)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {hoursOneDecimal(row.scheduledMinutes)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {u != null ? `${u.toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Scheduled time by weekday</h3>
        <p className="mt-1 text-xs text-slate-500">
          Bars scale to the busiest day in this period for shape only (absolute hours are on the
          right).
        </p>
        <ul className="mt-3 space-y-2">
          {rollup.byWeekday.map((w) => (
            <li key={w.dow} className="flex items-center gap-3 text-sm">
              <span className="w-12 shrink-0 text-slate-600">{w.label}</span>
              <div className="min-w-0 flex-1">
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-sky-600"
                    style={{
                      width: `${Math.min(100, (w.scheduledMinutes / maxWeekday) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <span className="w-14 shrink-0 text-right tabular-nums text-slate-700">
                {hoursOneDecimal(w.scheduledMinutes)} h
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
