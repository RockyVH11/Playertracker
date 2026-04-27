import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listActiveCoaches } from "@/app/actions/auth";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/teams");
  }
  const coaches = await listActiveCoaches();
  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-center text-2xl font-semibold text-slate-900">
        Sign in
      </h1>
      <p className="mt-2 text-center text-sm text-slate-600">
        Shared club password for MVP. Coach mode requires selecting your name.
      </p>
      <div className="mt-8 rounded border border-slate-200 bg-white p-4 shadow-sm">
        <LoginForm coaches={coaches} />
      </div>
    </div>
  );
}
