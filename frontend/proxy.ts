import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Edge Proxy — Server-side route protection.
 *
 * Checks for the presence of a `fo_token` cookie on protected routes.
 * If absent, redirects to /login. This prevents the flash of dashboard
 * content that occurs with client-side-only guards.
 *
 * NOTE: Edge proxy cannot verify JWT signatures (no access to
 * jsonwebtoken / Node crypto). It only checks token *presence*.
 * Actual validation happens server-side via the Express authenticateToken
 * middleware on each API call.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicPaths = ["/login", "/signup"];
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // Static assets & Next.js internals — always allow
  const isAssetOrInternal =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".");

  if (isPublicPath || isAssetOrInternal) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
  const token = request.cookies.get("fo_token")?.value || request.cookies.get("franchiseops_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
