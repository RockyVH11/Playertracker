import { ProspectStatus, type Prisma } from "@prisma/client";
import type { ProspectCreateInput } from "@/lib/validation/prospects";
import { prisma } from "@/lib/prisma";

const prospectInclude = {
  location: { select: { id: true, name: true } },
  assignedToCoach: {
    select: { id: true, firstName: true, lastName: true },
  },
  submittedByCoach: {
    select: { id: true, firstName: true, lastName: true },
  },
} as const;

export type ProspectListRow = Prisma.ProspectGetPayload<{
  include: typeof prospectInclude;
}>;

export async function resolveProspectLocation(
  primaryLocationChoice: ProspectCreateInput["primaryLocationChoice"]
) {
  if (primaryLocationChoice === "unknown") {
    return { locationId: null as string | null, locationUnknown: true };
  }
  return { locationId: primaryLocationChoice, locationUnknown: false };
}

/** Status timestamps and assignment helper fields for creates/updates. */
export function deriveStatusTimestampPatch(
  previous: ProspectStatus | undefined,
  next: ProspectStatus
): Partial<Pick<Prisma.ProspectUpdateInput, "convertedAt" | "closedAt">> {
  const now = new Date();
  const patch: Partial<Pick<Prisma.ProspectUpdateInput, "convertedAt" | "closedAt">> = {};

  if (next === ProspectStatus.CONVERTED && previous !== ProspectStatus.CONVERTED) {
    patch.convertedAt = now;
  }
  if (next === ProspectStatus.CLOSED && previous !== ProspectStatus.CLOSED) {
    patch.closedAt = now;
  }
  return patch;
}

export async function createProspectRecord(opts: {
  data: ProspectCreateInput;
  submittedByCoachId: string;
}) {
  const loc = await resolveProspectLocation(opts.data.primaryLocationChoice);
  return prisma.prospect.create({
    data: {
      prospectType: opts.data.prospectType,
      prospectName: opts.data.prospectName,
      contactFirstName: opts.data.contactFirstName?.trim()
        ? opts.data.contactFirstName.trim()
        : null,
      contactLastName: opts.data.contactLastName?.trim()
        ? opts.data.contactLastName.trim()
        : null,
      contactPhone: opts.data.contactPhone?.trim() ? opts.data.contactPhone.trim() : null,
      contactEmail: opts.data.contactEmail?.trim()
        ? opts.data.contactEmail.trim()
        : null,
      notes: opts.data.notes?.trim() ? opts.data.notes.trim() : null,
      submittedByCoachId: opts.submittedByCoachId,
      locationId: loc.locationId,
      locationUnknown: loc.locationUnknown,
    },
    include: prospectInclude,
  });
}

export type ProspectDashboardFilters = {
  locationId?: string;
  prospectType?: import("@prisma/client").ProspectType;
  status?: ProspectStatus;
  assignedToCoachId?: string;
  submittedByCoachId?: string;
};

export async function listProspectsForDashboard(where: Prisma.ProspectWhereInput) {
  return prisma.prospect.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: prospectInclude,
  });
}

export async function listProspectsAssignedToCoach(coachId: string) {
  return prisma.prospect.findMany({
    where: { assignedToCoachId: coachId },
    orderBy: [{ updatedAt: "desc" }],
    include: prospectInclude,
  });
}
