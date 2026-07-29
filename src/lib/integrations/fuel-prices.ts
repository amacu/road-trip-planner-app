export type FuelTypeKey = "petrol95" | "diesel" | "lpg";

export type FuelCountryPrice = {
  code: string;
  country: string;
  pricesPlnPerLiter: Record<FuelTypeKey, number | null>;
  aliases: string[];
};

export function getFuelCountryByName(
  prices: FuelCountryPrice[],
  country: string,
) {
  return prices.find((entry) => entry.country === country);
}

export function getFuelCountryFromText(
  prices: FuelCountryPrice[],
  text: string,
) {
  const normalized = text.toLowerCase();
  return prices.find((entry) =>
    [entry.country, entry.code, ...entry.aliases].some((token) =>
      normalized.includes(token.toLowerCase()),
    ),
  );
}
