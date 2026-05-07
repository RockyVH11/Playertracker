import { z } from "zod";

export const teamBuildingCommitSchema = z
  .object({
    playerId: z.string().cuid(),
    teamId: z.string().cuid(),
  })
  .strict();

export const teamBuildingUnassignSchema = z
  .object({
    playerId: z.string().cuid(),
  })
  .strict();
