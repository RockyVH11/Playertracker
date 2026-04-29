import { prisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";
import { Gender } from "@prisma/client";
import {
  deleteAgeRuleAction,
  populateStandardAgeChartAction,
  rollAgeChartToNextSeasonAction,
  upsertAgeRuleAction,
} from "@/app/actions/admin-age-rules";
import { nextSeasonLabel } from "@/lib/age-chart-standard";
import { toYmdUtc } from "@/lib/ui/date";

type Props = {
  searchParams?: Promise<{ error?: string; season?: string }>;
};

export default async function AdminAgeChartPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? sp.error : null;
  const env = getServerEnv();
  const season =
    typeof sp.season === "string" && /^\d{4}-\d{4}$/.test(sp.season)
      ? sp.season
      : env.DEFAULT_SEASON_LABEL;

  const rules = await prisma.ageGroupRule.findMany({
    where: { seasonLabel: season },
    orderBy: [{ gender: "asc" }, { sortOrder: "asc" }, { ageGroup: "asc" }],
  });

  let nextSeason: string;
  try {
    nextSeason = nextSeasonLabel(season);
  } catch {
    nextSeason = season;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Age chart ({season})</h2>
      <p className="text-sm text-slate-600">
        Defines DOB ranges per gender used to derive age group labels from date of birth. For the standard chart, the{" "}
        <strong>first year</strong> in the season label (e.g. <strong>2026</strong> in 2026-2027) anchors every band:
        U6 is Aug 1 of that year minus six through Jul 31 of the following year (Aug 1, 2020 – Jul 31, 2021). Each
        playing year aligns to <strong>Aug 1–Jul 31</strong>.
      </p>
      <p className="text-sm text-slate-600">
        <strong>Standard club chart:</strong> U6 through U17 use one-year DOB bands; U19 is a single two-year band
        (Aug 1 three years older through Jul 31 one year younger than a one-year cohort—no U18 row). Apply it for this
        season or roll forward to prefill the next season’s chart.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <form action={populateStandardAgeChartAction}>
          <input type="hidden" name="seasonLabel" value={season} />
          <button
            type="submit"
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Apply standard chart (U6–U17, U19)
          </button>
        </form>
        <form action={rollAgeChartToNextSeasonAction}>
          <input type="hidden" name="fromSeason" value={season} />
          <button
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Roll to next season ({nextSeason})
          </button>
        </form>
      </div>
      <p className="text-sm text-slate-600">
        Manual row below still works for one-off edits. Use ISO dates (YYYY-MM-DD).
      </p>
      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {decodeURIComponent(error)}
        </p>
      ) : null}

      <form
        action={upsertAgeRuleAction}
        className="grid max-w-3xl grid-cols-1 gap-3 rounded border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <label className="flex flex-col gap-1 text-sm lg:col-span-2">
          <span className="text-slate-600">Season</span>
          <input
            name="seasonLabel"
            defaultValue={season}
            className="rounded border border-slate-300 px-2 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Gender</span>
          <select name="gender" className="rounded border border-slate-300 px-2 py-2">
            <option value={Gender.BOYS}>{Gender.BOYS}</option>
            <option value={Gender.GIRLS}>{Gender.GIRLS}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm lg:col-span-2">
          <span className="text-slate-600">Age group label (e.g. U15)</span>
          <input name="ageGroup" required className="rounded border border-slate-300 px-2 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Sort order</span>
          <input
            name="sortOrder"
            type="number"
            defaultValue={10}
            className="rounded border border-slate-300 px-2 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm lg:col-span-3">
          <span className="text-slate-600">DOB range start</span>
          <input
            name="dobStart"
            type="date"
            required
            className="rounded border border-slate-300 px-2 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm lg:col-span-3">
          <span className="text-slate-600">DOB range end</span>
          <input type="date" name="dobEnd" required className="rounded border border-slate-300 px-2 py-2" />
        </label>
        <div className="flex items-end lg:col-span-6">
          <button
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add or update rule
          </button>
        </div>
      </form>

      <table className="w-full border-collapse border border-slate-200 bg-white text-left text-sm">
        <thead>
          <tr className="border-b bg-slate-50">
            <th className="border-b px-2 py-2">Gender</th>
            <th className="border-b px-2 py-2">Group</th>
            <th className="border-b px-2 py-2">DOB start</th>
            <th className="border-b px-2 py-2">DOB end</th>
            <th className="border-b px-2 py-2 text-right">Order</th>
            <th className="border-b px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id}>
              <td className="border-b border-slate-100 px-2 py-2">{r.gender}</td>
              <td className="border-b border-slate-100 px-2 py-2">{r.ageGroup}</td>
              <td className="border-b border-slate-100 px-2 py-2 font-mono text-xs">{toYmdUtc(r.dobStart)}</td>
              <td className="border-b border-slate-100 px-2 py-2 font-mono text-xs">{toYmdUtc(r.dobEnd)}</td>
              <td className="border-b border-slate-100 px-2 py-2 text-right">{r.sortOrder}</td>
              <td className="border-b border-slate-100 px-2 py-2">
                <form action={deleteAgeRuleAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="returnSeason" value={season} />
                  <button
                    type="submit"
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form method="get" className="flex items-center gap-2 text-sm">
        <label>
          Jump season{" "}
          <input name="season" placeholder="YYYY-YYYY" className="rounded border px-2 py-1" />
        </label>
        <button type="submit" className="rounded border border-slate-300 px-3 py-1">
          Apply
        </button>
      </form>
    </div>
  );
}
