export type WeatherSource = "forecast" | "historical_typical";

export type StopWeather = {
  source: WeatherSource;
  weatherCode: number;
  temperatureC: number;
  temperatureMinC?: number;
  temperatureMaxC?: number;
  feelsLikeC: number;
  feelsLikeMinC?: number;
  feelsLikeMaxC?: number;
  rainProbabilityPercent: number;
  windSpeedKmh: number;
};
