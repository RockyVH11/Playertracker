import type { PlayerListRow } from "@/lib/services/players.service";
import { ageGroupRank } from "@/lib/data/age-group-range";

export const PLAYER_GRID_SORT_KEYS = [
  "player",
  "age",
  "dob",
  "location",
  "status",
  "position",
  "team",
] as const;

export type PlayerGridSortKey = (typeof PLAYER_GRID_SORT_KEYS)[number];

export function isPlayerGridSortKey(s: string | undefined): s is PlayerGridSortKey {
  return s != null && (PLAYER_GRID_SORT_KEYS as readonly string[]).includes(s);
}

/** Backward compat if bookmark stored old columns (eval / playUp). */
const LEGACY_SORT_MAP: Record<string, PlayerGridSortKey> = {
  eval: "status",
  playUp: "player",
};

export function normalizeDashboardPlayerSortKey(s: string | undefined): PlayerGridSortKey | undefined {
  if (s == null || s.trim() === "") return undefined;
  if (isPlayerGridSortKey(s)) return s;
  return LEGACY_SORT_MAP[s] ?? undefined;
}

function effectiveAgeGroup(p: PlayerListRow): string {
  return p.overrideAgeGroup ?? p.derivedAgeGroup;
}

function compareAgeGroupLabel(a: string, b: string): number {
  const ra = ageGroupRank(a);
  const rb = ageGroupRank(b);
  if (ra != null && rb != null) return ra - rb;
  if (ra != null) return -1;
  if (rb != null) return 1;
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function compareDashboardPlayerRows(
  a: PlayerListRow,
  b: PlayerListRow,
  key: PlayerGridSortKey
): number {
  switch (key) {
    case "player": {
      const ln = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
      if (ln !== 0) return ln;
      return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
    }
    case "age":
      return compareAgeGroupLabel(effectiveAgeGroup(a), effectiveAgeGroup(b));
    case "dob":
      return a.dob.getTime() - b.dob.getTime();
    case "location":
      return a.location.name.localeCompare(b.location.name, undefined, { sensitivity: "base" });
    case "status":
      return a.playerStatus.localeCompare(b.playerStatus);
    case "position": {
      const pa = `${a.primaryPosition}${a.secondaryPosition ?? ""}`;
      const pb = `${b.primaryPosition}${b.secondaryPosition ?? ""}`;
      return pa.localeCompare(pb);
    }
    case "team": {
      const sa = a.assignedTeam
        ? `${a.assignedTeam.coach.lastName} ${a.assignedTeam.teamName}`
        : "";
      const sb = b.assignedTeam
        ? `${b.assignedTeam.coach.lastName} ${b.assignedTeam.teamName}`
        : "";
      return sa.localeCompare(sb, undefined, { sensitivity: "base" });
    }
    default:
      return 0;
  }
}

export function sortDashboardPlayerRows(
  rows: PlayerListRow[],
  key: PlayerGridSortKey | undefined,
  dir: "asc" | "desc" | undefined
): PlayerListRow[] {
  const k = key ?? "player";
  const d = dir ?? "asc";
  const mul = d === "asc" ? 1 : -1;
  return [...rows].sort((x, y) => {
    const c = compareDashboardPlayerRows(x, y, k);
    if (c !== 0) return mul * c;
    const ln = x.lastName.localeCompare(y.lastName, undefined, { sensitivity: "base" });
    if (ln !== 0) return ln;
    return x.firstName.localeCompare(y.firstName, undefined, { sensitivity: "base" });
  });
}

export function nextPlayerGridSort(
  currentCol: PlayerGridSortKey | undefined,
  currentDir: "asc" | "desc" | undefined,
  clicked: PlayerGridSortKey
): { col: PlayerGridSortKey; dir: "asc" | "desc" } {
  if (currentCol == null) {
    return { col: clicked, dir: "asc" };
  }
  const dir = currentDir ?? "asc";
  if (currentCol === clicked) {
    return { col: clicked, dir: dir === "asc" ? "desc" : "asc" };
  }
  return { col: clicked, dir: "asc" };
}
