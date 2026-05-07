"use client";

import { useMemo, useState, useTransition } from "react";
import type { PlayerPosition } from "@prisma/client";
import { useRouter } from "next/navigation";
import { commitDraftPlayerAction, unassignDraftPlayerAction } from "@/app/actions/players";
import {
  formatDraftRosterCopy,
  formatRosterContactsCopy,
  formatRosterContactsTsv,
} from "@/lib/dashboard/team-building-copy";

type PlayerRow = {
  id: string;
  firstName: string;
  lastName: string;
  gender: "BOYS" | "GIRLS";
  dobUs: string;
  ageGroup: string;
  primaryPosition: PlayerPosition;
  secondaryPosition: PlayerPosition | null;
  assignedTeamId: string | null;
  assignedTeamName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
};

type TeamStatus = {
  teamName: string;
  coachName: string;
  locationName: string;
  ageGroup: string;
  neededPlayerCount: number;
  assignedPlayerCount: number;
};

type Props = {
  selectedTeamId: string;
  selectedTeamName: string;
  selectedLocationName: string;
  selectedFilters: { locationName: string; sex: "BOYS" | "GIRLS" | "ALL"; ageGroup: string; assignment: string };
  teamStatus: TeamStatus | null;
  availablePlayers: PlayerRow[];
  assignedPlayers: PlayerRow[];
};

function positionBucket(pos: PlayerPosition | null | undefined): "GK" | "D" | "M" | "F" | "U" {
  if (pos === "GK") return "GK";
  if (pos === "DEFENDER") return "D";
  if (pos === "MIDFIELDER") return "M";
  if (pos === "FORWARD") return "F";
  return "U";
}

function positionLabel(pos: PlayerPosition | null): string {
  if (!pos) return "U";
  if (pos === "UNKNOWN" || pos === "UTILITY") return "U";
  if (pos === "DEFENDER") return "D";
  if (pos === "MIDFIELDER") return "M";
  if (pos === "FORWARD") return "F";
  return pos;
}

