import { parse } from "csv-parse/sync";
import fs from "node:fs/promises";
import path from "node:path";
import {
  EvaluationLevel,
  Gender,
  PlacementPriority,
  PlayerPosition,
  PlayerSource,
  PrismaClient,
  Role,
} from "@prisma/client";
import {
  LEAGUE_RENAMES_FROM_TO,
  ORDERED_LEAGUES,
} from "../src/lib/data/leagues-seed";
import { buildStandardAgeGroupRuleRows } from "../src/lib/age-chart-standard";
import { inferStaffRoleFromLabel } from "../src/lib/staff/infer-staff-role-from-label";
import { displayStaffRole } from "../src/lib/staff/staff-role-label";

const prisma = new PrismaClient();

const SEASON = process.env.DEFAULT_SEASON_LABEL ?? "2026-2027";

async function main() {
  const defaultLocationNames = ["Midland", "Odessa", "Lubbock"];
  const locationMap = new Map<string, string>();
  for (const name of defaultLocationNames) {
    const row = await prisma.location.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    locationMap.set(name.toLowerCase(), row.id);
  }

  for (const [fromName, toName] of LEAGUE_RENAMES_FROM_TO) {
    const oldRow = await prisma.league.findUnique({ where: { name: fromName } });
    const targetExists = await prisma.league.findUnique({ where: { name: toName } });
    if (oldRow && !targetExists) {
      await prisma.league.update({
        where: { id: oldRow.id },
        data: { name: toName },
      });
    }
  }

  const leagues = [];
  for (const row of ORDERED_LEAGUES) {
    const allowedGender = row.allowedGender !== undefined ? row.allowedGender : null;

    const league = await prisma.league.upsert({
      where: { name: row.name },
      update: {
        hierarchy: row.hierarchy,
        allowedGender,
      },
      create: {
        name: row.name,
        hierarchy: row.hierarchy,
        allowedGender,
      },
    });
    leagues.push(league);
  }

  const staffRows = await loadStaffCsvRows();
  if (staffRows.length > 0) {
    for (const row of staffRows) {
      let first = String(row.firstName ?? row.first_name ?? row.FirstName ?? "").trim();
      let last = String(row.lastName ?? row.last_name ?? row.LastName ?? "").trim();
      const staffNameFull =
        normalizeNullable(csvPick(row, "staff name", "Staff Name")) ??
        normalizeNullable(row["Staff Name"]) ??
        normalizeNullable(row.staff_name);
      if (staffNameFull) {
        const split = splitPersonName(staffNameFull);
        first = split.firstName;
        last = split.lastName;
      }
      if (!first && !last) continue;

      const email = normalizeNullable(row.email ?? row.Email);
      const phone = normalizeNullable(row.phone ?? row.Phone);
      const staffRoleLabel = normalizeNullable(
        csvPick(row, "role", "Role") ??
          row.Role ??
          row.role
      );
      const area =
        normalizeNullable(
          csvPick(row, "primary area", "Primary Area", "primaryarea")
        ) ??
        normalizeNullable(
          row["Primary Area"] ??
            row.primaryArea ??
            row.primary_area ??
            row.PrimaryArea ??
            row.location ??
            row.Location
        );
      const status = normalizeNullable(csvPick(row, "status", "Status") ?? row["Status"]);
      const isActive = staffCsvStatusIsActive(status);
      const staffRole = inferStaffRoleFromLabel(staffRoleLabel);
      const roleLabelForPicker =
        (staffRoleLabel && staffRoleLabel.trim()) || displayStaffRole(staffRole);

      let primaryLocationId: string | null = null;
      if (area) {
        let locId = locationMap.get(area.toLowerCase());
        if (!locId) {
          const loc = await prisma.location.upsert({
            where: { name: area },
            update: {},
            create: { name: area },
          });
          locId = loc.id;
          locationMap.set(area.toLowerCase(), loc.id);
        }
        primaryLocationId = locId;
      }
      if (email) {
        await prisma.coach.upsert({
          where: { email },
          update: {
            firstName: first || "Unknown",
            lastName: last || "Unknown",
            phone,
            staffRole,
            staffRoleLabel: roleLabelForPicker,
            primaryAreaLabel: area,
            primaryLocationId,
            isActive,
          },
          create: {
            firstName: first || "Unknown",
            lastName: last || "Unknown",
            email,
            phone,
            staffRole,
            staffRoleLabel: roleLabelForPicker,
            primaryAreaLabel: area,
            primaryLocationId,
            isActive,
          },
        });
      } else {
        const existing = await prisma.coach.findFirst({
          where: { firstName: first || "Unknown", lastName: last || "Unknown" },
        });
        if (existing) {
          await prisma.coach.update({
            where: { id: existing.id },
            data: {
              phone,
              staffRole,
              staffRoleLabel: roleLabelForPicker,
              primaryAreaLabel: area,
              primaryLocationId,
              isActive,
            },
          });
        } else {
          await prisma.coach.create({
            data: {
              firstName: first || "Unknown",
              lastName: last || "Unknown",
              email: null,
              phone,
              staffRole,
              staffRoleLabel: roleLabelForPicker,
              primaryAreaLabel: area,
              primaryLocationId,
              isActive,
            },
          });
        }
      }
    }
  }

  const coach1 = await ensureCoach("Alex", "Sample", "alex.sample@example.com");
  const coach2 = await ensureCoach("Jamie", "Sample", null);

  const leagueRows = await loadCsvRowsIfExists(path.join(process.cwd(), "data", "leagues.csv"));
  if (leagueRows.length > 0) {
    for (const row of leagueRows) {
      const name = String(row.name ?? row.league ?? row.pathway ?? "").trim();
      if (!name) continue;
      await prisma.league.upsert({
        where: { name },
        update: {
          conference: normalizeNullable(row.conference),
          ageGroup: normalizeNullable(row.ageGroup ?? row.age_group),
          hierarchy: toNullableInt(row.hierarchy),
          capacity: toNullableInt(row.capacity),
          format: normalizeNullable(row.format),
          notes: normalizeNullable(row.notes),
          allowedGender: parseGender(row.gender),
        },
        create: {
          name,
          conference: normalizeNullable(row.conference),
          ageGroup: normalizeNullable(row.ageGroup ?? row.age_group),
          hierarchy: toNullableInt(row.hierarchy),
          capacity: toNullableInt(row.capacity),
          format: normalizeNullable(row.format),
          notes: normalizeNullable(row.notes),
          allowedGender: parseGender(row.gender),
        },
      });
    }
  }

  const standardAgeRows = buildStandardAgeGroupRuleRows(SEASON);
  await prisma.$transaction(
    standardAgeRows.map((r) =>
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

  const loc = await prisma.location.findFirstOrThrow({
    where: { name: "Midland" },
  });
  const league = leagues[0]!;

  await prisma.team.upsert({
    where: { id: "seed_team_1" },
    update: {},
    create: {
      id: "seed_team_1",
      seasonLabel: SEASON,
      teamName: `${SEASON} G U15 — ${loc.name}`,
      locationId: loc.id,
      gender: Gender.GIRLS,
      ageGroup: "U15",
      coachId: coach1.id,
      leagueId: league.id,
      openSession: true,
      committedPlayerCount: 0,
      coachEstimatedPlayerCount: 0,
      returningPlayerCount: 8,
      neededPlayerCount: 6,
      neededGoalkeepers: 1,
      neededDefenders: 2,
      neededMidfielders: 2,
      neededForwards: 1,
      neededUtility: 0,
      recruitingNeeds: "Need 2 more defenders and depth at goalkeeper.",
    },
  });

  await prisma.team.upsert({
    where: { id: "seed_team_2" },
    update: {},
    create: {
      id: "seed_team_2",
      seasonLabel: SEASON,
      teamName: `${SEASON} B U15 — ${loc.name}`,
      locationId: loc.id,
      gender: Gender.BOYS,
      ageGroup: "U15",
      coachId: coach2.id,
      leagueId: league.id,
      openSession: true,
      committedPlayerCount: 0,
      coachEstimatedPlayerCount: 0,
      returningPlayerCount: 9,
      neededPlayerCount: 5,
      neededGoalkeepers: 1,
      neededDefenders: 1,
      neededMidfielders: 2,
      neededForwards: 1,
      neededUtility: 0,
    },
  });

  await prisma.user.upsert({
    where: { id: "seed_user_system" },
    update: {},
    create: {
      id: "seed_user_system",
      displayName: "System",
      role: Role.SUPER_ADMIN,
    },
  });

  // Keep one sample player aligned to new enums/fields.
  await prisma.player.upsert({
    where: { id: "seed_player_1" },
    update: {},
    create: {
      id: "seed_player_1",
      seasonLabel: SEASON,
      firstName: "Taylor",
      lastName: "Example",
      dob: new Date("2010-05-12"),
      gender: Gender.GIRLS,
      derivedAgeGroup: "U15",
      locationId: loc.id,
      assignedTeamId: "seed_team_1",
      playerStatus: "AVAILABLE",
      primaryPosition: PlayerPosition.MIDFIELDER,
      secondaryPosition: PlayerPosition.FORWARD,
      playerSource: PlayerSource.COACH_ENTERED,
      placementPriority: PlacementPriority.MEDIUM,
      willingToPlayUp: true,
      evaluationLevel: EvaluationLevel.RL,
      evaluationNotes: "Strong technical profile and work rate.",
      evaluationAuthorCoachId: coach1.id,
      evaluationUpdatedAt: new Date(),
      createdByCoachId: coach1.id,
      importedFromInterestForm: false,
    },
  });
}

async function ensureCoach(firstName: string, lastName: string, email: string | null) {
  const existing = email
    ? await prisma.coach.findFirst({ where: { email } })
    : await prisma.coach.findFirst({ where: { firstName, lastName } });
  if (existing) return existing;
  return await prisma.coach.create({
    data: {
      firstName,
      lastName,
      email,
    },
  });
}

/** Tries `data/staff.csv` then `data/Staff.csv`; fixes blank CSV header cells so columns do not overwrite each other. */
async function loadStaffCsvRows(): Promise<Record<string, string>[]> {
  const paths = [
    path.join(process.cwd(), "data", "staff.csv"),
    path.join(process.cwd(), "data", "Staff.csv"),
  ];
  for (const filePath of paths) {
    try {
      const text = await fs.readFile(filePath, "utf8");
      return parse(text, {
        columns: (header: string[]) =>
          header.map((h, i) => String(h ?? "").trim() || `_col_${i}`),
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];
    } catch {
      /* try next path */
    }
  }
  return [];
}

/** Match CSV columns when header spelling/case varies (e.g. `staff name` vs `Staff Name`). */
function csvPick(row: Record<string, string>, ...labelVariants: string[]): string | undefined {
  const normalize = (s: string) =>
    s.trim().toLowerCase().replace(/\s+/g, "");
  const wanted = new Set(labelVariants.map(normalize));
  for (const [rawKey, rawVal] of Object.entries(row)) {
    if (wanted.has(normalize(rawKey))) {
      return String(rawVal ?? "").trim();
    }
  }
  return undefined;
}

function splitPersonName(full: string): { firstName: string; lastName: string } {
  const t = full.replace(/\s+/g, " ").trim();
  if (!t) return { firstName: "", lastName: "" };
  const space = t.indexOf(" ");
  if (space === -1) return { firstName: t, lastName: "Unknown" };
  const firstName = t.slice(0, space).trim();
  const lastName = t.slice(space + 1).trim();
  return { firstName, lastName: lastName || "Unknown" };
}

/** Treats empty / missing status as active; marks Open (and similar) inactive. */
function staffCsvStatusIsActive(status: string | null): boolean {
  if (!status) return true;
  const s = status.toLowerCase();
  if (s === "open" || s === "inactive") return false;
  return true;
}

async function loadCsvRowsIfExists(filePath: string): Promise<Record<string, string>[]> {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return parse(text, {
      columns: (header: string[]) =>
        header.map((h, i) => String(h ?? "").trim() || `_col_${i}`),
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];
  } catch {
    return [];
  }
}

function normalizeNullable(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

function toNullableInt(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseGender(v: unknown): Gender | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith("boy")) return Gender.BOYS;
  if (s.startsWith("girl")) return Gender.GIRLS;
  return null;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
