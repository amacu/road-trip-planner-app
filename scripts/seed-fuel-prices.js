// Wypełnia tabelę fuel_prices przybliżonymi cenami paliw (PLN/L) dla
// wszystkich 27 krajów UE. Ceny są orientacyjne (rząd wielkości zgodny z
// realiami 2026), nie pochodzą z aktualnego API — użyj do testów, nie do
// produkcyjnych wyliczeń finansowych.
// Użycie: node scripts/seed-fuel-prices.js

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// petrol95 / diesel / lpg w PLN za litr (przybliżone, orientacyjne).
const EU_FUEL_PRICES = [
  { code: "AT", name: "Austria", petrol95: 6.9, diesel: 6.7, lpg: 3.4 },
  { code: "BE", name: "Belgium", petrol95: 7.4, diesel: 7.1, lpg: 3.7 },
  { code: "BG", name: "Bulgaria", petrol95: 5.4, diesel: 5.6, lpg: 3.0 },
  { code: "HR", name: "Croatia", petrol95: 6.3, diesel: 6.2, lpg: 3.3 },
  { code: "CY", name: "Cyprus", petrol95: 6.5, diesel: 6.4, lpg: null },
  { code: "CZ", name: "Czechia", petrol95: 6.1, diesel: 6.0, lpg: 3.1 },
  { code: "DK", name: "Denmark", petrol95: 8.2, diesel: 7.6, lpg: null },
  { code: "EE", name: "Estonia", petrol95: 6.5, diesel: 6.4, lpg: 3.2 },
  { code: "FI", name: "Finland", petrol95: 7.7, diesel: 7.3, lpg: null },
  { code: "FR", name: "France", petrol95: 7.5, diesel: 7.2, lpg: 3.9 },
  { code: "DE", name: "Germany", petrol95: 7.3, diesel: 7.0, lpg: 3.6 },
  { code: "GR", name: "Greece", petrol95: 7.8, diesel: 6.9, lpg: 4.0 },
  { code: "HU", name: "Hungary", petrol95: 6.4, diesel: 6.5, lpg: 3.3 },
  { code: "IE", name: "Ireland", petrol95: 7.5, diesel: 7.2, lpg: null },
  { code: "IT", name: "Italy", petrol95: 8.0, diesel: 7.6, lpg: 3.8 },
  { code: "LV", name: "Latvia", petrol95: 6.5, diesel: 6.4, lpg: 3.1 },
  { code: "LT", name: "Lithuania", petrol95: 6.3, diesel: 6.2, lpg: 3.0 },
  { code: "LU", name: "Luxembourg", petrol95: 6.6, diesel: 6.3, lpg: 3.4 },
  { code: "MT", name: "Malta", petrol95: 6.2, diesel: 6.0, lpg: null },
  { code: "NL", name: "Netherlands", petrol95: 8.5, diesel: 7.4, lpg: 3.9 },
  { code: "PL", name: "Poland", petrol95: 6.2, diesel: 6.3, lpg: 2.9 },
  { code: "PT", name: "Portugal", petrol95: 7.6, diesel: 7.0, lpg: 3.7 },
  { code: "RO", name: "Romania", petrol95: 6.0, diesel: 6.1, lpg: 3.0 },
  { code: "SK", name: "Slovakia", petrol95: 6.3, diesel: 6.4, lpg: 3.2 },
  { code: "SI", name: "Slovenia", petrol95: 6.4, diesel: 6.3, lpg: 3.3 },
  { code: "ES", name: "Spain", petrol95: 6.9, diesel: 6.6, lpg: 3.5 },
  { code: "SE", name: "Sweden", petrol95: 7.9, diesel: 7.7, lpg: null },
];

async function main() {
  let count = 0;

  for (const country of EU_FUEL_PRICES) {
    const entries = [
      ["petrol95", country.petrol95],
      ["diesel", country.diesel],
      ["lpg", country.lpg],
    ].filter(([, price]) => price !== null);

    for (const [fuelType, pricePlnPerL] of entries) {
      await prisma.fuelPrice.upsert({
        where: {
          countryCode_fuelType: { countryCode: country.code, fuelType },
        },
        create: {
          countryCode: country.code,
          countryName: country.name,
          fuelType,
          pricePlnPerL: new Prisma.Decimal(pricePlnPerL),
          source: "seed-approx",
        },
        update: {
          countryName: country.name,
          pricePlnPerL: new Prisma.Decimal(pricePlnPerL),
          source: "seed-approx",
        },
      });
      count++;
    }
  }

  console.log(
    `Gotowe: ${count} wpisów cen paliw dla ${EU_FUEL_PRICES.length} krajów UE.`,
  );
}

main()
  .catch((err) => {
    console.error("Błąd podczas seedowania cen paliw:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
