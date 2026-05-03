import {
  nextPlayerGridSort,
  normalizeDashboardPlayerSortKey,
  type PlayerGridSortKey,
} from "@/lib/dashboard/player-grid-sort";

/** Serializable dashboard filter snapshot (matches GET form/query). */
export type DashboardQueryValues = {
  seasonLabel?: string;
  leagueId?: string;
  locationId?: string;
  gender?: string;
  ageGroupMin?: string;
  ageGroupMax?: string;
  coachId?: string;
  teamId?: string;
  teamSort?: string;
  dobMin?: string;
  dobMax?: string;
  playerEvaluation?: string;
  playerStatus?: string;
  playerPosition?: string;
  willingToPlayUp?: string;
  pSort?: string;
  pDir?: string;
};

export function serializeDashboardQuery(v: DashboardQueryValues): string {
  const q = new URLSearchParams();
  const append = (key: string, value: string | undefined) => {
    if (value != null && String(value).trim().length > 0) q.set(key, String(value).trim());
  };
  append("seasonLabel", v.seasonLabel);
  append("leagueId", v.leagueId);
  append("locationId", v.locationId);
  append("gender", v.gender);
  append("ageGroupMin", v.ageGroupMin);
  append("ageGroupMax", v.ageGroupMax);
  append("coachId", v.coachId);
  append("teamId", v.teamId);
  if (v.teamSort != null && v.teamSort.trim().length > 0) q.set("teamSort", v.teamSort);
  else q.set("teamSort", "team");
  append("dobMin", v.dobMin);
  append("dobMax", v.dobMax);
  append("playerEvaluation", v.playerEvaluation);
  append("playerStatus", v.playerStatus);
  append("playerPosition", v.playerPosition);
  if (v.willingToPlayUp != null && v.willingToPlayUp.trim().length > 0) q.set("willingToPlayUp", v.willingToPlayUp);
  else q.set("willingToPlayUp", "any");
  if (v.pSort != null && v.pSort.length > 0) q.set("pSort", v.pSort);
  if (v.pDir === "desc" || v.pDir === "asc") q.set("pDir", v.pDir);
  return q.toString();
}

export function dashboardHref(v: DashboardQueryValues): string {
  const qs = serializeDashboardQuery(v);
  return qs.length > 0 ? `/dashboard?${qs}` : "/dashboard";
}

export function dashboardPlayerSortHref(
  base: DashboardQueryValues,
  clicked: PlayerGridSortKey
): string {
  const curCol = normalizeDashboardPlayerSortKey(base.pSort);
  const curDir = base.pDir === "asc" || base.pDir === "desc" ? base.pDir : undefined;
  const { col, dir } = nextPlayerGridSort(curCol, curDir, clicked);
  return dashboardHref({
    ...base,
    pSort: col,
    pDir: dir,
  });
}
