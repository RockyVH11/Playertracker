"use server";

import { redirect } from "next/navigation";
import {
  PlayerPosition,
  PlayerSource,
  PlayerStatus,
  PlacementPriority,
  EvaluationLevel,
  Gender,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { deriveAgeGroupForDob } from "@/lib/dob-age";
import { parseDobToUtcDate } from "@/lib/dob-parse";
import { parseGuardianContact } from "@/lib/intake-guardian-contact";
import { findPlayerByIntakeIdentity } from "@/lib/intake-player-match";
import { createIntakeEditToken, verifyIntakeEditToken } from "@/lib/intake-edit-token";
import { formatDobAsMmDdYyUtc } from "@/lib/intake-dob-display";

function parseNullableId(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

export type IntakeIdentityPayload = {
  seasonLabel: string;
  firstName: string;
  lastName: string;
  dobRaw: string;
  gender: Gender;
};

async function parseIdentityPayload(input: IntakeIdentityPayload): Promise<
  | { ok: true; seasonLabel: string; firstName: string; lastName: string; dob: Date; gender: Gender }
  | { ok: false; error: string }
> {
  const seasonLabel = input.seasonLabel.trim();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const dobRaw = input.dobRaw.trim();
  const gender = input.gender;

  if (!firstName || !lastName || !dobRaw) {
    return { ok: false, error: "Enter first name, last name, and date of birth." };
  }
  if (gender !== Gender.BOYS && gender !== Gender.GIRLS) {
    return { ok: false, error: "Select gender." };
  }
  if (!seasonLabel) {
    return { ok: false, error: "Missing season." };
  }

  let dob: Date;
  try {
    dob = parseDobToUtcDate(dobRaw);
  } catch {
    return { ok: false, error: "Enter DOB as MM/DD/YY." };
  }

  return { ok: true, seasonLabel, firstName, lastName, dob, gender };
}

export async function intakeCheckIdentityMatchAction(
  input: IntakeIdentityPayload
): Promise<
  | { ok: true; match: false }
  | { ok: true; match: true; playerId: string; firstName: string; lastName: string; dobLabel: string }
  | { ok: false; error: string }
> {
  const parsed = await parseIdentityPayload(input);
  if (!parsed.ok) return parsed;

  const existing = await findPlayerByIntakeIdentity({
    seasonLabel: parsed.seasonLabel,
    gender: parsed.gender,
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    dob: parsed.dob,
  });

  if (!existing) return { ok: true, match: false };

  return {
    ok: true,
    match: true,
    playerId: existing.id,
    firstName: existing.firstName,
    lastName: existing.lastName,
    dobLabel: formatDobAsMmDdYyUtc(existing.dob),
  };
}

export async function intakeIssueEditTokenAction(
  input: IntakeIdentityPayload
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const parsed = await parseIdentityPayload(input);
  if (!parsed.ok) return parsed;

  const existing = await findPlayerByIntakeIdentity({
    seasonLabel: parsed.seasonLabel,
    gender: parsed.gender,
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    dob: parsed.dob,
  });

  if (!existing) {
    return { ok: false, error: "No matching player record was found." };
  }

  return { ok: true, token: createIntakeEditToken(existing.id) };
}

export async function intakeCreatePlayerAction(formData: FormData) {
  const env = getEnv();
  const selectedLocationId = String(formData.get("selectedLocationId") ?? "").trim();
  const locationQuery = selectedLocationId ? `&locationId=${encodeURIComponent(selectedLocationId)}` : "";
  const seasonLabel = String(formData.get("seasonLabel") ?? env.DEFAULT_SEASON_LABEL).trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const dobRaw = String(formData.get("dob") ?? "").trim();
  const gender = String(formData.get("gender") ?? "") as Gender;
  const locationId = String(formData.get("locationId") ?? "").trim();
  const leagueInterestId = parseNullableId(formData.get("leagueInterestId"));
  const primaryPosition = String(formData.get("primaryPosition") ?? "UNKNOWN") as PlayerPosition;
  const secondaryPosition = parseNullableId(formData.get("secondaryPosition")) as PlayerPosition | null;
  const forceNewPlayer = String(formData.get("forceNewPlayer") ?? "") === "1";
  const guardianCheck = parseGuardianContact({
    guardianName: String(formData.get("guardianName") ?? ""),
    guardianPhone: String(formData.get("guardianPhone") ?? ""),
    guardianEmail: String(formData.get("guardianEmail") ?? ""),
  });

  if (!firstName || !lastName || !locationId || !dobRaw || !gender) {
    redirect(`/open-practice/new?error=Please complete all required fields.${locationQuery}`);
  }
  if (!guardianCheck.ok) {
    redirect(`/open-practice/new?error=${encodeURIComponent(guardianCheck.message)}${locationQuery}`);
  }
  const { guardianName, guardianPhone, guardianEmail } = guardianCheck;

  let dob: Date;
  try {
    dob = parseDobToUtcDate(dobRaw);
  } catch {
    redirect(`/open-practice/new?error=Enter DOB as MM/DD/YY.${locationQuery}`);
  }

  if (!forceNewPlayer) {
    const dup = await findPlayerByIntakeIdentity({
      seasonLabel,
      gender,
      firstName,
      lastName,
      dob,
    });
    if (dup) {
      redirect(
        `/open-practice/new?error=${encodeURIComponent(
          "A player with this name and birth date already exists. Choose “Yes, update existing” or confirm this is a different person before saving."
        )}${locationQuery}`
      );
    }
  }

  let derivedAgeGroup = "Unknown";
  try {
    derivedAgeGroup = await deriveAgeGroupForDob({ seasonLabel, gender, dob });
  } catch {
    /* keep Unknown */
  }

  try {
    await prisma.player.create({
      data: {
        seasonLabel,
        firstName,
        lastName,
        dob,
        gender,
        derivedAgeGroup,
        overrideAgeGroup: null,
        locationId,
        assignedTeamId: null,
        leagueInterestId,
        playerStatus: PlayerStatus.AVAILABLE,
        willingToPlayUp: false,
        primaryPosition,
        secondaryPosition,
        playerSource: PlayerSource.OPEN_SESSION,
        placementPriority: PlacementPriority.MEDIUM,
        coachNotes: null,
        evaluationLevel: EvaluationLevel.NOT_EVALUATED,
        evaluationNotes: null,
        evaluationUpdatedAt: new Date(),
        contact: {
          create: {
            guardianName,
            guardianPhone,
            guardianEmail,
          },
        },
      },
    });
  } catch {
    redirect(`/open-practice/new?error=Unable to save player right now.${locationQuery}`);
  }

  redirect(
    `/open-practice/new?saved=1${selectedLocationId ? `&locationId=${encodeURIComponent(selectedLocationId)}` : ""}`
  );
}

function editRedirectWithError(
  token: string,
  selectedLocationId: string,
  message: string
): never {
  const qs = new URLSearchParams();
  qs.set("t", token);
  if (selectedLocationId) qs.set("locationId", selectedLocationId);
  qs.set("error", message);
  redirect(`/open-practice/edit?${qs.toString()}`);
}

export async function intakeUpdatePlayerAction(formData: FormData) {
  const env = getEnv();
  const selectedLocationId = String(formData.get("selectedLocationId") ?? "").trim();
  const token = String(formData.get("intakeEditToken") ?? "").trim();
  const verified = verifyIntakeEditToken(token);
  if (!verified) {
    const q = new URLSearchParams();
    if (selectedLocationId) q.set("locationId", selectedLocationId);
    q.set(
      "error",
      "Edit link expired or is invalid. Start again from the intake form."
    );
    redirect(`/open-practice/new?${q.toString()}`);
  }

  const seasonLabel = String(formData.get("seasonLabel") ?? env.DEFAULT_SEASON_LABEL).trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const dobRaw = String(formData.get("dob") ?? "").trim();
  const gender = String(formData.get("gender") ?? "") as Gender;
  const locationId = String(formData.get("locationId") ?? "").trim();
  const leagueInterestId = parseNullableId(formData.get("leagueInterestId"));
  const primaryPosition = String(formData.get("primaryPosition") ?? "UNKNOWN") as PlayerPosition;
  const secondaryPosition = parseNullableId(formData.get("secondaryPosition")) as PlayerPosition | null;
  const guardianCheck = parseGuardianContact({
    guardianName: String(formData.get("guardianName") ?? ""),
    guardianPhone: String(formData.get("guardianPhone") ?? ""),
    guardianEmail: String(formData.get("guardianEmail") ?? ""),
  });

  if (!firstName || !lastName || !locationId || !dobRaw || !gender) {
    editRedirectWithError(token, selectedLocationId, "Please complete all required fields.");
  }
  if (!guardianCheck.ok) {
    editRedirectWithError(token, selectedLocationId, guardianCheck.message);
  }
  const { guardianName, guardianPhone, guardianEmail } = guardianCheck;

  let dob: Date;
  try {
    dob = parseDobToUtcDate(dobRaw);
  } catch {
    editRedirectWithError(token, selectedLocationId, "Enter DOB as MM/DD/YY.");
  }

  const existing = await prisma.player.findFirst({
    where: { id: verified.playerId },
    select: {
      id: true,
      seasonLabel: true,
    },
  });
  if (!existing) {
    const q = new URLSearchParams();
    if (selectedLocationId) q.set("locationId", selectedLocationId);
    q.set("error", "Player not found.");
    redirect(`/open-practice/new?${q.toString()}`);
  }

  if (existing.seasonLabel !== seasonLabel) {
    editRedirectWithError(token, selectedLocationId, "Season mismatch; cannot edit.");
  }

  let derivedAgeGroup = "Unknown";
  try {
    derivedAgeGroup = await deriveAgeGroupForDob({ seasonLabel, gender, dob });
  } catch {
    /* keep Unknown */
  }

  try {
    await prisma.player.update({
      where: { id: existing.id },
      data: {
        firstName,
        lastName,
        dob,
        gender,
        derivedAgeGroup,
        locationId,
        leagueInterestId,
        primaryPosition,
        secondaryPosition,
      },
    });

    await prisma.playerContact.upsert({
      where: { playerId: existing.id },
      create: {
        playerId: existing.id,
        guardianName,
        guardianPhone,
        guardianEmail,
      },
      update: {
        guardianName,
        guardianPhone,
        guardianEmail,
      },
    });
  } catch {
    editRedirectWithError(token, selectedLocationId, "Unable to update player right now.");
  }

  redirect(
    `/open-practice/new?saved=1&updated=1${selectedLocationId ? `&locationId=${encodeURIComponent(selectedLocationId)}` : ""}`
  );
}
