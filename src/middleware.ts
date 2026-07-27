import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/profile", "/settings", "/trips"];
const AUTH_ONLY_PREFIXES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isAuthOnlyRoute = AUTH_ONLY_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isProtectedRoute && !user) {
    const landingUrl = new URL("/", request.url);
    return NextResponse.redirect(landingUrl);
  }

  if (isAuthOnlyRoute && user) {
    const tripsUrl = new URL("/", request.url);
    return NextResponse.redirect(tripsUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimization
     * files, so the Supabase session cookie stays fresh on every navigation.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
