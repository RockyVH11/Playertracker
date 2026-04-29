import {
  createCoachAction,
  setCoachActiveAction,
} from "@/app/actions/admin-coaches";
import { formatCoachPickerLabel } from "@/lib/ui/formatters";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminCoachesPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? sp.error : null;
  const coaches = await prisma.coach.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { primaryLocation: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Coaches (login identities)
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Active coaches appear in coach login picker (name — role — area). Reload staff
          CSV with{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">npm run db:seed</code>{" "}
          to sync from{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            data/staff.csv
          </code>
          .
        </p>
      </div>
      <div className="rounded border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Add coach manually</h3>
        <form action={createCoachAction} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <label className="flex flex-col gap-1 text-sm lg:col-span-3">
            <span className="text-slate-600">First name</span>
            <input
              name="firstName"
              required
              autoComplete="given-name"
              className="rounded border border-slate-300 px-2 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm lg:col-span-3">
            <span className="text-slate-600">Last name</span>
            <input
              name="lastName"
              required
              autoComplete="family-name"
              className="rounded border border-slate-300 px-2 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm lg:col-span-4">
            <span className="text-slate-600">Staff role</span>
            <input
              name="staffRoleLabel"
              placeholder="e.g. Coach, Director"
              className="rounded border border-slate-300 px-2 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm lg:col-span-5">
            <span className="text-slate-600">Primary area</span>
            <input
              name="primaryAreaLabel"
              required
              placeholder="Creates / links Location by this name"
              className="rounded border border-slate-300 px-2 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm lg:col-span-4">
            <span className="text-slate-600">Email (optional, unique login key)</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              className="rounded border border-slate-300 px-2 py-2"
              placeholder="Leave blank if not used"
            />
          </label>
          <div className="flex items-end lg:col-span-12">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add coach
            </button>
          </div>
        </form>
      </div>
      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {decodeURIComponent(error)}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-[48rem] border-collapse border border-slate-200 bg-white text-left text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="border-b px-2 py-2">Login label</th>
              <th className="border-b px-2 py-2">Email</th>
              <th className="border-b px-2 py-2">Primary area</th>
              <th className="border-b px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {coaches.map((c) => (
              <tr key={c.id}>
                <td className="border-b border-slate-100 px-2 py-2">
                  {formatCoachPickerLabel(c)}
                </td>
                <td className="border-b border-slate-100 px-2 py-2 text-slate-600">
                  {c.email ?? "—"}
                </td>
                <td className="border-b border-slate-100 px-2 py-2 text-slate-600">
                  {c.primaryAreaLabel ?? c.primaryLocation?.name ?? "—"}
                </td>
                <td className="border-b border-slate-100 px-2 py-2">
                  <form action={setCoachActiveAction} className="flex items-center gap-2">
                    <input type="hidden" name="coachId" value={c.id} />
                    <select
                      name="isActive"
                      defaultValue={c.isActive ? "true" : "false"}
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      Update
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
