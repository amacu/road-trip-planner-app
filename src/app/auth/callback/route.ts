import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/db/user-profiles";

/**
 * Only allow same-origin, relative redirect targets. `next` comes from a
 * query param an attacker fully controls, so accepting an absolute or
 * protocol-relative URL here would make this endpoint an open redirect.
 */
function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) await ensureUserProfile(user);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
