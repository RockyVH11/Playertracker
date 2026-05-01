import Link from "next/link";
import {
  dashboardPlayerSortHref,
  type DashboardQueryValues,
} from "@/lib/dashboard/dashboard-query-params";
import type { PlayerGridSortKey } from "@/lib/dashboard/player-grid-sort";

/** Click header to sort player grid (↑/↓). First click ascending, second toggles descending. */
export function DashboardPlayerSortTh({
  col,
  label,
  querySnapshot,
}: {
  col: PlayerGridSortKey;
  label: string;
  querySnapshot: DashboardQueryValues;
}) {
  const effective = querySnapshot.pSort ?? "player";
  const dir = querySnapshot.pDir === "desc" ? "desc" : "asc";
  const active = effective === col;
  const arrow = active ? (dir === "asc" ? " ↑" : " ↓") : "";
  return (
    <th className="px-2 py-2">
      <Link
        href={dashboardPlayerSortHref(querySnapshot, col)}
        className={
          active
            ? "font-semibold text-slate-900 underline-offset-2 hover:underline"
            : "text-slate-700 underline-offset-2 hover:underline"
        }
      >
        {label}
        <span aria-hidden="true">{arrow}</span>
      </Link>
    </th>
  );
}
