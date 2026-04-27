import { cookies } from "next/headers";
import * as jose from "jose";
import { z } from "zod";
import { SessionPayload, isCoachSession } from "./types";
import { getAuthEnv } from "@/lib/env-auth";

const COOKIE = "pt_session";

const sessionSchema = z.object({
  sub: z.literal("pt"),
  role: z.enum(["SUPER_ADMIN", "COACH"]),
  coachId: z.string().nullable().optional().default(null),
  iat: z.number().int().optional(),
  exp: z.number().int().optional(),
});

function encSecret() {
  const { SESSION_SECRET } = getAuthEnv();
  return new TextEncoder().encode(SESSION_SECRET);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new jose.SignJWT({
    sub: "pt" as const,
    role: payload.role,
    coachId: payload.coachId,
  } as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload: raw } = await jose.jwtVerify(token, encSecret(), {
      algorithms: ["HS256"],
    });
    const parsed = sessionSchema.safeParse(raw);
    if (!parsed.success) return null;
    const p = parsed.data;
    if (p.role === "COACH" && (p.coachId == null || p.coachId.length === 0)) {
      return null;
    }
    if (p.role === "SUPER_ADMIN" && p.coachId) {
      return { role: "SUPER_ADMIN", coachId: null };
    }
    return { role: p.role, coachId: p.coachId ?? null };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) {
    return null;
  }
  if (isCoachSession(session)) return session;
  if (session.role === "SUPER_ADMIN") {
    return { role: "SUPER_ADMIN", coachId: null };
  }
  return null;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export { COOKIE as SESSION_COOKIE_NAME };
