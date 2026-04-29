"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions/auth";
import { useFormStatus } from "react-dom";
import { formatCoachPickerLabel } from "@/lib/ui/formatters";

type Coach = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  staffRoleLabel: string | null;
  primaryAreaLabel: string | null;
  primaryLocation: { name: string } | null;
};

function SubmitButton() {
  const s = useFormStatus();
  return (
    <button
      className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      disabled={s.pending}
      type="submit"
    >
      {s.pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm({ coaches }: { coaches: Coach[] }) {
  const [kind, setKind] = useState<"COACH" | "SUPER_ADMIN">("COACH");
  return (
    <form action={loginAction} className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-medium text-slate-800">Mode</div>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              checked={kind === "COACH"}
              name="kind"
              onChange={() => setKind("COACH")}
              type="radio"
              value="COACH"
            />
            Coach
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              checked={kind === "SUPER_ADMIN"}
              name="kind"
              onChange={() => setKind("SUPER_ADMIN")}
              type="radio"
              value="SUPER_ADMIN"
            />
            Super admin
          </label>
        </div>
        <p className="text-xs text-slate-500">
          Coach mode uses the shared club password, then you select your name.
        </p>
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-800">Password</span>
        <input
          autoComplete="current-password"
          className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
          name="password"
          required
          type="password"
        />
      </label>
      {kind === "COACH" && (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-800">You are</span>
          <select
            className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
            name="coachId"
            required
          >
            <option value="">Select coach</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {formatCoachPickerLabel(c)}
              </option>
            ))}
          </select>
        </label>
      )}
      <SubmitButton />
    </form>
  );
}
