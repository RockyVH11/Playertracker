import Link from "next/link";
import { DayOfWeek } from "@prisma/client";
import { createFieldRequestAction } from "@/app/actions/field-requests";
import { DAY_OF_WEEK_ORDER, dayOfWeekLabel } from "@/lib/fields/day-of-week-order";
import { prisma } from "@/lib/prisma";
import { canAccessFieldRequestsBoard } from "@/lib/rbac-fields";
import { requireFieldRequestSubmitter } from "@/lib/server/field-requests-access";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ error?: string; submitted?: string }> };

export default async function NewFieldRequestPage({ searchParams }: Props) {
  const v = await requireFieldRequestSubmitter();
  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? decodeURIComponent(sp.error) : null;
  const submitted = sp.submitted === "1";

  const teams = await prisma.team.findMany({
    where: { coachId: v.session.coachId },
    orderBy: { teamName: "asc" },
    select: { id: true, teamName: true, seasonLabel: true, locationId: true },
  });

  const locationIds = [...new Set(teams.map((t) => t.locationId))];
  const fields =
    locationIds.length === 0
      ? []
      : await prisma.field.findMany({
          where: {
            isActive: true,
            complex: { isActive: true, locationId: { in: locationIds } },
          },
          select: {
            id: true,
            name: true,
            complex: { select: { name: true, locationId: true } },
          },
          orderBy: [{ complex: { name: "asc" } }, { name: "asc" }],
        });

  const showBoardLink = canAccessFieldRequestsBoard(v.session, v.viewerStaffRole);

  if (teams.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-6 sm:px-6">
        <h1 className="text-xl font-semibold text-slate-900">Request field time</h1>
        <p className="text-sm text-slate-600">
          You need at least one team assigned to you before requesting field time.
        </p>
        <Link href="/teams" className="text-sm text-slate-900 underline">
          Go to teams
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Request field time</h1>
        {showBoardLink ? (
          <Link
            href="/fields/requests"
            className="text-sm text-slate-700 underline underline-offset-2"
          >
            Open requests board
          </Link>
        ) : null}
      </div>

      {submitted ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          Request submitted. A director will review it.
        </p>
      ) : null}
      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {error}
        </p>
      ) : null}

      <p className="text-sm text-slate-600">
        Describe when you want to train. Directors match requests to the schedule; assigning a
        specific field on the calendar comes in a later release.
      </p>

      <form
        action={createFieldRequestAction}
        className="space-y-4 rounded border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700" htmlFor="teamId">
            Team
          </label>
          <select
            id="teamId"
            name="teamId"
            required
            className="rounded border border-slate-300 px-2 py-2 text-sm"
            defaultValue={teams[0]?.id}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.teamName} ({t.seasonLabel})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700" htmlFor="preferredDayOfWeek">
            Preferred day
          </label>
          <select
            id="preferredDayOfWeek"
            name="preferredDayOfWeek"
            required
            className="rounded border border-slate-300 px-2 py-2 text-sm"
            defaultValue={DayOfWeek.MON}
          >
            {DAY_OF_WEEK_ORDER.map((d) => (
              <option key={d} value={d}>
                {dayOfWeekLabel(d)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex min-w-[120px] flex-col gap-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="preferredStartTime">
              Start time (24h)
            </label>
            <input
              id="preferredStartTime"
              name="preferredStartTime"
              type="text"
              required
              placeholder="18:00"
              defaultValue="18:00"
              className="rounded border border-slate-300 px-2 py-2 font-mono text-sm"
            />
          </div>
          <div className="flex min-w-[120px] flex-col gap-1">
            <label
              className="text-xs font-medium text-slate-700"
              htmlFor="preferredSessionLengthMinutes"
            >
              Session length (min)
            </label>
            <select
              id="preferredSessionLengthMinutes"
              name="preferredSessionLengthMinutes"
              className="rounded border border-slate-300 px-2 py-2 text-sm"
              defaultValue={90}
            >
              {[45, 60, 75, 90, 105, 120, 135, 150, 180].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700" htmlFor="preferredFieldId">
            Preferred field (optional)
          </label>
          <select
            id="preferredFieldId"
            name="preferredFieldId"
            className="rounded border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="">No preference</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.complex.name} — {f.name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input type="checkbox" name="recurrenceRequested" />
          Request recurring through an end date
        </label>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700" htmlFor="recurrenceEndDate">
            Recurrence end date
          </label>
          <input
            id="recurrenceEndDate"
            name="recurrenceEndDate"
            type="date"
            className="max-w-[200px] rounded border border-slate-300 px-2 py-2 text-sm"
          />
          <span className="text-xs text-slate-500">Required if recurrence is checked.</span>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-slate-700">
            Also duplicate on these weekdays (optional)
          </legend>
          <div className="flex flex-wrap gap-3">
            {DAY_OF_WEEK_ORDER.map((d) => (
              <label key={d} className="flex items-center gap-1.5 text-sm text-slate-800">
                <input type="checkbox" name="duplicateToOtherDays" value={d} />
                {dayOfWeekLabel(d)}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700" htmlFor="notes">
            Notes for director
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="rounded border border-slate-300 px-2 py-2 text-sm"
            placeholder="Share goals, sharing with another team, etc."
          />
        </div>

        <button
          type="submit"
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Submit request
        </button>
      </form>
    </div>
  );
}
