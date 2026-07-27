"use server";

import { getFuelPrices } from "@/lib/db/fuel-prices";
import { requireUser } from "@/lib/auth/guards";
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

export async function getFuelPriceCountriesAction(): Promise<
  FuelCountryPrice[]
> {
  await requireUser();
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
}
