"use client";

import { useState } from "react";
import type { StaffRole } from "@prisma/client";
import { loginAction } from "@/app/actions/auth";
import { useFormStatus } from "react-dom";
import { formatCoachPickerLabel } from "@/lib/ui/formatters";

type Coach = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  staffRole: StaffRole;
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
  const [kind, setKind] = useState<"COACH" | "DIRECTOR" | "SUPER_ADMIN">("COACH");
  const coachChoices = coaches.filter((c) => c.staffRole !== "DIRECTOR");
  const directorChoices = coaches.filter((c) => c.staffRole === "DIRECTOR");

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
              checked={kind === "DIRECTOR"}
              name="kind"
              onChange={() => setKind("DIRECTOR")}
              type="radio"
              value="DIRECTOR"
            />
            Director
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
          {kind === "COACH"
            ? "Coach mode uses the shared club password for coaches/managers—directors appear only under Director mode."
            : kind === "DIRECTOR"
              ? "Director mode uses a separate director password. Only director staff profiles are listed."
              : "Super admin uses its own password and has full club access."}
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
      {kind === "COACH" ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-800">You are</span>
          <select
            className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
            name="coachId"
            required
          >
            <option value="">Select staff</option>
            {coachChoices.map((c) => (
              <option key={c.id} value={c.id}>
                {formatCoachPickerLabel(c)}
              </option>
            ))}
          </select>
        </label>
      ) : kind === "DIRECTOR" ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-800">You are</span>
          <select
            className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
            name="coachId"
            required
          >
            <option value="">Select director</option>
            {directorChoices.map((c) => (
              <option key={c.id} value={c.id}>
                {formatCoachPickerLabel(c)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <SubmitButton />
    </form>
  );
}
