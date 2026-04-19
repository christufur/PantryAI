import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * `/plan` and `/plan/:numericId` only exist to send people to the kitchen wall.
 * Doing this in middleware avoids starting an RSC stream that immediately
 * redirects — in dev, that abort can trigger React Flight's performance.measure
 * with invalid timestamps ("end cannot be negative") and break the client UI.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/plan") {
    return NextResponse.redirect(new URL("/wall", request.url));
  }
  if (/^\/plan\/\d+$/.test(pathname)) {
    return NextResponse.redirect(new URL("/wall", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/plan", "/plan/:path*"],
};
