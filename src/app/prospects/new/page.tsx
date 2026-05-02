import Link from "next/link";
import { redirect } from "next/navigation";
import { ProspectType } from "@prisma/client";
import { createProspectAction } from "@/app/actions/prospects";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { getLocations } from "@/lib/data/reference";

type Props = { searchParams?: Promise<{ error?: string }> };

export default async function NewProspectPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isCoachSession(session)) {
    redirect(session.role === "SUPER_ADMIN" ? "/dashboard" : "/teams");
  }

  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? decodeURIComponent(sp.error) : null;

  const locations = await getLocations();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Add prospect</h1>
        <p className="mt-1 text-sm text-slate-600">
          Log the lead with as much contact context as you have. Submitted by defaults to the staff identity you
          chose at sign-in.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/dashboard" className="text-slate-800 underline underline-offset-2">
            Back to dashboard
          </Link>
        </p>
      </div>

      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {error}
        </p>
      ) : null}

      <form action={createProspectAction} className="grid gap-4 rounded border border-slate-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-800">Prospect type</span>
          <select name="prospectType" required className="rounded border border-slate-300 px-2 py-2">
            {Object.values(ProspectType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-800">
            Prospect name (player/coach full name, or team name)
          </span>
          <input name="prospectName" required className="rounded border border-slate-300 px-2 py-2" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700">Contact first name</span>
            <input name="contactFirstName" className="rounded border border-slate-300 px-2 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700">Contact last name</span>
            <input name="contactLastName" className="rounded border border-slate-300 px-2 py-2" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700">Contact phone</span>
            <input name="contactPhone" type="tel" className="rounded border border-slate-300 px-2 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700">Contact email</span>
            <input name="contactEmail" type="email" className="rounded border border-slate-300 px-2 py-2" />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-800">Location</span>
          <select name="primaryLocationChoice" required className="rounded border border-slate-300 px-2 py-2">
            <option value="unknown">Unknown</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-700">Notes</span>
          <textarea name="notes" rows={4} className="rounded border border-slate-300 px-2 py-2" />
        </label>
        <div>
          <button
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Save prospect
          </button>
        </div>
      </form>
    </div>
  );
}
