import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/teams");
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-xl font-semibold text-slate-900">Admin</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage locations, leagues, age chart rules, and coach roster for login.
        </p>
      </div>
      <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link className="text-slate-800 underline-offset-4 hover:underline" href="/admin/locations">
          Locations
        </Link>
        <Link className="text-slate-800 underline-offset-4 hover:underline" href="/admin/leagues">
          Leagues
        </Link>
        <Link className="text-slate-800 underline-offset-4 hover:underline" href="/admin/age-chart">
          Age chart
        </Link>
        <Link className="text-slate-800 underline-offset-4 hover:underline" href="/admin/coaches">
          Coaches / users
        </Link>
        <Link className="text-slate-800 underline-offset-4 hover:underline" href="/admin/teams/new">
          Add team
        </Link>
      </nav>
      {children}
    </div>
  );
}
