"use server";

import { getCachedFuelPriceCountries } from "@/lib/db/fuel-prices";
import { requireUser } from "@/lib/auth/guards";
import type { FuelCountryPrice } from "@/lib/integrations/fuel-prices";

export async function getFuelPriceCountriesAction(): Promise<
  FuelCountryPrice[]
> {
  await requireUser();
  return getCachedFuelPriceCountries();
}
