import { PrismaClient, Gender, Role } from "@prisma/client";

const prisma = new PrismaClient();

const SEASON = process.env.DEFAULT_SEASON_LABEL ?? "2026-2027";

async function main() {
  const locations = await Promise.all([
    prisma.location.upsert({
      where: { name: "Midland" },
      update: {},
      create: { name: "Midland" },
    }),
    prisma.location.upsert({
      where: { name: "Odessa" },
      update: {},
      create: { name: "Odessa" },
    }),
    prisma.location.upsert({
      where: { name: "Lubbock" },
      update: {},
      create: { name: "Lubbock" },
    }),
  ]);

  const leagueNames = [
    "ECNL-RL-NTX",
    "ECNL-RL-Frontier",
    "N1 Frontier D1",
    "N1 Frontier D2",
    "N1 NTX D1",
    "N1 NTX D2",
    "Pre ECNL",
    "Other",
  ];
  const leagues = await Promise.all(
    leagueNames.map((name) =>
      prisma.league.upsert({
        where: { name },
        update: {},
        create: { name, allowedGender: name.includes("Frontier") ? Gender.BOYS : null },
      })
    )
  );

  const coach1 = await prisma.coach.upsert({
    where: { id: "seed_coach_1" },
    update: {},
    create: {
      id: "seed_coach_1",
      firstName: "Alex",
      lastName: "Sample",
      email: "alex.sample@example.com",
    },
  });
  const coach2 = await prisma.coach.upsert({
    where: { id: "seed_coach_2" },
    update: {},
    create: {
      id: "seed_coach_2",
      firstName: "Jamie",
      lastName: "Sample",
    },
  });

  // Age chart: wide band so most DOBs map to "U15" for seed/testing
  await prisma.ageGroupRule.upsert({
    where: {
      seasonLabel_gender_ageGroup: {
        seasonLabel: SEASON,
        gender: Gender.GIRLS,
        ageGroup: "U15",
      },
    },
    update: {},
    create: {
      seasonLabel: SEASON,
      gender: Gender.GIRLS,
      ageGroup: "U15",
      dobStart: new Date("2008-01-01"),
      dobEnd: new Date("2011-12-31"),
      sortOrder: 10,
    },
  });
  await prisma.ageGroupRule.upsert({
    where: {
      seasonLabel_gender_ageGroup: {
        seasonLabel: SEASON,
        gender: Gender.BOYS,
        ageGroup: "U15",
      },
    },
    update: {},
    create: {
      seasonLabel: SEASON,
      gender: Gender.BOYS,
      ageGroup: "U15",
      dobStart: new Date("2008-01-01"),
      dobEnd: new Date("2011-12-31"),
      sortOrder: 10,
    },
  });

  const loc = locations[0]!;
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
