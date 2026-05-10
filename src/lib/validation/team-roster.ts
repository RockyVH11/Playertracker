import { z } from "zod";
import { EvaluationLevel } from "@prisma/client";

const rosterCoachNotesField = z
  .preprocess((v) => (v == null ? "" : String(v)), z.string())
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .max(500, "Coach notes must be at most 500 characters.")
      .transform((t) => (t === "" ? null : t))
  );

/** String literals keep this module free of Prisma init in Vitest workers. */
const transitionNextPlacementStatuses = ["OFFERED", "COMMITTED", "NOT_INTERESTED"] as const;

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

const poolPlacementRoleEnum = z.enum(["primary", "secondary", "guest"]);

/** Assign from pool: primary assigns team + placement sync; secondary/guest add INVITED row only (no assignment). */
export const assignPlayerToTeamRosterSchema = teamRosterTeamPlayerSchema
  .extend({
    poolPlacementRole: z.preprocess(
      (v) => (v === "" || v == null ? "primary" : v),
      poolPlacementRoleEnum
    ),
  })
  .strict();

export const returnPrimaryInviteToPoolSchema = z
  .object({
    placementId: z.string().cuid(),
    teamId: z.string().cuid(),
  })
  .strict();

const blankToUndefined = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

/** Add assistant — omit or empty `coachId` means no-op. */
export const addTeamAssistantCoachSchema = z
  .object({
    teamId: z.string().cuid(),
    coachId: z.preprocess(blankToUndefined, z.string().cuid().optional()),
  })
  .strict();

/** Remove one assistant membership — omit or empty `teamCoachId` means no-op. */
export const removeTeamAssistantCoachSchema = z
  .object({
    teamId: z.string().cuid(),
    teamCoachId: z.preprocess(blankToUndefined, z.string().cuid().optional()),
  })
  .strict();

export const transitionPlacementSchema = z
  .object({
    placementId: z.string().cuid(),
    nextStatus: z.enum(transitionNextPlacementStatuses),
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

export const saveTeamRosterPlayerNotesEvalSchema = z
  .object({
    teamId: z.string().cuid(),
    playerId: z.string().cuid(),
    coachNotes: rosterCoachNotesField,
    evaluationLevel: z.nativeEnum(EvaluationLevel),
    evaluationNotes: z
      .preprocess((v) => (v == null ? "" : String(v)), z.string())
      .transform((s) => s.trim())
      .pipe(z.string().transform((t) => (t === "" ? null : t))),
  })
  .strict();
