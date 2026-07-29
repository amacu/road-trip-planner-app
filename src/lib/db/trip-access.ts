import type { Prisma } from "@prisma/client";

export function tripAccessWhere(userId: string): Prisma.TripWhereInput {
  return {
    OR: [{ userId }, { members: { some: { userId } } }],
  };
}

export function tripWriteAccessWhere(userId: string): Prisma.TripWhereInput {
  return {
    OR: [{ userId }, { members: { some: { userId, role: "editor" } } }],
  };
}
