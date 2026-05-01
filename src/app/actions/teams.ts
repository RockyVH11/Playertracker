"use server";



import { revalidatePath } from "next/cache";

import { cookies } from "next/headers";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";

import { getServerEnv } from "@/lib/env";

import {

  createTeam,

  deleteTeam,

  prismaTeamUncheckedCreatePayload,

  updateTeam,

} from "@/lib/services/teams.service";

import {

  firstTeamFormIssueMessage,

  teamCreateFieldsWithoutNameSchema,

  teamCreateSchema,

  teamIdSchema,

} from "@/lib/validation/teams";

import {

  buildAutoTeamBaseName,

  SQUAD_SUFFIX_BLACK,

  SQUAD_SUFFIX_RED,

  withSquadSuffix,

} from "@/lib/team-auto-name";

import { Gender } from "@prisma/client";

import { z } from "zod";

import { auditLog } from "@/lib/audit-log";
import { TEAM_SQUAD_DRAFT_COOKIE } from "@/lib/team-squad-draft";

const updateTeamSchema = teamCreateSchema.extend({ id: z.string().cuid() });



function parseLeagueId(s: string | null) {

  if (!s || s.length === 0) return null;

  return s;

}

/** Hidden `_formBase` on squad-split modal: where to return after discard or errors. */
function teamDraftFormPath(formBaseHidden: string | null | undefined): string {

  if (formBaseHidden === "admin") return "/admin/teams/new";

  if (formBaseHidden === "coach-add") return "/teams/add";

  return "/teams/new";

}



function toTeamsErrorUrl(path: string, message: string) {

  const sep = path.includes("?") ? "&" : "?";

  return `${path}${sep}error=${encodeURIComponent(message)}`;

}



async function computeAutoTeamDisplayName(

  interim: z.infer<typeof teamCreateFieldsWithoutNameSchema>

): Promise<string> {

  const [coach, leagueRow] = await Promise.all([

    prisma.coach.findFirst({

      where: { id: interim.coachId },

      select: { lastName: true },

    }),

    interim.leagueId

      ? prisma.league.findFirst({

          where: { id: interim.leagueId },

          select: { name: true },

        })

      : Promise.resolve(null),

  ]);

  const clubName = getServerEnv().CLUB_DISPLAY_NAME;

  const coachLast = coach?.lastName?.trim().length ? coach.lastName.trim() : "Coach";

  return buildAutoTeamBaseName({

    clubName,

    ageGroup: interim.ageGroup,

    gender: interim.gender,

    leagueName: leagueRow?.name ?? null,

    coachLastName: coachLast,

  });

}



type SquadDraftV1 = {

  v: 1;

  clashTeamId: string;

  baseDisplayCore: string;

  body: z.infer<typeof teamCreateFieldsWithoutNameSchema>;

};



