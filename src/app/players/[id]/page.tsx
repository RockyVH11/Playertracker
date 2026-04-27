import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPlayerById } from "@/lib/services/players.service";
import { canEditPlayer } from "@/lib/rbac";
import { getLeagues, getLocations, getTeamsForSelect } from "@/lib/data/reference";
import { updatePlayerAction, deletePlayerAction } from "@/app/actions/players";
import { toYmdUtc } from "@/lib/ui/date";
import { formatEval } from "@/lib/ui/formatters";
import { EvaluationLevel, Gender, PlayerStatus } from "@prisma/client";

const evalOrder: EvaluationLevel[] = [
  "RL_FOR_SURE",
  "BORDERLINE_RL",
  "N1",
  "N2",
  "OTHER",
];

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PlayerDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const dup = String(sp.duplicate ?? "") === "1";
  const session = await getSession();
  if (!session) redirect("/login");
  const p = await getPlayerById(session, id);
  if (!p) notFound();
  const canEdit = canEditPlayer(session, {
    createdByCoachId: p.createdByCoach?.id ?? null,
    assignedTeam: p.assignedTeam
      ? { coachId: p.assignedTeam.coachId }
      : null,
  });
  const showContact = p.contact != null;
  const [locations, leagues, teams] = await Promise.all([
    getLocations(),
    getLeagues(),
    getTeamsForSelect(p.seasonLabel),
  ]);
  return (
    <div className="space-y-6">
      {dup && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Possible duplicate: another player in this season matches the same
          name, date of birth, and gender. Please confirm this is a new person.
        </div>
      )}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {p.lastName}, {p.firstName}
        </h1>
        <p className="text-sm text-slate-600">Season {p.seasonLabel}</p>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <div className="text-xs text-slate-500">Location</div>
          <div>{p.location.name}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Date of birth</div>
          <div>{toYmdUtc(p.dob)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Age group (derived / override)</div>
          <div>
            {p.derivedAgeGroup}
            {p.overrideAgeGroup
              ? ` → override: ${p.overrideAgeGroup}`
              : ""}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Pipeline</div>
          <div>{p.playerStatus}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">League interest</div>
          <div>{p.leagueInterest?.name ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Assigned team</div>
          <div>
            {p.assignedTeam
              ? `${p.assignedTeam.teamName} (${p.assignedTeam.coach.lastName})`
              : "— (pool / unassigned)"}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Willing to play up</div>
          <div>{p.willingToPlayUp ? "Yes" : "No"}</div>
        </div>
      </div>
      <div className="rounded border border-slate-200 bg-white p-3 text-sm">
        <div className="text-xs text-slate-500">Latest evaluation</div>
        <p className="mt-1 font-medium">{formatEval(p.evaluationLevel)}</p>
        {p.evaluationNotes && <p className="mt-2 whitespace-pre-wrap">{p.evaluationNotes}</p>}
        <p className="mt-2 text-xs text-slate-500">
          {p.evaluationAuthorCoach
            ? `By ${p.evaluationAuthorCoach.lastName}, ${p.evaluationAuthorCoach.firstName}`
            : "—"}
          {p.evaluationUpdatedAt
            ? ` · ${p.evaluationUpdatedAt.toISOString().slice(0, 10)}`
            : ""}
        </p>
      </div>
      {showContact && p.contact && (
        <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="text-xs font-medium text-slate-600">Parent / guardian</div>
          <div className="mt-1 space-y-1">
            <div>{p.contact.guardianName || "—"}</div>
            <div>{p.contact.guardianPhone || "—"}</div>
            <div>{p.contact.guardianEmail || "—"}</div>
          </div>
        </div>
      )}
      {!showContact && (
        <p className="text-sm text-slate-600">
          Parent contact is hidden. Reach out to the player&apos;s listed coach for
          outreach.
        </p>
      )}
      {canEdit && (
        <form
          action={updatePlayerAction}
          className="max-w-2xl space-y-3 rounded border border-slate-200 bg-white p-4"
        >
          <h2 className="text-sm font-medium text-slate-900">Edit</h2>
          <input name="id" type="hidden" value={p.id} />
          <input name="seasonLabel" type="hidden" value={p.seasonLabel} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>First</span>
              <input
                className="w-full rounded border border-slate-300 px-2 py-2"
                defaultValue={p.firstName}
                name="firstName"
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Last</span>
              <input
                className="w-full rounded border border-slate-300 px-2 py-2"
                defaultValue={p.lastName}
                name="lastName"
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>DOB</span>
              <input
                className="w-full rounded border border-slate-300 px-2 py-2"
                defaultValue={toYmdUtc(p.dob)}
                name="dob"
                required
                type="date"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Gender</span>
              <select
                className="w-full rounded border border-slate-300 px-2 py-2"
                defaultValue={p.gender}
                name="gender"
                required
              >
                {Object.values(Gender).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>Location</span>
              <select
                className="w-full rounded border border-slate-300 px-2 py-2"
                defaultValue={p.locationId}
                name="locationId"
                required
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Team</span>
              <select
                className="w-full rounded border border-slate-300 px-2 py-2"
                defaultValue={p.assignedTeamId ?? ""}
                name="assignedTeamId"
              >
                <option value="">— (pool)</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.teamName} · {t.ageGroup} · {t.gender}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>League interest</span>
              <select
                className="w-full rounded border border-slate-300 px-2 py-2"
                defaultValue={p.leagueInterestId ?? ""}
                name="leagueInterestId"
              >
                <option value="">—</option>
                {leagues.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Status</span>
              <select
                className="w-full rounded border border-slate-300 px-2 py-2"
                defaultValue={p.playerStatus}
                name="playerStatus"
                required
              >
                {Object.values(PlayerStatus).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input defaultChecked={p.willingToPlayUp} name="willingToPlayUp" type="checkbox" />
            Willing to play up
          </label>
          <label className="block space-y-1 text-sm">
            <span>Override age group</span>
            <input
              className="w-full rounded border border-slate-300 px-2 py-2"
              defaultValue={p.overrideAgeGroup ?? ""}
              name="overrideAgeGroup"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>Evaluation</span>
              <select
                className="w-full rounded border border-slate-300 px-2 py-2"
                defaultValue={p.evaluationLevel}
                name="evaluationLevel"
                required
              >
                {evalOrder.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span>Notes</span>
            <textarea
              className="w-full rounded border border-slate-300 px-2 py-2"
              defaultValue={p.evaluationNotes ?? ""}
              name="evaluationNotes"
              rows={3}
            />
          </label>
          {showContact && (
            <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-medium">Parent / guardian (visibility applies)</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span>Name</span>
                  <input
                    className="w-full rounded border border-slate-300 px-2 py-2"
                    defaultValue={p.contact?.guardianName ?? ""}
                    name="guardianName"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Phone</span>
                  <input
                    className="w-full rounded border border-slate-300 px-2 py-2"
                    defaultValue={p.contact?.guardianPhone ?? ""}
                    name="guardianPhone"
                  />
                </label>
                <label className="block space-y-1 text-sm sm:col-span-2">
                  <span>Email</span>
                  <input
                    className="w-full rounded border border-slate-300 px-2 py-2"
                    defaultValue={p.contact?.guardianEmail ?? ""}
                    name="guardianEmail"
                    type="email"
                  />
                </label>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white" type="submit">
              Save
            </button>
            <Link className="text-sm" href="/players">
              Back
            </Link>
          </div>
        </form>
      )}
      {session.role === "SUPER_ADMIN" && (
        <form action={deletePlayerAction} className="pt-1">
          <input name="id" type="hidden" value={p.id} />
          <button
            className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            type="submit"
          >
            Delete player
          </button>
        </form>
      )}
    </div>
  );
}
