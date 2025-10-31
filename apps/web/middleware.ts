/**
 * No-op middleware for local dev.
 * Prevents Next.js runtime errors and avoids login loops.
 * Replace with an auth-aware middleware later when cookie-based auth is in place.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/__noop_never_matches"], // never matches anything
};