export async function createTeamAction(formData: FormData) {

  const session = await getSession();

  if (!session) redirect("/login");

  const coachSelfServe = String(formData.get("_coachSelfCreate") ?? "") === "1";

  const returnToAdmin = String(formData.get("_returnToAdmin") ?? "") === "1";

  const formBase = coachSelfServe
    ? "/teams/add"
    : returnToAdmin
      ? "/admin/teams/new"
      : "/teams/new";

  if (coachSelfServe && !isCoachSession(session)) {
    redirect(toTeamsErrorUrl(formBase, "Only coaches can add a team from this page."));
  }

  const manual = String(formData.get("teamNameManual") ?? "").trim();

  if (coachSelfServe && manual.length > 0) {
    redirect(
      toTeamsErrorUrl(
        formBase,
        "Team names are generated automatically for coaches. Do not submit a manual display name override."
      )
    );
  }



  const rawWithoutName = {

    seasonLabel: String(formData.get("seasonLabel") ?? ""),

    locationId: String(formData.get("locationId") ?? ""),

    gender: String(formData.get("gender") ?? "") as Gender,

    ageGroup: String(formData.get("ageGroup") ?? ""),

    coachId: String(formData.get("coachId") ?? ""),

    leagueId: parseLeagueId(String(formData.get("leagueId") ?? "")),

    openSession: String(formData.get("openSession") ?? "off") === "on" ? "on" : "off",

    committedPlayerCount: String(formData.get("committedPlayerCount") ?? "0"),

    coachEstimatedPlayerCount: String(formData.get("coachEstimatedPlayerCount") ?? "0"),

    returningPlayerCount: String(formData.get("returningPlayerCount") ?? "0"),

    neededPlayerCount: String(formData.get("neededPlayerCount") ?? "0"),

    neededGoalkeepers: String(formData.get("neededGoalkeepers") ?? "0"),

    neededDefenders: String(formData.get("neededDefenders") ?? "0"),

    neededMidfielders: String(formData.get("neededMidfielders") ?? "0"),

    neededForwards: String(formData.get("neededForwards") ?? "0"),

    neededUtility: String(formData.get("neededUtility") ?? "0"),

    recruitingNeeds: String(formData.get("recruitingNeeds") ?? ""),

    notes: String(formData.get("notes") ?? ""),

  };



  const interimParsed = teamCreateFieldsWithoutNameSchema.safeParse({

    ...rawWithoutName,

    recruitingNeeds: rawWithoutName.recruitingNeeds || null,

    notes: rawWithoutName.notes || null,

  });



  if (!interimParsed.success) {

    redirect(toTeamsErrorUrl(formBase, firstTeamFormIssueMessage(interimParsed.error)));

  }



  let interim = interimParsed.data;

  if (coachSelfServe) {
    if (!isCoachSession(session)) {
      redirect(toTeamsErrorUrl(formBase, "Only coaches can add a team from this page."));
    }
    interim = { ...interim, coachId: session.coachId };
  }

  let resolvedName: string;

  try {

    resolvedName =

      manual.length > 0 ? manual : await computeAutoTeamDisplayName(interim);

  } catch {

    redirect(toTeamsErrorUrl(formBase, "Could not build team display name."));

  }



  const fullParsed = teamCreateSchema.safeParse({

    ...interim,

    teamName: resolvedName,

  });



  if (!fullParsed.success) {

    redirect(toTeamsErrorUrl(formBase, firstTeamFormIssueMessage(fullParsed.error)));

  }



  const p = fullParsed.data;



  const clash = await prisma.team.findFirst({

    where: {

      seasonLabel: p.seasonLabel,

      teamName: p.teamName,

    },

  });



  if (clash) {

    if (manual.length > 0) {

      redirect(

        toTeamsErrorUrl(formBase, "That display name is already used. Pick a different manual name.")

      );

    }

    const cookieStore = await cookies();

    const draft: SquadDraftV1 = {

      v: 1,

      clashTeamId: clash.id,

      baseDisplayCore: p.teamName.trim(),

      body: interim,

    };

    cookieStore.set(TEAM_SQUAD_DRAFT_COOKIE, JSON.stringify(draft), {

      httpOnly: true,

      path: "/",

      maxAge: 900,

      sameSite: "lax",

      secure: process.env.NODE_ENV === "production",

    });

    redirect(`${formBase}?squadDup=1`);

  }



  let id: string;

  try {

    const created = await createTeam({

      session,

      coachSelfServe,

      data: {

        seasonLabel: p.seasonLabel,

        teamName: p.teamName,

        locationId: p.locationId,

        gender: p.gender,

        ageGroup: p.ageGroup,

        coachId: p.coachId,

        leagueId: p.leagueId ?? null,

        openSession: p.openSession,

        committedPlayerCount: p.committedPlayerCount,

        coachEstimatedPlayerCount: p.coachEstimatedPlayerCount,

        returningPlayerCount: p.returningPlayerCount,

        neededPlayerCount: p.neededPlayerCount,

        neededGoalkeepers: p.neededGoalkeepers,

        neededDefenders: p.neededDefenders,

        neededMidfielders: p.neededMidfielders,

        neededForwards: p.neededForwards,

        neededUtility: p.neededUtility,

        recruitingNeeds: p.recruitingNeeds ?? null,

        notes: p.notes ?? null,

      },

    });

    id = created.id;

  } catch {

    redirect(toTeamsErrorUrl(formBase, "Unable to create team."));

  }

  await auditLog(session, "Team", id, "create", {});

  revalidatePath("/teams");

  if (returnToAdmin) {

    revalidatePath("/admin/teams/new");

  }

  const listParams = new URLSearchParams({
    seasonLabel: p.seasonLabel,
    promptAddAnother: "1",
    newTeam: id,
  });

  redirect(`/teams?${listParams.toString()}`);

}



/**

 * Applies -Black / -Red naming: renames existing base roster when needed and creates second squad.

 */

