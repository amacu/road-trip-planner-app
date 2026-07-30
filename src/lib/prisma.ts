import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getRuntimeDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) return undefined;

  try {
    const url = new URL(value);
    const isSupabasePooler = url.hostname.endsWith(".pooler.supabase.com");

    if (isSupabasePooler && url.port === "5432") {
      url.port = "6543";
      url.searchParams.set("pgbouncer", "true");
    }

    // Serverless instances should never reserve Prisma's default-sized pool.
    // PgBouncer multiplexes these single connections across database sessions.
    url.searchParams.set("connection_limit", "1");
    url.searchParams.set("pool_timeout", "10");
    return url.toString();
  } catch {
    return value;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: getRuntimeDatabaseUrl(),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
