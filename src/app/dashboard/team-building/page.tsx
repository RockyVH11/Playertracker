import Link from "next/link";
import { Gender } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { TeamBuildingDashboard } from "@/components/dashboard/team-building-dashboard";
import { DashboardFilterForm } from "@/components/dashboard/dashboard-filter-form";
import { AgeGroupSelect } from "@/components/form/age-group-select";
import { ageGroupsBetween } from "@/lib/data/age-group-range";
import { getSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { listPlayers } from "@/lib/services/players.service";
import { listTeamDashboardRows } from "@/lib/services/dashboard.service";
import { toUsDateUtc } from "@/lib/ui/date";

const querySchema = z
  .object({
    seasonLabel: z.string().trim().regex(/^\d{4}-\d{4}$/).optional(),
    locationId: z.string().cuid().optional(),
    teamId: z.string().cuid().optional(),
    sex: z.enum(["BOYS", "GIRLS", "ALL"]).optional(),
    ageGroupMin: z.string().trim().max(16).optional(),
    ageGroupMax: z.string().trim().max(16).optional(),
    assignment: z.enum(["all", "assigned", "unassigned"]).optional(),
  })
  .strict();

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function blankToUndef(v: string | undefined): string | undefined {
  if (!v || v.trim().length === 0) return undefined;
  return v.trim();
}

export default async function TeamBuildingPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const defaultSeason = getServerEnv().DEFAULT_SEASON_LABEL;

  const parsed = querySchema.safeParse({
    seasonLabel: blankToUndef(one(sp.seasonLabel)) ?? defaultSeason,
    locationId: blankToUndef(one(sp.locationId)),
    teamId: blankToUndef(one(sp.teamId)),
    sex: blankToUndef(one(sp.sex)) ?? "ALL",
    ageGroupMin: blankToUndef(one(sp.ageGroupMin)),
    ageGroupMax: blankToUndef(one(sp.ageGroupMax)),
    assignment: blankToUndef(one(sp.assignment)) ?? "all",
  });

  const filters = parsed.success
    ? parsed.data
    : { seasonLabel: defaultSeason, sex: "ALL" as const, assignment: "all" as const };

  const [locations, teamsRaw] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.team.findMany({
      where: { seasonLabel: filters.seasonLabel ?? defaultSeason },
      orderBy: { teamName: "asc" },
      select: {
        id: true,
        teamName: true,
        ageGroup: true,
        gender: true,
        locationId: true,
        location: { select: { name: true } },
        coach: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const selectedTeam = teamsRaw.find((t) => t.id === filters.teamId) ?? null;
  const selectedLocationId = filters.locationId ?? selectedTeam?.locationId ?? "";
  const teams = selectedLocationId
    ? teamsRaw.filter((t) => t.locationId === selectedLocationId)
    : teamsRaw;
  const selectedTeamId = selectedTeam && (!selectedLocationId || selectedTeam.locationId === selectedLocationId)
    ? selectedTeam.id
    : teams[0]?.id;
  const resolvedTeam = teamsRaw.find((t) => t.id === selectedTeamId) ?? null;
  const sexExplicit = blankToUndef(one(sp.sex)) != null;
  const ageMinExplicit = blankToUndef(one(sp.ageGroupMin)) != null;
  const ageMaxExplicit = blankToUndef(one(sp.ageGroupMax)) != null;
  const effectiveSex = sexExplicit ? filters.sex : resolvedTeam?.gender ?? "ALL";
  const effectiveAgeGroupMin = ageMinExplicit ? filters.ageGroupMin : resolvedTeam?.ageGroup;
  const effectiveAgeGroupMax = ageMaxExplicit ? filters.ageGroupMax : resolvedTeam?.ageGroup;
  const effectiveAgeGroupLabels = ageGroupsBetween(effectiveAgeGroupMin, effectiveAgeGroupMax);
  const effectiveLocationId = selectedLocationId || resolvedTeam?.locationId || undefined;

  const [availablePlayers, assignedPlayers, teamStatusRows] = await Promise.all([
    listPlayers(session, {
      seasonLabel: filters.seasonLabel,
      locationId: effectiveLocationId,
      gender: effectiveSex === "ALL" ? undefined : (effectiveSex as Gender),
      effectiveAgeGroupLabelsIn: effectiveAgeGroupLabels,
      assignment:
        filters.assignment === "unassigned"
          ? "available"
          : filters.assignment === "assigned"
            ? "assigned"
            : "any",
    }),
    resolvedTeam
      ? listPlayers(session, {
          seasonLabel: filters.seasonLabel,
          assignedTeamId: resolvedTeam.id,
        })
      : Promise.resolve([]),
    resolvedTeam
      ? listTeamDashboardRows({
          seasonLabel: filters.seasonLabel,
          teamId: resolvedTeam.id,
        })
      : Promise.resolve([]),
  ]);

  const selectedLocationName =
    locations.find((l) => l.id === (effectiveLocationId ?? ""))?.name ?? "All locations";
  const selectedTeamName = resolvedTeam?.teamName ?? "No team selected";
  const teamStatus = teamStatusRows[0]
    ? {
        teamName: teamStatusRows[0].teamName,
        coachName: teamStatusRows[0].coachName,
        locationName: teamStatusRows[0].locationName,
        ageGroup: `${teamStatusRows[0].gender === "BOYS" ? "B" : "G"} ${teamStatusRows[0].ageGroup}`,
        neededPlayerCount: teamStatusRows[0].neededPlayerCount,
        assignedPlayerCount: teamStatusRows[0].assignedPlayerCount,
      }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Team Building Dashboard</h1>
        <p className="text-sm text-slate-600">
          Build a draft roster, then commit unassigned players to the selected team. You can also open a
          team&apos;s page and use <strong>Add to roster</strong> in the available pool (same outcome:
          assigned + INVITED placement).
        </p>
      </div>

      <DashboardFilterForm className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-white p-3 sm:grid-cols-12">
        <input type="hidden" name="seasonLabel" value={filters.seasonLabel ?? defaultSeason} />
        <select
          name="locationId"
          defaultValue={selectedLocationId}
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-3"
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          name="teamId"
          defaultValue={selectedTeamId ?? ""}
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-3"
        >
          <option value="">Select team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.teamName}
            </option>
          ))}
        </select>
        <select
          name="sex"
          defaultValue={sexExplicit ? filters.sex : "ALL"}
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
        >
          <option value="ALL">Sex: all</option>
          <option value="BOYS">Boys</option>
          <option value="GIRLS">Girls</option>
        </select>
        <AgeGroupSelect
          name="ageGroupMin"
          defaultValue={ageMinExplicit ? filters.ageGroupMin ?? "" : ""}
          emptyLabel={resolvedTeam ? `Min age (default ${resolvedTeam.ageGroup})` : "Min age (all)"}
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
        />
        <AgeGroupSelect
          name="ageGroupMax"
          defaultValue={ageMaxExplicit ? filters.ageGroupMax ?? "" : ""}
          emptyLabel={resolvedTeam ? `Max age (default ${resolvedTeam.ageGroup})` : "Max age (all)"}
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
        />
        <select
          name="assignment"
          defaultValue={filters.assignment}
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
        >
          <option value="all">All players</option>
          <option value="assigned">Assigned only</option>
          <option value="unassigned">Unassigned only</option>
        </select>
        <div className="sm:col-span-12 flex items-center gap-2">
          <Link
            href="/dashboard/team-building"
            className="rounded border border-slate-300 px-4 py-2 text-sm"
          >
            Reset filters
          </Link>
          <span className="text-xs text-slate-500">Filters update automatically when you select options.</span>
        </div>
      </DashboardFilterForm>

      <p className="text-sm text-slate-600">
        {effectiveAgeGroupLabels?.length ? (
          <>
            Player pool age bands:{" "}
            <span className="font-medium text-slate-800">
              {effectiveAgeGroupLabels.join(", ")}
            </span>
            {effectiveAgeGroupMin && effectiveAgeGroupMax && effectiveAgeGroupMin !== effectiveAgeGroupMax
              ? ` (from ${effectiveAgeGroupMin} through ${effectiveAgeGroupMax})`
              : null}
          </>
        ) : (
          "No age-band filter is applied for this view (all standard youth groups may appear)."
        )}
      </p>

      {resolvedTeam ? (
        <TeamBuildingDashboard
          selectedTeamId={resolvedTeam.id}
          selectedTeamName={selectedTeamName}
          selectedLocationName={selectedLocationName}
          selectedFilters={{
            locationName: selectedLocationName,
            sex: effectiveSex as "BOYS" | "GIRLS" | "ALL",
            ageGroup:
              effectiveAgeGroupMin || effectiveAgeGroupMax
                ? `${effectiveAgeGroupMin ?? "U6"}-${effectiveAgeGroupMax ?? "U19"}`
                : "All",
            assignment: filters.assignment ?? "all",
          }}
          teamStatus={teamStatus}
          availablePlayers={availablePlayers.map((p) => ({
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            gender: p.gender,
            dobUs: toUsDateUtc(p.dob),
            ageGroup: p.overrideAgeGroup ?? p.derivedAgeGroup,
            primaryPosition: p.primaryPosition,
            secondaryPosition: p.secondaryPosition,
            assignedTeamId: p.assignedTeamId,
            assignedTeamName: p.assignedTeam?.teamName ?? null,
            guardianPhone: p.contact?.guardianPhone ?? null,
            guardianEmail: p.contact?.guardianEmail ?? null,
          }))}
          assignedPlayers={assignedPlayers.map((p) => ({
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            gender: p.gender,
            dobUs: toUsDateUtc(p.dob),
            ageGroup: p.overrideAgeGroup ?? p.derivedAgeGroup,
            primaryPosition: p.primaryPosition,
            secondaryPosition: p.secondaryPosition,
            assignedTeamId: p.assignedTeamId,
            assignedTeamName: p.assignedTeam?.teamName ?? null,
            guardianPhone: p.contact?.guardianPhone ?? null,
            guardianEmail: p.contact?.guardianEmail ?? null,
          }))}
        />
      ) : (
        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-6 text-sm text-slate-600">
          Pick a team to open Team Building tools.
        </div>
      )}
    </div>
  );
}
