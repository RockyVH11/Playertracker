import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPlayerById } from "@/lib/services/players.service";
import { toUsDateUtc } from "@/lib/ui/date";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Minimal roster card: tap name → full profile (eval, status, contact, edit). */
export default async function PlayerSummaryPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const dup = String(sp.duplicate ?? "") === "1";
  const error = typeof sp.error === "string" ? sp.error : null;

  const session = await getSession();
  if (!session) redirect("/login");
  const p = await getPlayerById(session, id);
  if (!p) notFound();

  const profileHref = `/players/${id}/profile`;

  return (
    <div className="space-y-6">
      {dup && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Possible duplicate: another player in this season matches the same name, date of birth,
          and gender. Please confirm this is a new person.
        </div>
      )}
      {error && (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <Link
          href={profileHref}
          className="block text-2xl font-semibold tracking-tight text-slate-900 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 rounded-sm"
        >
          {p.lastName}, {p.firstName}
        </Link>
        <p className="text-sm text-slate-600">Season {p.seasonLabel}</p>
        <p className="text-xs text-slate-500">
          Tap name (or Full profile below) for evaluation, status, roster details, parent contact, and editing.
        </p>
      </div>
      <div className="rounded border border-slate-200 bg-white p-4 text-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-slate-500">Age group</div>
            <div className="font-medium text-slate-900">
              {p.overrideAgeGroup ?? p.derivedAgeGroup}
              {p.willingToPlayUp ? (
                <span className="ml-1 text-xs font-normal text-slate-600">· play-up</span>
              ) : null}
            </div>
            {p.overrideAgeGroup ? (
              <div className="mt-1 text-xs text-slate-500">
                Chart: {p.derivedAgeGroup} · Override applied
              </div>
            ) : null}
          </div>
          <div>
            <div className="text-xs text-slate-500">Date of birth</div>
            <div className="font-medium text-slate-900">{toUsDateUtc(p.dob)}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs text-slate-500">Team or pool</div>
            <div className="font-medium text-slate-900">
              {p.assignedTeam
                ? `${p.assignedTeam.teamName} (${p.assignedTeam.coach.lastName})`
                : "Pool (unassigned)"}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href={profileHref}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Full profile
        </Link>
        <Link className="rounded border border-slate-300 px-4 py-2 text-sm" href="/players">
          All players
        </Link>
      </div>
    </div>
  );
}
