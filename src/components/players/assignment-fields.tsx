"use client";

import { useMemo, useState } from "react";

type TeamOption = { id: string; teamName: string; ageGroup: string; gender: "BOYS" | "GIRLS" };
type LocationOption = { id: string; name: string };

type Props = {
  teams: TeamOption[];
  locations: LocationOption[];
  defaultMode?: "team" | "pool";
  defaultTeamId?: string;
};

/**
 * Assignment mode selector for new player intake:
 * - team mode => assignedTeamId set
 * - pool mode => assignedTeamId blank + locationId set by pool location
 */
export function AssignmentFields({
  teams,
  locations,
  defaultMode = "pool",
  defaultTeamId = "",
}: Props) {
  const [mode, setMode] = useState<"team" | "pool">(defaultMode);
  const [teamId, setTeamId] = useState(defaultTeamId);
  const [teamLocation, setTeamLocation] = useState(locations[0]?.id ?? "");
  const [poolLocation, setPoolLocation] = useState(locations[0]?.id ?? "__POOL_GENERAL__");

  const effectiveLocationId = useMemo(
    () => (mode === "team" ? teamLocation : poolLocation),
    [mode, teamLocation, poolLocation]
  );

  return (
    <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
      <div className="text-sm font-medium text-slate-800">Assignment</div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="assignmentMode"
            value="team"
            checked={mode === "team"}
            onChange={() => setMode("team")}
          />
          Assign to team
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="assignmentMode"
            value="pool"
            checked={mode === "pool"}
            onChange={() => setMode("pool")}
          />
          Assign to pool
        </label>
      </div>

      {mode === "team" ? (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Team</span>
          <select
            className="w-full rounded border border-slate-300 px-2 py-2"
            name="assignedTeamId"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            required
          >
            <option value="">Select team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.teamName} · {t.ageGroup} · {t.gender}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="assignedTeamId" value="" />
      )}

      {mode === "team" ? (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Player location</span>
          <select
            className="w-full rounded border border-slate-300 px-2 py-2"
            value={teamLocation}
            onChange={(e) => setTeamLocation(e.target.value)}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Pool location</span>
          <select
            className="w-full rounded border border-slate-300 px-2 py-2"
            value={poolLocation}
            onChange={(e) => setPoolLocation(e.target.value)}
          >
            <option value="__POOL_GENERAL__">Pool - General</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                Pool - {l.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <input type="hidden" name="locationId" value={effectiveLocationId} />
    </div>
  );
}
