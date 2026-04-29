import Link from "next/link";
export const dynamic = "force-dynamic";

export default function OpenPracticeDonePage() {
  const mainAppUrl = process.env.MAIN_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
      <img src="/storm-logo.png" alt="Storm FC" className="h-20 w-auto" />
      <h1 className="text-2xl font-semibold">Open Practice Intake</h1>
      <p className="text-sm text-slate-600">Thanks. Continue intake or return to app login.</p>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link href="/open-practice/set-location" className="rounded bg-slate-900 px-4 py-2 text-white">Return to intake</Link>
        <a href={`${mainAppUrl}/login`} className="rounded border border-slate-300 px-4 py-2">Login to app</a>
      </div>
    </main>
  );
}

