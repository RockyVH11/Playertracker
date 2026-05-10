import { z } from "zod";
import { TeamPlayerPlacementStatus } from "@prisma/client";

export const teamRosterTeamPlayerSchema = z
  .object({
    teamId: z.string().cuid(),
    playerId: z.string().cuid(),
  })
  .strict();

export const teamPlacementIdSchema = z
  .object({
    placementId: z.string().cuid(),
  })
  .strict();

export const invitePlayerSchema = teamRosterTeamPlayerSchema.extend({
  notes: z.string().trim().max(2000).optional(),
});

/** Assign pool player to team → `assignedTeamId` + PRIMARY INVITED placement sync */
export const assignPlayerToTeamRosterSchema = teamRosterTeamPlayerSchema;

export const transitionPlacementSchema = z
  .object({
    placementId: z.string().cuid(),
    nextStatus: z.union([
      z.literal(TeamPlayerPlacementStatus.OFFERED),
      z.literal(TeamPlayerPlacementStatus.COMMITTED),
      z.literal(TeamPlayerPlacementStatus.NOT_INTERESTED),
    ]),
  })
  .strict();

export const requestSecondarySchema = z
  .object({
    playerId: z.string().cuid(),
    requestingTeamId: z.string().cuid(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export const requestGuestSchema = requestSecondarySchema;

export const approvePlacementIdSchema = z
  .object({
    placementId: z.string().cuid(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();
