import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { IntakePlayerForm } from "./intake-player-form";
export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ error?: string; saved?: string; updated?: string; locationId?: string }>;
};

export default async function OpenPracticeNewPage({ searchParams }: Props) {
  const env = getEnv();
  const sp = (await searchParams) ?? {};
  const error = sp.error ? decodeURIComponent(sp.error) : null;
  const saved = sp.saved === "1";
  const updated = sp.updated === "1";
  const selectedLocationId = sp.locationId ? String(sp.locationId) : "";

  const [locations, leagues] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.league.findMany({ orderBy: [{ hierarchy: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  const hasSelectedLocation = selectedLocationId.length > 0 && locations.some((l) => l.id === selectedLocationId);

  if (!hasSelectedLocation) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
        <img src="/storm-logo.png" alt="Storm FC" className="h-20 w-auto" />
        <h1 className="text-2xl font-semibold">Select intake location</h1>
        <p className="text-sm text-slate-600">Set location first, then intake defaults to that location.</p>
        <Link href="/open-practice/set-location" className="rounded bg-slate-900 px-4 py-2 text-white">Set location</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <img src="/storm-logo.png" alt="Storm FC" className="h-12 w-auto" />
        <div>
          <h1 className="text-xl font-semibold">Open Practice - New Player</h1>
          <p className="text-sm text-slate-600">Enter player details for open session intake.</p>
        </div>
      </div>

      {error ? <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p> : null}

      {saved ? (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">
            {updated ? "Player profile updated. Add another?" : "Player saved. Add another?"}
          </p>
          <div className="mt-3 flex gap-3">
            <Link href={`/open-practice/new?locationId=${encodeURIComponent(selectedLocationId)}`} className="rounded bg-slate-900 px-4 py-2 text-sm text-white">Yes</Link>
            <Link href="/open-practice/done" className="rounded border border-slate-300 px-4 py-2 text-sm">No</Link>
          </div>
        </div>
      ) : null}

      <IntakePlayerForm
        seasonLabel={env.DEFAULT_SEASON_LABEL}
        selectedLocationId={selectedLocationId}
        locations={locations}
        leagues={leagues}
      />
    </main>
  );
}
