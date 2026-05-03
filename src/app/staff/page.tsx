import Link from "next/link";
import { redirect } from "next/navigation";
import { StaffRole } from "@prisma/client";
import {
  createCoachAction,
  deleteCoachAction,
  updateCoachAction,
  updateCoachSelfContactAction,
} from "@/app/actions/staff-directory";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import { displayStaffRole } from "@/lib/staff/staff-role-label";
import { resolveStaffPageViewer } from "@/lib/staff/staff-page-viewer";
import {
  mayAddStaffMember,
  mayDeleteStaffMember,
  staffRowEditMode,
} from "@/lib/staff/staff-row-edit-mode";

type Props = { searchParams?: Promise<{ error?: string }> };

const STAFF_ROLES: StaffRole[] = ["DIRECTOR", "COACH", "MANAGER"];

export default async function StaffPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const viewer = await resolveStaffPageViewer(session);
  if (!viewer) redirect("/teams");

  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? decodeURIComponent(sp.error) : null;

  const viewerStaffRole = viewer.kind === "super_admin" ? null : viewer.staffRole;

  const coaches = await prisma.coach.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { primaryLocation: { select: { id: true, name: true } } },
  });

  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });

  const canAdd = mayAddStaffMember(session, viewerStaffRole);
  const canDelete = mayDeleteStaffMember(session);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Staff directory</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Staff identities power the coach picker after sign-in. What you edit here feeds login labels and
          who can manage prospects.
        </p>
        <p className="mt-2 text-sm">
          <Link className="text-slate-800 underline underline-offset-2" href="/prospects/new">
            Add a prospect
          </Link>
          {session.role === "SUPER_ADMIN" ? (
            <>
              {" · "}
              <Link className="text-slate-800 underline underline-offset-2" href="/admin/locations">
                Super admin tools
              </Link>
            </>
          ) : null}
        </p>
      </div>

      {viewer.kind === "coach_staff" && !viewer.isActive ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Your staff profile is inactive. You can still view the directory, but edits require reactivation by
          a director or administrator.
        </p>
      ) : null}

      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {error}
        </p>
      ) : null}

      {canAdd ? (
        <section className="rounded border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Add staff member</h2>
          <form action={createCoachAction} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <label className="flex flex-col gap-1 text-sm lg:col-span-2">
              <span className="text-slate-600">First name</span>
              <input name="firstName" required className="rounded border border-slate-300 px-2 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm lg:col-span-2">
              <span className="text-slate-600">Last name</span>
              <input name="lastName" required className="rounded border border-slate-300 px-2 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm lg:col-span-3">
              <span className="text-slate-600">Email (optional)</span>
              <input name="email" type="email" className="rounded border border-slate-300 px-2 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm lg:col-span-2">
              <span className="text-slate-600">Phone</span>
              <input name="phone" className="rounded border border-slate-300 px-2 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm lg:col-span-2">
              <span className="text-slate-600">Staff role</span>
              <select name="staffRole" required className="rounded border border-slate-300 px-2 py-2" defaultValue="COACH">
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {displayStaffRole(r)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm lg:col-span-3">
              <span className="text-slate-600">Primary location</span>
              <select name="primaryLocationId" required className="rounded border border-slate-300 px-2 py-2">
                <option value="">Select location…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end lg:col-span-12">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Add staff member
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="space-y-4">
        {coaches.map((c) => {
          const viewerId = isCoachSession(session) ? session.coachId : null;
          const mode = staffRowEditMode(session, {
            viewerStaffRole,
            viewerCoachId: viewerId,
            targetCoachId: c.id,
          });

          const locDefault = c.primaryLocation?.id ?? "";

          return (
            <article
              key={c.id}
              className="rounded border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  {c.lastName}, {c.firstName}
                </h2>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                  {displayStaffRole(c.staffRole)} · {c.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-3">
                {mode === "full" ? (
                  <>
                    <form action={updateCoachAction} className="grid gap-3 lg:grid-cols-12">
                      <input type="hidden" name="coachId" value={c.id} />
                      <label className="flex flex-col gap-1 text-sm lg:col-span-3">
                        <span className="text-slate-600">First name</span>
                        <input
                          name="firstName"
                          required
                          defaultValue={c.firstName}
                          className="rounded border border-slate-300 px-2 py-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm lg:col-span-3">
                        <span className="text-slate-600">Last name</span>
                        <input
                          name="lastName"
                          required
                          defaultValue={c.lastName}
                          className="rounded border border-slate-300 px-2 py-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm lg:col-span-3">
                        <span className="text-slate-600">Email</span>
                        <input
                          name="email"
                          type="email"
                          defaultValue={c.email ?? ""}
                          className="rounded border border-slate-300 px-2 py-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm lg:col-span-3">
                        <span className="text-slate-600">Phone</span>
                        <input
                          name="phone"
                          defaultValue={c.phone ?? ""}
                          className="rounded border border-slate-300 px-2 py-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm lg:col-span-3">
                        <span className="text-slate-600">Staff role</span>
                        <select
                          name="staffRole"
                          defaultValue={c.staffRole}
                          className="rounded border border-slate-300 px-2 py-2"
                        >
                          {STAFF_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {displayStaffRole(r)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-sm lg:col-span-4">
                        <span className="text-slate-600">Primary location</span>
                        <select
                          name="primaryLocationId"
                          required
                          defaultValue={locDefault}
                          className="rounded border border-slate-300 px-2 py-2"
                        >
                          <option value="" disabled={locations.length === 0}>
                            Select location…
                          </option>
                          {locations.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-sm lg:col-span-2">
                        <span className="text-slate-600">Availability</span>
                        <select
                          name="isActive"
                          defaultValue={c.isActive ? "true" : "false"}
                          className="rounded border border-slate-300 px-2 py-2"
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </label>
                      <div className="lg:col-span-12">
                        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                          Save changes
                        </button>
                      </div>
                    </form>
                    {canDelete ? (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <form action={deleteCoachAction} className="inline-block">
                          <input type="hidden" name="coachId" value={c.id} />
                          <button
                            type="submit"
                            className="rounded border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            Delete staff profile
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </>
                ) : mode === "contact_only" ? (
                  <form action={updateCoachSelfContactAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
                    <input type="hidden" name="coachId" value={c.id} />
                    <label className="flex flex-col gap-1 text-sm lg:col-span-4">
                      <span className="text-slate-600">Email</span>
                      <input
                        name="email"
                        type="email"
                        defaultValue={c.email ?? ""}
                        className="rounded border border-slate-300 px-2 py-2"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm lg:col-span-4">
                      <span className="text-slate-600">Phone</span>
                      <input name="phone" defaultValue={c.phone ?? ""} className="rounded border border-slate-300 px-2 py-2" />
                    </label>
                    <div className="flex items-end lg:col-span-12">
                      <button type="submit" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">
                        Save your contact info
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase text-slate-500">Email</dt>
                      <dd>{c.email ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-slate-500">Phone</dt>
                      <dd>{c.phone ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-slate-500">Area</dt>
                      <dd>{c.primaryAreaLabel ?? c.primaryLocation?.name ?? "—"}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
