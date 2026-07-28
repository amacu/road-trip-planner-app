import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import type {
  FuelCountryPrice,
  FuelTypeKey,
} from "@/lib/integrations/fuel-prices";

const FUEL_TYPE_MAP: Record<string, FuelTypeKey | undefined> = {
  petrol95: "petrol95",
  petrol: "petrol95",
  gasoline: "petrol95",
  diesel: "diesel",
  lpg: "lpg",
};

export type FuelPriceUpsertData = {
  countryCode: string;
  countryName: string;
  fuelType: string;
  pricePlnPerL: number;
  source?: string;
};

export async function getFuelPrices() {
  return prisma.fuelPrice.findMany({
    orderBy: [{ countryName: "asc" }, { fuelType: "asc" }],
  });
}

export const getCachedFuelPriceCountries = unstable_cache(
  async (): Promise<FuelCountryPrice[]> => {
    const rows = await getFuelPrices();
    const countries = new Map<string, FuelCountryPrice>();

    for (const row of rows) {
      const fuelType = FUEL_TYPE_MAP[row.fuelType];
      if (!fuelType) continue;
      const code = row.countryCode.toUpperCase();
      const existing =
        countries.get(code) ??
        ({
          code,
          country: row.countryName,
          aliases: [row.countryName.toLowerCase(), code.toLowerCase()],
          pricesPlnPerLiter: { petrol95: null, diesel: null, lpg: null },
        } satisfies FuelCountryPrice);
      existing.pricesPlnPerLiter[fuelType] = row.pricePlnPerL.toNumber();
      countries.set(code, existing);
    }

    return [...countries.values()].sort((a, b) =>
      a.country.localeCompare(b.country),
    );
  },
  ["fuel-price-countries"],
  { revalidate: 3600, tags: ["fuel-prices"] },
);

export async function getFuelPrice(countryCode: string, fuelType: string) {
  return prisma.fuelPrice.findUnique({
    where: {
      countryCode_fuelType: {
        countryCode,
        fuelType,
      },
    },
  });
}

export async function upsertFuelPrice(data: FuelPriceUpsertData) {
  return prisma.fuelPrice.upsert({
    where: {
      countryCode_fuelType: {
        countryCode: data.countryCode.toUpperCase(),
        fuelType: data.fuelType,
      },
    },
    create: {
      countryCode: data.countryCode.toUpperCase(),
      countryName: data.countryName,
      fuelType: data.fuelType,
      pricePlnPerL: new Prisma.Decimal(data.pricePlnPerL),
      source: data.source ?? "manual",
    },
    update: {
      countryName: data.countryName,
      pricePlnPerL: new Prisma.Decimal(data.pricePlnPerL),
      source: data.source ?? "manual",
    },
  });
}
