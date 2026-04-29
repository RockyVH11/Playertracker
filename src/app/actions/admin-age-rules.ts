"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth/session";
import { ageRuleDeleteSchema, ageRuleUpsertSchema } from "@/lib/validation/admin";
import {
  buildStandardAgeGroupRuleRows,
  nextSeasonLabel,
  parseSeasonStartYear,
} from "@/lib/age-chart-standard";

const ADMIN_AGE_CHART = "/admin/age-chart";

function seasonChartPath(seasonLabel: string): string {
  return `${ADMIN_AGE_CHART}?season=${encodeURIComponent(seasonLabel)}`;
}

function err(path: string, msg: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}error=${encodeURIComponent(msg)}`;
}

function isSeasonLabel(s: string): boolean {
  return /^\d{4}-\d{4}$/.test(s.trim());
}

function parseIsoDate(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(t)
    ? new Date(`${t}T12:00:00Z`)
    : new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function upsertAgeRuleAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");
  const raw = {
    seasonLabel: String(formData.get("seasonLabel") ?? ""),
    gender: String(formData.get("gender") ?? ""),
    ageGroup: String(formData.get("ageGroup") ?? ""),
    dobStart: String(formData.get("dobStart") ?? ""),
    dobEnd: String(formData.get("dobEnd") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "10"),
  };
  const parsed = ageRuleUpsertSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(err(ADMIN_AGE_CHART, "Invalid age rule form."));
  }
  const p = parsed.data;
  const dobStart = parseIsoDate(p.dobStart);
  const dobEnd = parseIsoDate(p.dobEnd);
  if (!dobStart || !dobEnd) {
    redirect(
      err(
        isSeasonLabel(p.seasonLabel) ? seasonChartPath(p.seasonLabel.trim()) : ADMIN_AGE_CHART,
        "Use ISO dates (YYYY-MM-DD) for DOB range."
      )
    );
  }
  try {
    const row = await prisma.ageGroupRule.upsert({
      where: {
        seasonLabel_gender_ageGroup: {
          seasonLabel: p.seasonLabel,
          gender: p.gender,
          ageGroup: p.ageGroup,
        },
      },
      update: { dobStart, dobEnd, sortOrder: p.sortOrder, isActive: true },
      create: {
        seasonLabel: p.seasonLabel,
        gender: p.gender,
        ageGroup: p.ageGroup,
        dobStart,
        dobEnd,
        sortOrder: p.sortOrder,
        isActive: true,
      },
    });
    await auditLog(session, "AgeGroupRule", row.id, "upsert", {
      ageGroup: p.ageGroup,
      seasonLabel: p.seasonLabel,
    });
  } catch {
    redirect(err(ADMIN_AGE_CHART, "Could not save age rule."));
  }
  revalidatePath(ADMIN_AGE_CHART);
  revalidatePath("/players");
  redirect(seasonChartPath(p.seasonLabel));
}

export async function deleteAgeRuleAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");
  const parsed = ageRuleDeleteSchema.safeParse({
    id: String(formData.get("id") ?? ""),
  });
  if (!parsed.success) redirect(err(ADMIN_AGE_CHART, "Invalid rule id."));
  const returnSeason = String(formData.get("returnSeason") ?? "");
  const back = returnSeason.trim() ? seasonChartPath(returnSeason.trim()) : ADMIN_AGE_CHART;
  try {
    await prisma.ageGroupRule.delete({ where: { id: parsed.data.id } });
    await auditLog(session, "AgeGroupRule", parsed.data.id, "delete", {});
  } catch {
    redirect(err(back, "Could not delete rule."));
  }
  revalidatePath(ADMIN_AGE_CHART);
  revalidatePath("/players");
  redirect(back);
}

async function bulkUpsertStandardChart(seasonLabel: string) {
  const rows = buildStandardAgeGroupRuleRows(seasonLabel);
  await prisma.$transaction(
    rows.map((r) =>
      prisma.ageGroupRule.upsert({
        where: {
          seasonLabel_gender_ageGroup: {
            seasonLabel: r.seasonLabel,
            gender: r.gender,
            ageGroup: r.ageGroup,
          },
        },
        update: {
          dobStart: r.dobStart,
          dobEnd: r.dobEnd,
          sortOrder: r.sortOrder,
          isActive: true,
        },
        create: {
          seasonLabel: r.seasonLabel,
          gender: r.gender,
          ageGroup: r.ageGroup,
          dobStart: r.dobStart,
          dobEnd: r.dobEnd,
          sortOrder: r.sortOrder,
          isActive: true,
        },
      })
    )
  );
}

/** Club USYS-style Aug 1 – Jul 31 cohorts for U6–U17 and U19 (two-year U19 only). */
export async function populateStandardAgeChartAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");
  const seasonLabel = String(formData.get("seasonLabel") ?? "").trim();
  if (!isSeasonLabel(seasonLabel)) {
    redirect(err(ADMIN_AGE_CHART, "Invalid season label (use YYYY-YYYY)."));
  }
  try {
    parseSeasonStartYear(seasonLabel);
    await bulkUpsertStandardChart(seasonLabel);
    await auditLog(session, "AgeGroupRule", seasonLabel, "bulkPopulate", {
      seasonLabel,
      rules: buildStandardAgeGroupRuleRows(seasonLabel).length,
    });
  } catch {
    redirect(err(seasonChartPath(seasonLabel), "Could not apply standard age chart."));
  }
  revalidatePath(ADMIN_AGE_CHART);
  revalidatePath("/players");
  redirect(seasonChartPath(seasonLabel));
}

/** Creates/updates the next season’s chart (e.g. 2026-2027 → 2027-2028) and opens that season. */
export async function rollAgeChartToNextSeasonAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");
  const fromSeason = String(formData.get("fromSeason") ?? "").trim();
  if (!isSeasonLabel(fromSeason)) {
    redirect(err(ADMIN_AGE_CHART, "Invalid season label (use YYYY-YYYY)."));
  }
  let next: string;
  try {
    next = nextSeasonLabel(fromSeason);
  } catch {
    redirect(err(seasonChartPath(fromSeason), "Could not compute next season."));
  }
  try {
    await bulkUpsertStandardChart(next);
    await auditLog(session, "AgeGroupRule", next, "rollChart", {
      fromSeason,
      toSeason: next,
      rules: buildStandardAgeGroupRuleRows(next).length,
    });
  } catch {
    redirect(err(seasonChartPath(fromSeason), "Could not roll age chart to next season."));
  }
  revalidatePath(ADMIN_AGE_CHART);
  revalidatePath("/players");
  redirect(seasonChartPath(next));
}
