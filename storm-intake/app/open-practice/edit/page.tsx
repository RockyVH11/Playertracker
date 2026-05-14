import Link from "next/link";
import { Gender } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { verifyIntakeEditToken } from "@/lib/intake-edit-token";
import { formatDobAsMmDdYyUtc } from "@/lib/intake-dob-display";
import { IntakePlayerEditForm } from "./intake-player-edit-form";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ t?: string; locationId?: string; error?: string }>;
};

export default async function OpenPracticeEditPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const token = sp.t ? String(sp.t) : "";
  const selectedLocationId = sp.locationId ? String(sp.locationId) : "";
  const error = sp.error ? decodeURIComponent(sp.error) : null;

  const verified = token ? verifyIntakeEditToken(token) : null;
  if (!verified) {
    return (
      <main className="mx-auto max-w-xl space-y-4 p-6">
        <p className="text-sm text-amber-900">This edit link is missing, invalid, or has expired.</p>
        <Link href="/open-practice/set-location" className="text-sm text-slate-800 underline">
          Start intake again
        </Link>
      </main>
    );
  }

  const env = getEnv();
  const [player, locations, leagues] = await Promise.all([
    prisma.player.findFirst({
      where: { id: verified.playerId },
      include: {
        contact: true,
      },
    }),
    prisma.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.league.findMany({ orderBy: [{ hierarchy: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);

  if (!player) {
    return (
      <main className="mx-auto max-w-xl space-y-4 p-6">
        <p className="text-sm text-amber-900">Player not found.</p>
        <Link href="/open-practice/set-location" className="text-sm underline">
          Start intake again
        </Link>
      </main>
    );
  }

  const hasLocation = selectedLocationId.length > 0 && locations.some((l) => l.id === selectedLocationId);
  const poolLocationId = hasLocation ? selectedLocationId : player.locationId;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <img src="/storm-logo.png" alt="Storm FC" className="h-12 w-auto" />
        <div>
          <h1 className="text-xl font-semibold">Open Practice — Update player</h1>
          <p className="text-sm text-slate-600">
            You matched an existing record for this season. Update details below, then save.
          </p>
        </div>
      </div>

      {error ? <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p> : null}

      <IntakePlayerEditForm
        intakeEditToken={token}
        seasonLabel={env.DEFAULT_SEASON_LABEL}
        selectedLocationId={poolLocationId}
        locations={locations}
        leagues={leagues}
        initial={{
          firstName: player.firstName,
          lastName: player.lastName,
          dobMmDdYy: formatDobAsMmDdYyUtc(player.dob),
          gender: player.gender as Gender,
          locationId: player.locationId,
          leagueInterestId: player.leagueInterestId,
          primaryPosition: player.primaryPosition,
          secondaryPosition: player.secondaryPosition,
          guardianName: player.contact?.guardianName ?? "",
          guardianPhone: player.contact?.guardianPhone ?? "",
          guardianEmail: player.contact?.guardianEmail ?? "",
        }}
      />

      <p className="text-xs text-slate-500">
        <Link className="underline" href={`/open-practice/new?locationId=${encodeURIComponent(poolLocationId)}`}>
          Cancel and return to new player intake
        </Link>
      </p>
    </main>
  );
}
