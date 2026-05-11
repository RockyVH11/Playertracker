"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerPosition } from "@prisma/client";
import { intakeCreatePlayerAction } from "@/app/actions/intake";
import { DobInput } from "./dob-input";

type LocationOption = { id: string; name: string };
type LeagueOption = { id: string; name: string };

export function IntakePlayerForm(props: {
  seasonLabel: string;
  selectedLocationId: string;
  locations: LocationOption[];
  leagues: LeagueOption[];
}) {
  const { seasonLabel, selectedLocationId, locations, leagues } = props;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);

  const markDirty = useCallback(() => {
    setDirty(true);
  }, []);

  const onStopIntakeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!dirty) return;
    e.preventDefault();
    setExitModalOpen(true);
  };

  return (
    <>
      <form
        ref={formRef}
        action={intakeCreatePlayerAction}
        className="space-y-3 rounded border border-slate-200 bg-white p-4"
        onInput={markDirty}
        onChange={markDirty}
      >
        <input type="hidden" name="seasonLabel" value={seasonLabel} />
        <input type="hidden" name="selectedLocationId" value={selectedLocationId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>First name</span>
            <input name="firstName" required className="w-full rounded border border-slate-300 px-2 py-2" />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Last name</span>
            <input name="lastName" required className="w-full rounded border border-slate-300 px-2 py-2" />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Date of birth</span>
            <DobInput />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Gender</span>
            <select name="gender" required className="w-full rounded border border-slate-300 px-2 py-2">
              <option value="">Select</option>
              <option value="BOYS">Boys</option>
              <option value="GIRLS">Girls</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Pool location</span>
            <select name="locationId" required defaultValue={selectedLocationId} className="w-full rounded border border-slate-300 px-2 py-2">
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>League interest</span>
            <select name="leagueInterestId" className="w-full rounded border border-slate-300 px-2 py-2">
              <option value="">-</option>
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Primary position</span>
            <select name="primaryPosition" defaultValue={PlayerPosition.UNKNOWN} className="w-full rounded border border-slate-300 px-2 py-2">
              {Object.values(PlayerPosition).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Secondary position</span>
            <select name="secondaryPosition" defaultValue="" className="w-full rounded border border-slate-300 px-2 py-2">
              <option value="">-</option>
              {Object.values(PlayerPosition).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="rounded border border-slate-200 bg-slate-50/80 p-3">
          <legend className="px-1 text-sm font-medium text-slate-800">Parent / guardian contact</legend>
          <p className="mb-3 text-xs text-slate-600">Required so coaches can follow up after open practice.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm sm:col-span-2">
              <span>Parent or guardian name</span>
              <input
                name="guardianName"
                required
                autoComplete="name"
                className="w-full rounded border border-slate-300 px-2 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Parent phone</span>
              <input
                name="guardianPhone"
                type="tel"
                required
                autoComplete="tel"
                className="w-full rounded border border-slate-300 px-2 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Parent email</span>
              <input
                name="guardianEmail"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded border border-slate-300 px-2 py-2"
              />
            </label>
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
            Save player
          </button>
          <a
            href="/"
            onClick={onStopIntakeClick}
            className="inline-block rounded border border-slate-300 px-4 py-2 text-sm text-slate-900 hover:bg-slate-50"
          >
            Stop intake
          </a>
        </div>
      </form>

      {exitModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setExitModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="intake-exit-title"
            className="max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg"
          >
            <h2 id="intake-exit-title" className="text-lg font-semibold text-slate-900">
              Unsaved changes
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              You have entered information that has not been saved. You can save this player first, leave without saving,
              or stay on this page.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
                onClick={() => setExitModalOpen(false)}
              >
                Stay on this page
              </button>
              <button
                type="button"
                className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 hover:bg-amber-100"
                onClick={() => {
                  setExitModalOpen(false);
                  router.push("/");
                }}
              >
                Leave without saving
              </button>
              <button
                type="button"
                className="rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
                onClick={() => {
                  setExitModalOpen(false);
                  formRef.current?.requestSubmit();
                }}
              >
                Save player
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
