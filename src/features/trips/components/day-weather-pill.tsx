"use client";

import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import type { StopWeather } from "@/lib/weather";
import { cn } from "@/lib/utils";

export type DayWeatherPoint = { lat: number; lng: number; time: string };

function DayWeatherIcon({ code }: { code: number }) {
  const className = "size-3.5 shrink-0";
  if (code === 0) return <Sun className={cn(className, "text-[#E79021]")} />;
  if ([1, 2, 3].includes(code))
    return <Cloud className={cn(className, "text-[#8B877C]")} />;
  if ([45, 48].includes(code))
    return <CloudFog className={cn(className, "text-[#8B877C]")} />;
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return <CloudSnow className={cn(className, "text-[#468FD0]")} />;
  if ([95, 96, 99].includes(code))
    return <CloudLightning className={cn(className, "text-[#7C5CBF]")} />;
  return <CloudRain className={cn(className, "text-[#378CDD]")} />;
}

export const DayWeatherPill = memo(function DayWeatherPill({
  date,
  points,
  active,
}: {
  date: string | null;
  points: DayWeatherPoint[];
  active: boolean;
}) {
  const [weather, setWeather] = useState<StopWeather[]>([]);
  const [shouldLoad, setShouldLoad] = useState(false);
  const pillRef = useRef<HTMLSpanElement>(null);
  const signature = useMemo(() => JSON.stringify(points), [points]);

  useEffect(() => {
    const element = pillRef.current;
    if (!element || shouldLoad) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    const requestPoints = JSON.parse(signature) as DayWeatherPoint[];
    if (!date || !requestPoints.length || !shouldLoad) {
      setWeather([]);
      return;
    }
    const controller = new AbortController();
    fetch("/api/weather/day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        points: requestPoints.map((point) => ({ ...point, date })),
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Weather unavailable");
        return (await response.json()) as { weather: StopWeather[] };
      })
      .then((result) => {
        if (!controller.signal.aborted) setWeather(result.weather);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setWeather([]);
        }
      });
    return () => controller.abort();
  }, [date, shouldLoad, signature]);

  if (!date || !points.length) return null;
  const temperatures = weather.map((item) => Math.round(item.temperatureC));
  const min = temperatures.length ? Math.min(...temperatures) : 0;
  const max = temperatures.length ? Math.max(...temperatures) : 0;
  const code = weather.length
    ? Math.max(...weather.map((item) => item.weatherCode))
    : 0;

  return (
    <span
      ref={pillRef}
      className={cn(
        "ml-auto inline-flex min-w-0 items-center rounded-full font-mono text-[9px] font-bold transition-opacity duration-150 group-hover:opacity-0",
        weather.length ? "h-5 gap-1 px-1.5" : "size-1",
        active ? "bg-white/10 text-[#DDD5C5]" : "bg-[#F0E9DD] text-[#665F54]",
      )}
      title={`Weather across ${weather.length} ${weather.length === 1 ? "stop" : "stops"}`}
    >
      {weather.length > 0 && (
        <>
          <DayWeatherIcon code={code} />
          <span className="truncate">
            {min === max ? `${min}°` : `${min}–${max}°`}
          </span>
        </>
      )}
    </span>
  );
});
