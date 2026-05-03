import type { Prisma } from "@prisma/client";
import {
  type EvaluationLevel,
  type Gender,
  type PlacementPriority,
  type PlayerPosition,
  type PlayerSource,
  type PlayerStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deriveAgeGroupForDob } from "@/lib/age-group";
import { normName } from "@/lib/strings";
import type { SessionPayload } from "@/lib/auth/types";
import { isCoachSession } from "@/lib/auth/types";
import {
  canViewPlayerContact,
  canEditPlayer,
  canCreatePlayer,
  canDeletePlayer,
} from "@/lib/rbac";

const playerListSelect = {
  id: true,
  seasonLabel: true,
  firstName: true,
  lastName: true,
  dob: true,
  gender: true,
  derivedAgeGroup: true,
  overrideAgeGroup: true,
  locationId: true,
  location: { select: { id: true, name: true } },
  assignedTeamId: true,
  leagueInterestId: true,
  leagueInterest: { select: { id: true, name: true } },
  playerStatus: true,
  primaryPosition: true,
  secondaryPosition: true,
  playerSource: true,
  placementPriority: true,
  willingToPlayUp: true,
  evaluationLevel: true,
  evaluationNotes: true,
  evaluationUpdatedAt: true,
  evaluationAuthorCoach: {
    select: { firstName: true, lastName: true, id: true },
  },
  createdByCoachId: true,
  createdByCoach: { select: { id: true, firstName: true, lastName: true } },
  assignedTeam: {
    select: {
      id: true,
      teamName: true,
      coachId: true,
      coach: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} as const;

export type PlayerListRow = {
  id: string;
  seasonLabel: string;
  firstName: string;
  lastName: string;
  dob: Date;
  gender: Gender;
  derivedAgeGroup: string;
  overrideAgeGroup: string | null;
  locationId: string;
  location: { id: string; name: string };
  assignedTeamId: string | null;
  leagueInterestId: string | null;
  leagueInterest: { id: string; name: string } | null;
  playerStatus: PlayerStatus;
  primaryPosition: PlayerPosition;
  secondaryPosition: PlayerPosition | null;
  playerSource: PlayerSource;
  placementPriority: PlacementPriority;
  willingToPlayUp: boolean;
  evaluationLevel: EvaluationLevel;
  evaluationNotes: string | null;
  evaluationUpdatedAt: Date | null;
  evaluationAuthorCoach: { id: string; firstName: string; lastName: string } | null;
  contact: {
    guardianName: string | null;
    guardianPhone: string | null;
    guardianEmail: string | null;
  } | null;
  createdByCoach: { id: string; firstName: string; lastName: string } | null;
  assignedTeam: {
    id: string;
    teamName: string;
    coachId: string;
    coach: { id: string; firstName: string; lastName: string };
  } | null;
};

type RowCore = Awaited<
  ReturnType<typeof prisma.player.findMany<{
    select: typeof playerListSelect;
  }>>
>[0];

function mapRow(
  session: SessionPayload,
  row: RowCore,
  contact: {
    guardianName: string | null;
    guardianPhone: string | null;
    guardianEmail: string | null;
  } | null
): PlayerListRow {
  const showContact = canViewPlayerContact(session, {
    createdByCoachId: row.createdByCoachId,
    assignedTeam: row.assignedTeam
      ? { coachId: row.assignedTeam.coachId }
      : null,
  });
  return {
    id: row.id,
    seasonLabel: row.seasonLabel,
    firstName: row.firstName,
    lastName: row.lastName,
    dob: row.dob,
    gender: row.gender,
    derivedAgeGroup: row.derivedAgeGroup,
    overrideAgeGroup: row.overrideAgeGroup,
    locationId: row.locationId,
    location: row.location,
    assignedTeamId: row.assignedTeamId,
    leagueInterestId: row.leagueInterestId,
    leagueInterest: row.leagueInterest,
    playerStatus: row.playerStatus,
    primaryPosition: row.primaryPosition,
    secondaryPosition: row.secondaryPosition,
    playerSource: row.playerSource,
    placementPriority: row.placementPriority,
    willingToPlayUp: row.willingToPlayUp,
    evaluationLevel: row.evaluationLevel,
    evaluationNotes: row.evaluationNotes,
    evaluationUpdatedAt: row.evaluationUpdatedAt,
    evaluationAuthorCoach: row.evaluationAuthorCoach,
    contact: showContact && contact ? contact : null,
    createdByCoach: row.createdByCoach,
    assignedTeam: row.assignedTeam,
  };
}

export async function findPossibleDuplicates(input: {
  seasonLabel: string;
  firstName: string;
  lastName: string;
  dob: Date;
  gender: Gender;
}): Promise<{ id: string; firstName: string; lastName: string }[]> {
  const f = normName(input.firstName);
  const l = normName(input.lastName);
  if (!f || !l) return [];
  return await prisma.player.findMany({
    where: {
      seasonLabel: input.seasonLabel,
      gender: input.gender,
      dob: input.dob,
      firstName: { equals: f, mode: "insensitive" },
      lastName: { equals: l, mode: "insensitive" },
    },
    select: { id: true, firstName: true, lastName: true },
    take: 8,
  });
}

export async function listPlayers(
  session: SessionPayload,
  input: {
    seasonLabel?: string;
    q?: string;
    gender?: Gender;
    /** Single cohort (legacy filter). Ignored when `effectiveAgeGroupLabelsIn` is set (non‑empty). */
    ageGroup?: string;
    /** Standard labels (from age range picker); player matches if effective cohort is any of these. */
    effectiveAgeGroupLabelsIn?: readonly string[];
    locationId?: string;
    leagueInterestId?: string;
    evaluationLevel?: EvaluationLevel;
    assignedTeamId?: string;
    assignment?: "any" | "available" | "assigned";
    playerStatus?: PlayerStatus;
    primaryPosition?: PlayerPosition;
    dobMin?: Date;
    dobMax?: Date;
  } = {}
): Promise<PlayerListRow[]> {
  const { getServerEnv } = await import("@/lib/env");
  const season = input.seasonLabel ?? getServerEnv().DEFAULT_SEASON_LABEL;
  /** Pinning `assignedTeamId` must win over generic `assignment: assigned` ({ not: null }) or the team id is lost when both are provided. */
  const assignmentWhere: Prisma.PlayerWhereInput = input.assignedTeamId
    ? { assignedTeamId: input.assignedTeamId }
    : input.assignment === "available"
      ? { assignedTeamId: null }
      : input.assignment === "assigned"
        ? { assignedTeamId: { not: null } }
        : {};
  const labels = input.effectiveAgeGroupLabelsIn;
  const emptyRange =
    labels != null && labels.length === 0;
  if (emptyRange) {
    return [];
  }

  let ageGroupWhere: Prisma.PlayerWhereInput = {};

  if (labels != null && labels.length > 0) {
    ageGroupWhere = {
      OR: labels.flatMap((label) => [
        { overrideAgeGroup: label },
        {
          AND: [{ overrideAgeGroup: null }, { derivedAgeGroup: label }],
        },
      ]),
    };
  } else if (input.ageGroup) {
    ageGroupWhere = {
      OR: [
        { overrideAgeGroup: input.ageGroup },
        {
          AND: [
            { overrideAgeGroup: null },
            { derivedAgeGroup: input.ageGroup },
          ],
        },
      ],
    };
  }

  const dobWhere: Prisma.PlayerWhereInput =
    input.dobMin != null || input.dobMax != null
      ? {
          dob: {
            ...(input.dobMin != null ? { gte: input.dobMin } : {}),
            ...(input.dobMax != null ? { lte: input.dobMax } : {}),
          },
        }
      : {};
  const q = input.q?.trim();
  const rows = await prisma.player.findMany({
    where: {
      seasonLabel: season,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(input.gender ? { gender: input.gender } : {}),
      ...ageGroupWhere,
      ...dobWhere,
      ...(input.locationId ? { locationId: input.locationId } : {}),
      ...(input.leagueInterestId
        ? { leagueInterestId: input.leagueInterestId }
        : {}),
      ...(input.evaluationLevel
        ? { evaluationLevel: input.evaluationLevel }
        : {}),
      ...assignmentWhere,
      ...(input.playerStatus ? { playerStatus: input.playerStatus } : {}),
      ...(input.primaryPosition
        ? { primaryPosition: input.primaryPosition }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: playerListSelect,
  });
  const ids: string[] = [];
  for (const r of rows) {
    if (
      canViewPlayerContact(session, {
        createdByCoachId: r.createdByCoachId,
        assignedTeam: r.assignedTeam
          ? { coachId: r.assignedTeam.coachId }
          : null,
      })
    ) {
      ids.push(r.id);
    }
  }
  const contacts = await prisma.playerContact.findMany({
    where: { playerId: { in: ids } },
  });
  const byId = new Map(
    contacts.map((c) => [c.playerId, c] as const)
  );
  return rows.map((r) => {
    const c = byId.get(r.id);
    return mapRow(
      session,
      r,
      c
        ? {
            guardianName: c.guardianName,
            guardianPhone: c.guardianPhone,
            guardianEmail: c.guardianEmail,
          }
        : null
    );
  });
}

export async function getPlayerById(
  session: SessionPayload,
  id: string
): Promise<PlayerListRow | null> {
  const row = await prisma.player.findFirst({
    where: { id },
    select: playerListSelect,
  });
  if (!row) return null;
  const allowContact = canViewPlayerContact(session, {
    createdByCoachId: row.createdByCoachId,
    assignedTeam: row.assignedTeam
      ? { coachId: row.assignedTeam.coachId }
      : null,
  });
  const contact = allowContact
    ? await prisma.playerContact.findUnique({ where: { playerId: id } })
    : null;
  return mapRow(
    session,
    row,
    contact
      ? {
          guardianName: contact.guardianName,
          guardianPhone: contact.guardianPhone,
          guardianEmail: contact.guardianEmail,
        }
      : null
  );
}

export async function createPlayer(input: {
  session: SessionPayload;
  data: {
    seasonLabel: string;
    firstName: string;
    lastName: string;
    dob: Date;
    gender: Gender;
    locationId: string;
    assignedTeamId: string | null;
    leagueInterestId: string | null;
    playerStatus: PlayerStatus;
    primaryPosition: PlayerPosition;
    secondaryPosition: PlayerPosition | null;
    playerSource: PlayerSource;
    placementPriority: PlacementPriority;
    willingToPlayUp: boolean;
    overrideAgeGroup: string | null;
    evaluationLevel: EvaluationLevel;
    evaluationNotes: string | null;
    contact: {
      guardianName: string | null;
      guardianPhone: string | null;
      guardianEmail: string | null;
    } | null;
  };
}): Promise<{ id: string; duplicateWarning: boolean }> {
  if (!canCreatePlayer(input.session)) {
    throw new Error("Not allowed to create player");
  }
  const createdByCoachId = isCoachSession(input.session)
    ? input.session.coachId
    : null;
  if (input.session.role === "COACH" && !createdByCoachId) {
    throw new Error("Invalid coach session");
  }
  const derivedAgeGroup = await deriveAgeGroupForDob({
    seasonLabel: input.data.seasonLabel,
    gender: input.data.gender,
    dob: input.data.dob,
  });
  const dupes = await findPossibleDuplicates({
    seasonLabel: input.data.seasonLabel,
    firstName: input.data.firstName,
    lastName: input.data.lastName,
    dob: input.data.dob,
    gender: input.data.gender,
  });
  const evCoachId = isCoachSession(input.session)
    ? input.session.coachId
    : null;
  const created = await prisma.player.create({
    data: {
      seasonLabel: input.data.seasonLabel,
      firstName: input.data.firstName.trim(),
      lastName: input.data.lastName.trim(),
      dob: input.data.dob,
      gender: input.data.gender,
      derivedAgeGroup,
      overrideAgeGroup: input.data.overrideAgeGroup,
      locationId: input.data.locationId,
      assignedTeamId: input.data.assignedTeamId,
      leagueInterestId: input.data.leagueInterestId,
      playerStatus: input.data.playerStatus,
      primaryPosition: input.data.primaryPosition,
      secondaryPosition: input.data.secondaryPosition,
      playerSource: input.data.playerSource,
      placementPriority: input.data.placementPriority,
      willingToPlayUp: input.data.willingToPlayUp,
      evaluationLevel: input.data.evaluationLevel,
      evaluationNotes: input.data.evaluationNotes,
      evaluationAuthorCoachId: evCoachId,
      evaluationUpdatedAt: new Date(),
      createdByCoachId: createdByCoachId ?? null,
    },
  });
  if (input.data.contact) {
    await prisma.playerContact.create({
      data: {
        playerId: created.id,
        guardianName: input.data.contact.guardianName,
        guardianPhone: input.data.contact.guardianPhone,
        guardianEmail: input.data.contact.guardianEmail,
      },
    });
  }
  return {
    id: created.id,
    duplicateWarning: dupes.length > 0,
  };
}

export async function updatePlayer(input: {
  session: SessionPayload;
  id: string;
  data: {
    firstName: string;
    lastName: string;
    dob: Date;
    gender: Gender;
    seasonLabel: string;
    locationId: string;
    assignedTeamId: string | null;
    leagueInterestId: string | null;
    playerStatus: PlayerStatus;
    primaryPosition: PlayerPosition;
    secondaryPosition: PlayerPosition | null;
    playerSource: PlayerSource;
    placementPriority: PlacementPriority;
    willingToPlayUp: boolean;
    overrideAgeGroup: string | null;
    evaluationLevel: EvaluationLevel;
    evaluationNotes: string | null;
    contact: {
      guardianName: string | null;
      guardianPhone: string | null;
      guardianEmail: string | null;
    } | null;
  };
}): Promise<void> {
  const existing = await prisma.player.findFirst({
    where: { id: input.id },
    include: { assignedTeam: { select: { coachId: true } } },
  });
  if (!existing) {
    throw new Error("Player not found");
  }
  if (!canEditPlayer(input.session, { ...existing, assignedTeam: existing.assignedTeam })) {
    throw new Error("Not allowed to edit this player");
  }
  if (!canViewPlayerContact(input.session, {
    createdByCoachId: existing.createdByCoachId,
    assignedTeam: existing.assignedTeam,
  })) {
    if (input.data.contact != null) {
      throw new Error("Cannot change contact for this player");
    }
  }
  const derivedAgeGroup = await deriveAgeGroupForDob({
    seasonLabel: input.data.seasonLabel,
    gender: input.data.gender,
    dob: input.data.dob,
  });
  await prisma.player.update({
    where: { id: input.id },
    data: {
      firstName: input.data.firstName.trim(),
      lastName: input.data.lastName.trim(),
      dob: input.data.dob,
      gender: input.data.gender,
      seasonLabel: input.data.seasonLabel,
      derivedAgeGroup,
      overrideAgeGroup: input.data.overrideAgeGroup,
      locationId: input.data.locationId,
      assignedTeamId: input.data.assignedTeamId,
      leagueInterestId: input.data.leagueInterestId,
      playerStatus: input.data.playerStatus,
      primaryPosition: input.data.primaryPosition,
      secondaryPosition: input.data.secondaryPosition,
      playerSource: input.data.playerSource,
      placementPriority: input.data.placementPriority,
      willingToPlayUp: input.data.willingToPlayUp,
      evaluationLevel: input.data.evaluationLevel,
      evaluationNotes: input.data.evaluationNotes,
      evaluationUpdatedAt: new Date(),
      ...(isCoachSession(input.session)
        ? { evaluationAuthorCoachId: input.session.coachId }
        : {}),
    },
  });
  if (
    canViewPlayerContact(input.session, {
      createdByCoachId: existing.createdByCoachId,
      assignedTeam: existing.assignedTeam,
    })
  ) {
    if (input.data.contact) {
      await prisma.playerContact.upsert({
        where: { playerId: input.id },
        create: {
          playerId: input.id,
          guardianName: input.data.contact.guardianName,
          guardianPhone: input.data.contact.guardianPhone,
          guardianEmail: input.data.contact.guardianEmail,
        },
        update: {
          guardianName: input.data.contact.guardianName,
          guardianPhone: input.data.contact.guardianPhone,
          guardianEmail: input.data.contact.guardianEmail,
        },
      });
    }
  }
}

export async function deletePlayer(input: {
  session: SessionPayload;
  id: string;
}): Promise<void> {
  const existing = await prisma.player.findUnique({
    where: { id: input.id },
    select: {
      assignedTeamId: true,
      createdByCoachId: true,
      assignedTeam: {
        select: { coachId: true },
      },
    },
  });
  if (!existing) {
    throw new Error("Player not found");
  }
  const playerForAcl = {
    createdByCoachId: existing.createdByCoachId,
    assignedTeam: existing.assignedTeam ?? null,
  };
  if (!canDeletePlayer(input.session, playerForAcl)) {
    throw new Error("Not allowed to delete this player");
  }
  await prisma.player.delete({ where: { id: input.id } });
}
