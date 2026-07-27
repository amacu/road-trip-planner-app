"use server";

import { redirect } from "next/navigation";

import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/guards";
import { ensureUserProfile } from "@/lib/db/user-profiles";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/validators/auth";

export async function signOutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateProfileAction(
  input: unknown,
): Promise<ActionResult> {
  await requireUser();
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid profile data.",
    };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: parsed.data.fullName,
      username: parsed.data.username,
      language: parsed.data.language,
      currency: parsed.data.currency,
    },
  });
  if (error || !data.user) {
    return {
      success: false,
      error: error?.message ?? "Could not update profile.",
    };
  }

  try {
    await ensureUserProfile(data.user);
  } catch {
    return {
      success: false,
      error: "That username is already in use.",
    };
  }
  return { success: true, data: undefined };
}
