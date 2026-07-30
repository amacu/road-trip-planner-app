import type { User } from "@supabase/supabase-js";

import { withDatabaseRetry } from "@/lib/db/retry";
import { prisma } from "@/lib/prisma";

export async function ensureUserProfile(user: User) {
  const email = user.email?.trim().toLowerCase();
  if (!email) return null;

  return withDatabaseRetry(async () => {
    const metadata = user.user_metadata ?? {};
    const fullName =
      typeof metadata.full_name === "string" ? metadata.full_name.trim() : null;
    const metadataUsername =
      typeof metadata.username === "string" ? metadata.username.trim() : null;
    const existing = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { username: true },
    });
    const desiredUsername = metadataUsername
      ? normalizeUsername(metadataUsername)
      : null;
    const usernameTaken =
      desiredUsername && desiredUsername !== existing?.username
        ? await prisma.userProfile.findUnique({
            where: { username: desiredUsername },
            select: { userId: true },
          })
        : null;
    const username =
      desiredUsername && (!usernameTaken || usernameTaken.userId === user.id)
        ? desiredUsername
        : existing?.username;

    return prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {
        email,
        fullName,
        username,
      },
      create: {
        userId: user.id,
        email,
        fullName,
        username: username ?? (await makeUniqueUsername(email)),
      },
    });
  });
}

export async function findUserProfileByIdentifier(identifier: string) {
  const value = identifier.trim();
  if (!value) return null;

  return prisma.userProfile.findFirst({
    where: {
      OR: [
        { email: { equals: value.toLowerCase(), mode: "insensitive" } },
        { username: { equals: normalizeUsername(value), mode: "insensitive" } },
        { fullName: { equals: value, mode: "insensitive" } },
      ],
    },
  });
}

export async function getUserProfileByUserId(userId: string) {
  return prisma.userProfile.findUnique({ where: { userId } });
}

async function makeUniqueUsername(email: string) {
  const base = normalizeUsername(email.split("@")[0] || "traveler");
  const existing = await prisma.userProfile.findMany({
    where: { username: { startsWith: base } },
    select: { username: true },
  });
  const taken = new Set(
    existing.flatMap(({ username }) => (username ? [username] : [])),
  );
  if (!taken.has(base)) return base;

  for (let suffix = 2; ; suffix += 1) {
    const suffixText = String(suffix);
    const candidate = `${base.slice(0, 32 - suffixText.length)}${suffixText}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export function normalizeUsername(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/^@/, "")
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32) || "traveler"
  );
}
