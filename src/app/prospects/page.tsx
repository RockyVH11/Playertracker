import { redirect } from "next/navigation";
import { ProspectStatus, ProspectType, StaffRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { canAccessProspectDashboard, canDeleteProspect } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { listProspectsForDashboard } from "@/lib/services/prospects.service";
import { ProspectDashboard } from "@/components/prospects/prospect-dashboard";

type Sp = Record<string, string | string[] | undefined>;

function parseEnum<E extends Record<string, string>>(raw: unknown, enumObj: E): E[keyof E] | undefined {
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  return Object.values(enumObj).includes(raw as E[keyof E]) ? (raw as E[keyof E]) : undefined;
}

export default async function ProspectsBoardPage(props: {
  searchParams: Promise<Sp>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  let viewerStaffRole: StaffRole | null = null;
  let primaryLocationId: string | null | undefined;

  if (session.role === "SUPER_ADMIN") {
    viewerStaffRole = null;
  } else if (isCoachSession(session)) {
    const row = await prisma.coach.findFirst({
      where: { id: session.coachId },
      select: { staffRole: true, primaryLocationId: true, isActive: true },
    });
    if (!row?.isActive) redirect("/teams");
    viewerStaffRole = row.staffRole;
    primaryLocationId = row.primaryLocationId;
  } else {
    redirect("/teams");
  }

  if (!canAccessProspectDashboard(session, viewerStaffRole)) {
    redirect("/dashboard");
  }

  const sp = await props.searchParams;
  function one(key: string): string | undefined {
    const v = sp[key];
    if (Array.isArray(v)) return v[0];
    return v;
  }

  const locRaw = one("loc");
  const isDirector = viewerStaffRole === StaffRole.DIRECTOR;

  if (isDirector && locRaw === undefined && primaryLocationId) {
    redirect(`/prospects?loc=${encodeURIComponent(primaryLocationId)}`);
  }

  const prospectType = parseEnum(one("prospectType"), ProspectType);
  const status = parseEnum(one("status"), ProspectStatus);
  const assignedToCoachIdRaw = one("assignedToCoachId");
  const submittedByCoachId = one("submittedByCoachId");

  const where: Prisma.ProspectWhereInput = {};

  if (prospectType) where.prospectType = prospectType;
  if (status) where.status = status;
  const cuid = z.string().cuid();
  if (assignedToCoachIdRaw === "unassigned") {
    where.assignedToCoachId = null;
  } else if (assignedToCoachIdRaw && cuid.safeParse(assignedToCoachIdRaw).success) {
    where.assignedToCoachId = assignedToCoachIdRaw;
  }
  if (submittedByCoachId && cuid.safeParse(submittedByCoachId).success) {
    where.submittedByCoachId = submittedByCoachId;
  }

  const resolvedLoc = typeof locRaw === "string" && locRaw.length > 0 ? locRaw : "all";

  if (resolvedLoc !== "all") {
    if (resolvedLoc === "unknown") where.locationUnknown = true;
    else where.locationId = resolvedLoc;
  }

  const [
    prospects,
    assigneeOptions,
    locations,
  ] = await Promise.all([
    listProspectsForDashboard(where),
    prisma.coach.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const errorRaw = one("error");
  const error = errorRaw ? decodeURIComponent(errorRaw) : null;

  const filters = {
    loc: resolvedLoc,
    prospectType,
    status,
    assignedToCoachId: assignedToCoachIdRaw ?? undefined,
    submittedByCoachId,
  };

  return (
    <ProspectDashboard
      prospects={prospects}
      assigneeOptions={assigneeOptions}
      locations={locations}
      filters={filters}
      error={error}
      showDelete={canDeleteProspect(session, viewerStaffRole)}
    />
  );
}
