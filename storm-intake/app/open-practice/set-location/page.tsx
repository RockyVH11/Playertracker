import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OpenPracticeSetLocationPage() {
  const locations = await prisma.location.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <img src="/storm-logo.png" alt="Storm FC" className="h-12 w-auto" />
        <div>
          <h1 className="text-xl font-semibold">Set Location</h1>
          <p className="text-sm text-slate-600">Choose the practice location for this intake session.</p>
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm text-slate-700">Select one location to start intake:</p>
        <div className="flex flex-col gap-2">
          {locations.map((location) => (
            <Link
              key={location.id}
              href={`/open-practice/new?locationId=${encodeURIComponent(location.id)}`}
              className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              {location.name}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <Link href="/" className="text-sm text-slate-600 underline">
          Back to home
        </Link>
      </div>
    </main>
  );
}
