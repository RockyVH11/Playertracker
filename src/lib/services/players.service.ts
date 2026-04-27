import {
  type EvaluationLevel,
  type Gender,
  type PlayerStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deriveAgeGroupForDob } from "@/lib/age-group";
import { normName } from "@/lib/strings";
import type { SessionPayload } from "@/lib/auth/types";
import { isCoachSession } from "@/lib/auth/types";
import { canViewPlayerContact, canEditPlayer, canCreatePlayer } from "@/lib/rbac";

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
  input: { seasonLabel?: string } = {}
): Promise<PlayerListRow[]> {
  const { getServerEnv } = await import("@/lib/env");
  const season = input.seasonLabel ?? getServerEnv().DEFAULT_SEASON_LABEL;
  const rows = await prisma.player.findMany({
    where: { seasonLabel: season },
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
  if (input.session.role !== "SUPER_ADMIN") {
    throw new Error("Only super admin can delete a player in MVP");
  }
  await prisma.player.delete({ where: { id: input.id } });
}
