"use server";

import { redirect } from "next/navigation";
import { PlayerPosition, PlayerSource, PlayerStatus, PlacementPriority, EvaluationLevel, Gender } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { deriveAgeGroupForDob } from "@/lib/dob-age";
import { parseDobToUtcDate } from "@/lib/dob-parse";
import { parseGuardianContact } from "@/lib/intake-guardian-contact";

function parseNullableId(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
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

  redirect(`/open-practice/new?saved=1${selectedLocationId ? `&locationId=${encodeURIComponent(selectedLocationId)}` : ""}`);
}
