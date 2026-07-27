import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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
