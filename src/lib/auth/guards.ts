import "server-only";

import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Returns the authenticated user for the current request, or null.
 * Safe to call from Server Components, Server Actions, and Route Handlers.
 */
export async function getCurrentUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/**
 * Returns the authenticated user or redirects to /login. Use at the top of
 * any protected Server Component / layout / Server Action. Middleware also
 * enforces this at the edge, so this is a defense-in-depth check that also
 * gives you the user object.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function redirectIfAuthenticated() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }
}
