import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const ASSET_PREFIXES = ["/_next", "/favicon"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  for (const p of ASSET_PREFIXES) {
    if (pathname.startsWith(p)) return NextResponse.next();
  }
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return NextResponse.next();
  }
  if (pathname === "/") {
    return NextResponse.next();
  }
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
