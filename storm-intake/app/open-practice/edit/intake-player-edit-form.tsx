import { Gender, PlayerPosition } from "@prisma/client";
import { intakeUpdatePlayerAction } from "@/app/actions/intake";
import { DobInput } from "../new/dob-input";

type LocationOption = { id: string; name: string };
type LeagueOption = { id: string; name: string };

type Initial = {
  firstName: string;
  lastName: string;
  dobMmDdYy: string;
  gender: Gender;
  locationId: string;
  leagueInterestId: string | null;
  primaryPosition: PlayerPosition;
  secondaryPosition: PlayerPosition | null;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
};

export function IntakePlayerEditForm(props: {
  intakeEditToken: string;
  seasonLabel: string;
  selectedLocationId: string;
  locations: LocationOption[];
  leagues: LeagueOption[];
  initial: Initial;
}) {
  const { intakeEditToken, seasonLabel, selectedLocationId, locations, leagues, initial } = props;

  return (
    <form action={intakeUpdatePlayerAction} className="space-y-3 rounded border border-slate-200 bg-white p-4">
      <input type="hidden" name="intakeEditToken" value={intakeEditToken} />
      <input type="hidden" name="seasonLabel" value={seasonLabel} />
      <input type="hidden" name="selectedLocationId" value={selectedLocationId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span>First name</span>
          <input
            name="firstName"
            required
            defaultValue={initial.firstName}
            className="w-full rounded border border-slate-300 px-2 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Last name</span>
          <input
            name="lastName"
            required
            defaultValue={initial.lastName}
            className="w-full rounded border border-slate-300 px-2 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Date of birth</span>
          <DobInput initialMmDdYy={initial.dobMmDdYy} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Gender</span>
          <select name="gender" required defaultValue={initial.gender} className="w-full rounded border border-slate-300 px-2 py-2">
            <option value="">Select</option>
            <option value="BOYS">Boys</option>
            <option value="GIRLS">Girls</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Pool location</span>
          <select name="locationId" required defaultValue={initial.locationId} className="w-full rounded border border-slate-300 px-2 py-2">
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>League interest</span>
          <select name="leagueInterestId" defaultValue={initial.leagueInterestId ?? ""} className="w-full rounded border border-slate-300 px-2 py-2">
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
          <select name="primaryPosition" defaultValue={initial.primaryPosition} className="w-full rounded border border-slate-300 px-2 py-2">
            {Object.values(PlayerPosition).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Secondary position</span>
          <select name="secondaryPosition" defaultValue={initial.secondaryPosition ?? ""} className="w-full rounded border border-slate-300 px-2 py-2">
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
              defaultValue={initial.guardianName}
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
              defaultValue={initial.guardianPhone}
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
              defaultValue={initial.guardianEmail}
              className="w-full rounded border border-slate-300 px-2 py-2"
            />
          </label>
        </div>
      </fieldset>
      <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
        Save changes
      </button>
    </form>
  );
}
