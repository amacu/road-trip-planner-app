"use client";

import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  Loader2,
  Sun,
  Wind,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { StopWeather } from "@/lib/weather";

function WeatherIcon({ code }: { code: number }) {
  const className = "size-7 text-[#E79021]";
  if (code === 0) return <Sun className={className} />;
  if ([1, 2, 3].includes(code)) return <Cloud className={className} />;
  if ([45, 48].includes(code)) return <CloudFog className={className} />;
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return <CloudSnow className={className} />;
  if ([95, 96, 99].includes(code))
    return <CloudLightning className={className} />;
  return <CloudRain className={className} />;
}

function rounded(value: number) {
  return Math.round(value);
}

export function StopWeatherBox({
  lat,
  lng,
  date,
  time,
  endTime,
}: {
  lat: number;
  lng: number;
  date: string;
  time: string;
  endTime?: string | null;
}) {
  const [weather, setWeather] = useState<StopWeather | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setWeather(null);
    setUnavailable(false);
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      date,
      time,
    });
    if (endTime && endTime !== time) params.set("endTime", endTime);
    fetch(`/api/weather?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Weather unavailable");
        return (await response.json()) as { weather: StopWeather };
      })
      .then(({ weather: nextWeather }) => setWeather(nextWeather))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setUnavailable(true);
      });
    return () => controller.abort();
  }, [date, endTime, lat, lng, time]);

  const range = (
    min: number | undefined,
    max: number | undefined,
    fallback: number,
  ) => {
    const roundedMin = rounded(min ?? fallback);
    const roundedMax = rounded(max ?? fallback);
    return roundedMin === roundedMax
      ? `${roundedMin}°C`
      : `${roundedMin}–${roundedMax}°C`;
  };

  return (
    <div
      className="mt-2.5 overflow-hidden rounded-[13px] border border-[#DED3C0]/75 bg-white/20 p-2.5"
      data-weather-source={weather?.source}
      title={
        weather?.source === "historical_typical"
          ? "Typical historical weather for this date"
          : "Weather forecast for the planned visit"
      }
    >
      {unavailable ? (
        <div className="flex h-10 items-center justify-center text-[10px] font-semibold text-[#948B76]">
          Weather temporarily unavailable
        </div>
      ) : !weather ? (
        <div
          className="flex h-10 items-center justify-center text-[#A09888]"
          aria-label="Loading weather"
        >
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid min-w-0 grid-cols-3">
            <WeatherMetric
              icon={<WeatherIcon code={weather.weatherCode} />}
              value={range(
                weather.temperatureMinC,
                weather.temperatureMaxC,
                weather.temperatureC,
              )}
              label={`Feels ${range(weather.feelsLikeMinC, weather.feelsLikeMaxC, weather.feelsLikeC)}`}
            />
            <WeatherMetric
              icon={<Droplets className="size-7 text-[#378CDD]" />}
              value={`${rounded(weather.rainProbabilityPercent)}%`}
              label="Rain chance"
            />
            <WeatherMetric
              icon={<Wind className="size-7 text-[#378CDD]" />}
              value={`${rounded(weather.windSpeedKmh)} km/h`}
              label="Wind"
              bordered={false}
            />
          </div>
          {weather.source === "historical_typical" && (
            <p className="mt-1 text-center text-[8px] font-medium leading-none tracking-[0.02em] text-[#A09888]">
              Typical weather based on historical data
            </p>
          )}
        </>
      )}
    </div>
  );
}

function WeatherMetric({
  icon,
  value,
  label,
  bordered = true,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={`flex min-h-10 min-w-0 items-center gap-1.5 overflow-hidden px-1 sm:gap-2 sm:px-2.5 ${bordered ? "border-r border-[#DED3C0]/75" : ""}`}
    >
      <span className="grid size-8 shrink-0 place-items-center">{icon}</span>
      <div className="min-w-0 overflow-hidden leading-none">
        <p className="truncate text-[12px] font-bold leading-[1.15] text-[#16130D] sm:text-[13px]">
          {value}
        </p>
        <p className="mt-1 truncate text-[9.5px] leading-[1.15] text-[#7A7264] sm:text-[10px]">
          {label}
        </p>
      </div>
    </div>
  );
}
