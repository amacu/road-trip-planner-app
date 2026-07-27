// Usuwa wszystkie dane testowe appki (trips, trip_days, trip_stops,
// vehicles) BEZ usuwania użytkowników ani cen paliwa.
// Użycie: node scripts/reset-test-data.js --yes

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function assertConfirmed() {
  if (!process.argv.includes("--yes")) {
    const dbUrl = process.env.DATABASE_URL ?? "(not set)";
    console.error(
      "This will permanently delete ALL trips and vehicles from:\n" +
        `  ${dbUrl}\n\n` +
        "Re-run with --yes to confirm, e.g.:\n" +
        "  node scripts/reset-test-data.js --yes",
    );
    process.exit(1);
  }
}

async function main() {
  assertConfirmed();

  // Kolejność ważna: Trip i Vehicle kasują kaskadowo powiązane rekordy
  // (dni, przystanki) dzięki onDelete: Cascade w schema.prisma.
  const trips = await prisma.trip.deleteMany();
  const vehicles = await prisma.vehicle.deleteMany();

  console.log(`Usunięto ${trips.count} tripów (wraz z dniami/przystankami).`);
  console.log(`Usunięto ${vehicles.count} pojazdów.`);
  console.log("Użytkownicy i tabela fuel_prices pozostały nietknięte.");
}

main()
  .catch((err) => {
    console.error("Błąd podczas czyszczenia danych:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