export async function finalizeSquadBlackRedSplitAction(formData: FormData) {
  const session = await getSession();

  if (!session) redirect("/login");

  const formBaseHidden =

    typeof formData?.get("_formBase") === "string" ? String(formData.get("_formBase")) : "";

  const formBaseParam = teamDraftFormPath(formBaseHidden);

  const store = await cookies();

  const rawDraft = store.get(TEAM_SQUAD_DRAFT_COOKIE)?.value;

  let draft: SquadDraftV1;

  try {

    if (!rawDraft) throw new Error("no draft");

    const parsedJson = JSON.parse(rawDraft) as SquadDraftV1;

    if (parsedJson?.v !== 1 || !parsedJson.clashTeamId || !parsedJson.baseDisplayCore) {

      throw new Error("bad draft");

    }

    draft = parsedJson;

  } catch {

    redirect(toTeamsErrorUrl(formBaseParam, "This squad split expired. Try creating again."));

  }

  if (session.role !== "SUPER_ADMIN") {

    if (!isCoachSession(session)) {

      redirect(toTeamsErrorUrl(formBaseParam, "Not allowed."));

    }

    if (draft.body.coachId !== session.coachId) {

      redirect(toTeamsErrorUrl(formBaseParam, "Not allowed."));

    }

    const clashOwner = await prisma.team.findFirst({

      where: { id: draft.clashTeamId },

      select: { coachId: true, seasonLabel: true },

    });

    if (!clashOwner || clashOwner.coachId !== session.coachId) {

      redirect(

        toTeamsErrorUrl(

          formBaseParam,

          "Only the coach who already owns the duplicate roster name can split into -Black/-Red here—or ask an admin."

        )

      );

    }

  }

  const baseRaw = draft.baseDisplayCore.trim();

  const blackLab = withSquadSuffix(baseRaw, SQUAD_SUFFIX_BLACK);

  const redLab = withSquadSuffix(baseRaw, SQUAD_SUFFIX_RED);



  const fullParsed = teamCreateSchema.safeParse({

    ...draft.body,

    teamName: redLab,

  });



  if (!fullParsed.success) {

    redirect(

      toTeamsErrorUrl(formBaseParam, firstTeamFormIssueMessage(fullParsed.error))

    );

  }

  const pdata = fullParsed.data;

  const prismaArgs = prismaTeamUncheckedCreatePayload(pdata);



  let newId: string;

  try {

    newId = await prisma.$transaction(async (tx) => {

      const clash = await tx.team.findFirst({

        where: { id: draft.clashTeamId },

      });

      if (!clash || clash.seasonLabel !== pdata.seasonLabel) {

        throw new Error("Stale or mismatched conflicting team.");

      }



      const redTaken = await tx.team.findFirst({

        where: { seasonLabel: clash.seasonLabel, teamName: redLab },

      });

      if (redTaken && redTaken.id !== draft.clashTeamId) {

        throw new Error("A -Red roster already exists for this naming pattern.");

      }



      const n = clash.teamName.trim();

      let createdId: string;



      if (n === blackLab) {

        if (redTaken) {

          throw new Error("-Red roster already exists.");

        }

        const row = await tx.team.create({

          data: prismaArgs,

        });

        createdId = row.id;

      } else if (n === baseRaw) {

        await tx.team.update({

          where: { id: clash.id },

          data: { teamName: blackLab },

        });

        const row = await tx.team.create({

          data: prismaArgs,

        });

        createdId = row.id;

      } else {

        throw new Error(

          "Rename the existing team on that season to match this flow, then retry—or split manually."

        );

      }

      return createdId;

    });

  } catch (e) {

    const msg = e instanceof Error ? e.message : "Could not apply squad split.";

    redirect(toTeamsErrorUrl(formBaseParam, msg));

  }



  store.delete(TEAM_SQUAD_DRAFT_COOKIE);

  await auditLog(session, "Team", newId, "create", { squadSplitFrom: draft.clashTeamId });

  revalidatePath("/teams");

  revalidatePath(formBaseParam);

  revalidatePath(`/teams/${newId}`);

  if (formBaseParam.includes("admin")) {

    revalidatePath("/admin/teams/new");

  }

  const listQs = new URLSearchParams({
    seasonLabel: pdata.seasonLabel,
    promptAddAnother: "1",
    newTeam: newId,
  });

  redirect(`/teams?${listQs.toString()}`);

}



