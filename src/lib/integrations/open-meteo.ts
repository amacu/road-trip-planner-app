import type { StopWeather } from "@/lib/weather";

type OpenMeteoResponse = {
  hourly?: {
    time?: string[];
    temperature_2m?: Array<number | null>;
    apparent_temperature?: Array<number | null>;
    precipitation_probability?: Array<number | null>;
    precipitation?: Array<number | null>;
    weather_code?: Array<number | null>;
    wind_speed_10m?: Array<number | null>;
  };
  daily?: {
    weather_code?: Array<number | null>;
  };
};

const FORECAST_CACHE_SECONDS = 30 * 60;
const TYPICAL_CACHE_SECONDS = 7 * 24 * 60 * 60;

function finite(value: number | null | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function closestHourIndex(times: string[] | undefined, hour: number) {
  if (!times?.length) return 0;
  let best = 0;
  let distance = Infinity;
  times.forEach((time, index) => {
    const candidateHour = Number(time.slice(11, 13));
    const nextDistance = Math.abs(candidateHour - hour);
    if (nextDistance < distance) {
      best = index;
      distance = nextDistance;
    }
  });
  return best;
}

function visitHourIndexes(
  times: string[] | undefined,
  startTime: string,
  endTime?: string,
) {
  const startHour = Math.min(
    23,
    Math.max(0, Number(startTime.slice(0, 2)) || 0),
  );
  if (!endTime) return [closestHourIndex(times, startHour)];

  const endHour = Math.min(23, Math.max(0, Number(endTime.slice(0, 2)) || 0));
  // A departure earlier than arrival denotes an overnight stay. This endpoint
  // only fetches one calendar day, so include the remaining hours of this day.
  const lastHour = endHour < startHour ? 23 : endHour;
  const indexes = (times ?? []).flatMap((time, index) => {
    const hour = Number(time.slice(11, 13));
    return hour >= startHour && hour <= lastHour ? [index] : [];
  });
  return indexes.length ? indexes : [closestHourIndex(times, startHour)];
}

function valuesAt(values: Array<number | null> | undefined, indexes: number[]) {
  return indexes.map((index) => finite(values?.[index]));
}

async function openMeteo(url: URL, revalidate: number) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
  return (await response.json()) as OpenMeteoResponse;
}

function forecastAvailable(date: string) {
  const today = new Date();
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const target = new Date(`${date}T00:00:00Z`);
  const days = Math.round((target.getTime() - start.getTime()) / 86_400_000);
  return days >= 0 && days <= 15;
}

async function getForecast(
  lat: number,
  lng: number,
  date: string,
  startTime: string,
  endTime?: string,
): Promise<StopWeather> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    start_date: date,
    end_date: date,
    timezone: "auto",
    hourly:
      "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m",
    daily: "weather_code",
  }).toString();
  const data = await openMeteo(url, FORECAST_CACHE_SECONDS);
  const indexes = visitHourIndexes(data.hourly?.time, startTime, endTime);
  const temperatures = valuesAt(data.hourly?.temperature_2m, indexes);
  const feelsLike = valuesAt(data.hourly?.apparent_temperature, indexes);
  const rain = valuesAt(data.hourly?.precipitation_probability, indexes);
  const wind = valuesAt(data.hourly?.wind_speed_10m, indexes);
  const codes = valuesAt(data.hourly?.weather_code, indexes);
  return {
    source: "forecast",
    weatherCode: codes.length
      ? mode(codes)
      : finite(data.daily?.weather_code?.[0]),
    temperatureC: average(temperatures),
    temperatureMinC: Math.min(...temperatures),
    temperatureMaxC: Math.max(...temperatures),
    feelsLikeC: average(feelsLike),
    feelsLikeMinC: Math.min(...feelsLike),
    feelsLikeMaxC: Math.max(...feelsLike),
    rainProbabilityPercent: Math.max(...rain),
    windSpeedKmh: Math.max(...wind),
  };
}

function historicalDate(year: number, monthDay: string) {
  const candidate = `${year}-${monthDay}`;
  const parsed = new Date(`${candidate}T00:00:00Z`);
  return parsed.toISOString().slice(0, 10) === candidate ? candidate : null;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function mode(values: number[]) {
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return values.reduce(
    (best, value) =>
      (counts.get(value) ?? 0) > (counts.get(best) ?? 0) ? value : best,
    values[0] ?? 0,
  );
}

async function getHistoricalTypical(
  lat: number,
  lng: number,
  date: string,
  startTime: string,
  endTime?: string,
): Promise<StopWeather> {
  const monthDay = date.slice(5);
  const latestYear = new Date().getUTCFullYear() - 1;
  const dates = Array.from({ length: 5 }, (_, index) =>
    historicalDate(latestYear - index, monthDay),
  ).filter((value): value is string => Boolean(value));
  const samples = await Promise.allSettled(
    dates.map(async (sampleDate) => {
      const url = new URL("https://archive-api.open-meteo.com/v1/archive");
      url.search = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        start_date: sampleDate,
        end_date: sampleDate,
        timezone: "auto",
        hourly:
          "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
        daily: "weather_code",
      }).toString();
      const data = await openMeteo(url, TYPICAL_CACHE_SECONDS);
      const indexes = visitHourIndexes(data.hourly?.time, startTime, endTime);
      const temperatures = valuesAt(data.hourly?.temperature_2m, indexes);
      const feels = valuesAt(data.hourly?.apparent_temperature, indexes);
      const precipitation = valuesAt(data.hourly?.precipitation, indexes);
      const wind = valuesAt(data.hourly?.wind_speed_10m, indexes);
      return {
        code: mode(valuesAt(data.hourly?.weather_code, indexes)),
        temperature: average(temperatures),
        temperatureMin: Math.min(...temperatures),
        temperatureMax: Math.max(...temperatures),
        feels: average(feels),
        feelsMin: Math.min(...feels),
        feelsMax: Math.max(...feels),
        rainy: precipitation.some((value) => value >= 0.1),
        wind: Math.max(...wind),
      };
    }),
  );
  const valid = samples.flatMap((sample) =>
    sample.status === "fulfilled" ? [sample.value] : [],
  );
  if (!valid.length) throw new Error("No historical weather samples available");
  return {
    source: "historical_typical",
    weatherCode: mode(valid.map((sample) => sample.code)),
    temperatureC: average(valid.map((sample) => sample.temperature)),
    temperatureMinC: average(valid.map((sample) => sample.temperatureMin)),
    temperatureMaxC: average(valid.map((sample) => sample.temperatureMax)),
    feelsLikeC: average(valid.map((sample) => sample.feels)),
    feelsLikeMinC: average(valid.map((sample) => sample.feelsMin)),
    feelsLikeMaxC: average(valid.map((sample) => sample.feelsMax)),
    rainProbabilityPercent:
      (valid.filter((sample) => sample.rainy).length / valid.length) * 100,
    windSpeedKmh: average(valid.map((sample) => sample.wind)),
  };
}

export async function getStopWeather(
  lat: number,
  lng: number,
  date: string,
  time: string,
  endTime?: string,
) {
  return forecastAvailable(date)
    ? getForecast(lat, lng, date, time, endTime)
    : getHistoricalTypical(lat, lng, date, time, endTime);
}
