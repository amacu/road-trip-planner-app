import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Server Component / Route Handler / Server Action Supabase client.
 * Writing cookies only works from Server Actions and Route Handlers; when
 * called from a Server Component render, cookie writes are silently ignored
 * (Next.js restriction) and are instead refreshed by the middleware.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — middleware refreshes the session instead.
        }
      },
    },
  });
}