export async function discardTeamSquadDraftAction(formData: FormData) {
  const session = await getSession();

  if (!session || !(session.role === "SUPER_ADMIN" || isCoachSession(session))) redirect("/login");

  const store = await cookies();

  store.delete(TEAM_SQUAD_DRAFT_COOKIE);

  const formBaseHidden =

    typeof formData?.get("_formBase") === "string" ? String(formData.get("_formBase")) : "";

  redirect(teamDraftFormPath(formBaseHidden));

}



export async function updateTeamAction(formData: FormData) {

  const session = await getSession();

  if (!session) redirect("/login");

  const id = String(formData.get("id") ?? "");

  const raw = {

    id,

    seasonLabel: String(formData.get("seasonLabel") ?? ""),

    teamName: String(formData.get("teamName") ?? ""),

    locationId: String(formData.get("locationId") ?? ""),

    gender: String(formData.get("gender") ?? "") as Gender,

    ageGroup: String(formData.get("ageGroup") ?? ""),

    coachId: String(formData.get("coachId") ?? ""),

    leagueId: parseLeagueId(String(formData.get("leagueId") ?? "")),

    openSession: String(formData.get("openSession") ?? "off") === "on" ? "on" : "off",

    committedPlayerCount: String(formData.get("committedPlayerCount") ?? "0"),

    coachEstimatedPlayerCount: String(formData.get("coachEstimatedPlayerCount") ?? "0"),

    returningPlayerCount: String(formData.get("returningPlayerCount") ?? "0"),

    neededPlayerCount: String(formData.get("neededPlayerCount") ?? "0"),

    neededGoalkeepers: String(formData.get("neededGoalkeepers") ?? "0"),

    neededDefenders: String(formData.get("neededDefenders") ?? "0"),

    neededMidfielders: String(formData.get("neededMidfielders") ?? "0"),

    neededForwards: String(formData.get("neededForwards") ?? "0"),

    neededUtility: String(formData.get("neededUtility") ?? "0"),

    recruitingNeeds: String(formData.get("recruitingNeeds") ?? ""),

    notes: String(formData.get("notes") ?? ""),

  };

  const parsed = updateTeamSchema.safeParse({ ...raw });

  if (!parsed.success) {

    redirect(toTeamsErrorUrl(`/teams/${id}`, "Invalid team form."));

  }

  const p = parsed.data;

  try {

    if (session.role === "SUPER_ADMIN") {

      await updateTeam({

        session,

        id: p.id,

        data: {

          seasonLabel: p.seasonLabel,

          teamName: p.teamName,

          locationId: p.locationId,

          gender: p.gender,

          ageGroup: p.ageGroup,

          coachId: p.coachId,

          leagueId: p.leagueId ?? null,

          openSession: p.openSession,

          committedPlayerCount: p.committedPlayerCount,

          coachEstimatedPlayerCount: p.coachEstimatedPlayerCount,

          returningPlayerCount: p.returningPlayerCount,

          neededPlayerCount: p.neededPlayerCount,

          neededGoalkeepers: p.neededGoalkeepers,

          neededDefenders: p.neededDefenders,

          neededMidfielders: p.neededMidfielders,

          neededForwards: p.neededForwards,

          neededUtility: p.neededUtility,

          recruitingNeeds: p.recruitingNeeds ?? null,

          notes: p.notes ?? null,

        },

      });

    } else {

      await updateTeam({

        session,

        id: p.id,

        data: {

          coachEstimatedPlayerCount: p.coachEstimatedPlayerCount,

          recruitingNeeds: p.recruitingNeeds ?? null,

        },

      });

    }

  } catch {

    redirect(toTeamsErrorUrl(`/teams/${p.id}`, "Update failed for this role."));

  }

  await auditLog(session, "Team", p.id, "update", {

    coachOnlyEstimate: session.role !== "SUPER_ADMIN",

  });

  revalidatePath("/teams");

  revalidatePath(`/teams/${p.id}`);

  if (session.role === "SUPER_ADMIN") {

    redirect("/teams");

  }

  redirect(`/teams/${p.id}`);

}



export async function deleteTeamAction(formData: FormData) {

  const session = await getSession();

  if (!session) redirect("/login");

  const id = String(formData.get("id") ?? "");

  if (!teamIdSchema.safeParse({ id }).success) {

    redirect(toTeamsErrorUrl("/teams", "Invalid team id."));

  }

  try {

    await deleteTeam({ session, id });

  } catch {

    redirect(toTeamsErrorUrl(`/teams/${id}`, "Unable to delete this team."));

  }

  await auditLog(session, "Team", id, "delete", {});

  revalidatePath("/teams");

  redirect("/teams");

}


