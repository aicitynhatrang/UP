import { AppError } from '../../utils/errors.js'

export class WeatherService {
  #redis
  #integrationsConfig
  #logger

  constructor({ redis, integrationsConfig, logger }) {
    this.#redis = redis
    this.#integrationsConfig = integrationsConfig
    this.#logger = logger
  }

  /** Get current weather (cached in Redis for 30 min) */
  async getCurrent() {
    const cacheKey = 'weather:current'
    const cached = await this.#redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const data = await this.#fetchWeather()
    await this.#redis.setex(cacheKey, 1800, JSON.stringify(data))
    return data
  }

  /** Get 5-day forecast (cached in Redis for 1 hour) */
  async getForecast() {
    const cacheKey = 'weather:forecast'
    const cached = await this.#redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const cfg = this.#integrationsConfig.weather
    const url = `${cfg.baseUrl}/forecast?lat=${cfg.defaultLat}&lon=${cfg.defaultLng}&appid=${cfg.apiKey}&units=metric&lang=vi`

    const response = await fetch(url)
    if (!response.ok) throw new AppError('WEATHER_API_ERROR', 502, 'Failed to fetch forecast')

    const raw = await response.json()
    const data = {
      city: raw.city?.name ?? 'Nha Trang',
      forecast: (raw.list ?? []).map((item) => ({
        dt: item.dt,
        temp: item.main.temp,
        feelsLike: item.main.feels_like,
        humidity: item.main.humidity,
        description: item.weather?.[0]?.description,
        icon: item.weather?.[0]?.icon,
        windSpeed: item.wind?.speed,
        pop: item.pop,
      })),
      fetchedAt: new Date().toISOString(),
    }

    await this.#redis.setex(cacheKey, 3600, JSON.stringify(data))
    return data
  }

  /** Check for weather alerts (called by cron) */
  async checkAlerts() {
    const current = await this.getCurrent()
    const cfg = this.#integrationsConfig.weather
    const alerts = []

    if (current.temp >= cfg.hotThresholdC) {
      alerts.push({ type: 'heat', message: `Heat alert: ${current.temp}°C in Nha Trang` })
    }

    if (current.description?.includes('rain') || current.description?.includes('mưa')) {
      alerts.push({ type: 'rain', message: `Rain alert in Nha Trang` })
    }

    if (alerts.length) {
      await this.#redis.setex('weather:alerts', 3600, JSON.stringify(alerts))
      this.#logger.info({ alerts }, 'Weather: alerts detected')
    }

    return alerts
  }

  /** Get cached alerts */
  async getAlerts() {
    const cached = await this.#redis.get('weather:alerts')
    return cached ? JSON.parse(cached) : []
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  async #fetchWeather() {
    const cfg = this.#integrationsConfig.weather
    const url = `${cfg.baseUrl}/weather?lat=${cfg.defaultLat}&lon=${cfg.defaultLng}&appid=${cfg.apiKey}&units=metric&lang=vi`

    const response = await fetch(url)
    if (!response.ok) {
      this.#logger.error({ status: response.status }, 'Weather: API error')
      throw new AppError('WEATHER_API_ERROR', 502, 'Failed to fetch weather')
    }

    const raw = await response.json()
    return {
      temp: raw.main.temp,
      feelsLike: raw.main.feels_like,
      humidity: raw.main.humidity,
      description: raw.weather?.[0]?.description,
      icon: raw.weather?.[0]?.icon,
      windSpeed: raw.wind?.speed,
      sunrise: raw.sys?.sunrise,
      sunset: raw.sys?.sunset,
      fetchedAt: new Date().toISOString(),
    }
  }
}