export function TeamBuildingDashboard({
  selectedTeamId,
  selectedTeamName,
  selectedLocationName,
  selectedFilters,
  teamStatus,
  availablePlayers,
  assignedPlayers,
}: Props) {
  const router = useRouter();
  const [draftIds, setDraftIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const assignedIdSet = useMemo(() => new Set(assignedPlayers.map((p) => p.id)), [assignedPlayers]);
  const draftPlayers = useMemo(() => {
    const added = availablePlayers.filter((p) => draftIds.has(p.id));
    const byId = new Map<string, PlayerRow>();
    for (const p of assignedPlayers) byId.set(p.id, p);
    for (const p of added) byId.set(p.id, p);
    return [...byId.values()];
  }, [assignedPlayers, availablePlayers, draftIds]);

  const counts = useMemo(() => {
    const base = { GK: 0, D: 0, M: 0, F: 0, U: 0 };
    for (const p of draftPlayers) base[positionBucket(p.primaryPosition)] += 1;
    return base;
  }, [draftPlayers]);

  const visibleAvailable = useMemo(
    () => availablePlayers.filter((p) => !assignedIdSet.has(p.id) && !draftIds.has(p.id)),
    [availablePlayers, assignedIdSet, draftIds]
  );

  async function copyDraftRoster() {
    const text = formatDraftRosterCopy({
      teamName: selectedTeamName,
      locationName: selectedLocationName,
      filters: selectedFilters,
      counts,
      players: draftPlayers.map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        dobUs: p.dobUs,
        primaryPositionLabel: positionLabel(p.primaryPosition),
        secondaryPositionLabel: positionLabel(p.secondaryPosition),
        assignedTeamName: p.assignedTeamName,
      })),
    });
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("Draft roster copied.");
    } catch {
      setFeedback("Copy blocked by browser clipboard permissions.");
    }
  }

  async function copyRosterContacts() {
    const text = formatRosterContactsCopy(
      selectedTeamName,
      assignedPlayers.map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        dobUs: p.dobUs,
        primaryPositionLabel: positionLabel(p.primaryPosition),
        secondaryPositionLabel: positionLabel(p.secondaryPosition),
        assignedTeamName: p.assignedTeamName,
        guardianPhone: p.guardianPhone,
        guardianEmail: p.guardianEmail,
      }))
    );
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("Roster contact list copied.");
    } catch {
      setFeedback("Copy blocked by browser clipboard permissions.");
    }
  }

  async function copyRosterContactsTsv() {
    const text = formatRosterContactsTsv(
      selectedTeamName,
      assignedPlayers.map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        dobUs: p.dobUs,
        primaryPositionLabel: positionLabel(p.primaryPosition),
        secondaryPositionLabel: positionLabel(p.secondaryPosition),
        assignedTeamName: p.assignedTeamName,
        guardianPhone: p.guardianPhone,
        guardianEmail: p.guardianEmail,
      }))
    );
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("Roster contacts TSV copied.");
    } catch {
      setFeedback("Copy blocked by browser clipboard permissions.");
    }
  }

  function commitPlayer(playerId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("playerId", playerId);
      fd.set("teamId", selectedTeamId);
      const res = await commitDraftPlayerAction(fd);
      if (!res.ok) {
        setFeedback(res.error);
        return;
      }
      setFeedback("Player committed to team.");
      setDraftIds((prev) => {
        const next = new Set(prev);
        next.delete(playerId);
        return next;
      });
      router.refresh();
    });
  }

  function unassignPlayer(playerId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("playerId", playerId);
      const res = await unassignDraftPlayerAction(fd);
      if (!res.ok) {
        setFeedback(res.error);
        return;
      }
      setFeedback("Player unassigned.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {teamStatus ? (
        <section className="rounded border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Team status</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void copyRosterContacts()}
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Copy roster contacts
              </button>
              <button
                type="button"
                onClick={() => void copyRosterContactsTsv()}
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Copy contacts (TSV)
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-700">
            {teamStatus.teamName} · {teamStatus.coachName} · {teamStatus.locationName} · {teamStatus.ageGroup}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Needed: {teamStatus.neededPlayerCount} · Assigned: {teamStatus.assignedPlayerCount}
          </p>
        </section>
      ) : null}

      {feedback ? (
        <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{feedback}</p>
      ) : null}

      <section className="rounded border border-slate-200 bg-white p-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Available prospects ({visibleAvailable.length})
        </h2>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-2 py-2">Add to draft roster</th>
                <th className="px-2 py-2">Player</th>
                <th className="px-2 py-2">Sex</th>
                <th className="px-2 py-2">DOB</th>
                <th className="px-2 py-2">Age group</th>
                <th className="px-2 py-2">Position</th>
                <th className="px-2 py-2">Assigned team</th>
              </tr>
            </thead>
            <tbody>
              {visibleAvailable.length === 0 ? (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={7}>
                    No players match current filters.
                  </td>
                </tr>
              ) : (
                visibleAvailable.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={draftIds.has(p.id)}
                        onChange={(e) => {
                          setDraftIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(p.id);
                            else next.delete(p.id);
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="px-2 py-2">{p.lastName}, {p.firstName}</td>
                    <td className="px-2 py-2">{p.gender === "BOYS" ? "B" : "G"}</td>
                    <td className="px-2 py-2">{p.dobUs}</td>
                    <td className="px-2 py-2">{p.ageGroup}</td>
                    <td className="px-2 py-2">
                      {positionLabel(p.primaryPosition)}
                      {p.secondaryPosition ? ` / ${positionLabel(p.secondaryPosition)}` : ""}
                    </td>
                    <td className="px-2 py-2">{p.assignedTeamName ?? "Unassigned"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Draft roster ({draftPlayers.length})</h2>
          <button
            type="button"
            onClick={() => void copyDraftRoster()}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Copy draft roster
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          GK {counts.GK} · D {counts.D} · M {counts.M} · F {counts.F} · U {counts.U}
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-2 py-2">Player</th>
                <th className="px-2 py-2">Sex</th>
                <th className="px-2 py-2">DOB</th>
                <th className="px-2 py-2">Position</th>
                <th className="px-2 py-2">Secondary</th>
                <th className="px-2 py-2">Remove from draft</th>
                <th className="px-2 py-2">Commit player</th>
              </tr>
            </thead>
            <tbody>
              {draftPlayers.length === 0 ? (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={7}>
                    Add players to start a draft roster.
                  </td>
                </tr>
              ) : (
                draftPlayers.map((p) => {
                  const isLockedAssigned = p.assignedTeamId === selectedTeamId || assignedIdSet.has(p.id);
                  const assignedElsewhere = !!p.assignedTeamId && p.assignedTeamId !== selectedTeamId;
                  return (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-2 py-2">{p.lastName}, {p.firstName}</td>
                      <td className="px-2 py-2">{p.gender === "BOYS" ? "B" : "G"}</td>
                      <td className="px-2 py-2">{p.dobUs}</td>
                      <td className="px-2 py-2">{positionLabel(p.primaryPosition)}</td>
                      <td className="px-2 py-2">{positionLabel(p.secondaryPosition)}</td>
                      <td className="px-2 py-2">
                        {isLockedAssigned ? (
                          <span className="text-xs text-slate-500">Included from team roster</span>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              setDraftIds((prev) => {
                                const next = new Set(prev);
                                next.delete(p.id);
                                return next;
                              })
                            }
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {p.assignedTeamId === selectedTeamId ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => unassignPlayer(p.id)}
                            className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-900 disabled:opacity-50"
                          >
                            Unassign
                          </button>
                        ) : assignedElsewhere ? (
                          <span className="text-xs text-slate-500">Assigned elsewhere (unassign first)</span>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => commitPlayer(p.id)}
                            className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-900 disabled:opacity-50"
                          >
                            Commit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
