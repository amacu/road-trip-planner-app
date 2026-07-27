import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/lib/supabase/env";

const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 365;

let rememberSession = true;
let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Toggles the "remember me" cookie lifetime. Must be called before the next
 * getSupabaseBrowserClient() call to take effect, since the client caches its
 * cookie options at creation time.
 */
export function setAuthStoragePersistence(shouldRememberSession: boolean) {
  if (rememberSession !== shouldRememberSession) {
    client = null;
  }
  rememberSession = shouldRememberSession;
}

export function getSupabaseBrowserClient() {
  const { url, key } = getSupabaseEnv();

  // Deliberately no custom `cookieOptions.name` here — @supabase/ssr's
  // default `sb-<project-ref>-auth-token` naming must match exactly what
  // the server client (lib/supabase/server.ts) and middleware
  // (lib/supabase/middleware.ts) read, or the session cookie this client
  // writes becomes invisible to the server and every login silently
  // "succeeds" but bounces straight back to /login.
  client ??= createBrowserClient(url, key, {
    cookieOptions: {
      sameSite: "lax",
      maxAge: rememberSession ? REMEMBER_ME_MAX_AGE : undefined,
    },
  });

  return client;
}
