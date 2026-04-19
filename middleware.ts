import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * `/plan` and `/plan/:numericId` only exist to send people to the kitchen wall.
 * Doing this in middleware avoids starting an RSC stream that immediately
 * redirects — in dev, that abort can trigger React Flight's performance.measure
 * with invalid timestamps ("end cannot be negative") and break the client UI.
 *
 * `/recipe?ingredients=…` is rewritten to `/recipe/dish` so the picker (`RecipePage`)
 * and the generated view (`RecipeDishPage`) are different segments — same-route
 * navigations were tripping the same dev Performance.measure bug.
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/recipe") {
    const ingredients = searchParams.get("ingredients");
    if (ingredients?.trim()) {
      const url = request.nextUrl.clone();
      url.pathname = "/recipe/dish";
      return NextResponse.rewrite(url);
    }
  }

  if (pathname === "/plan") {
    return NextResponse.redirect(new URL("/wall", request.url));
  }
  if (/^\/plan\/\d+$/.test(pathname)) {
    return NextResponse.redirect(new URL("/wall", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/plan", "/plan/:path*", "/recipe"],
};
