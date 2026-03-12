'use client'

import { useWeather } from '@/lib/queries/weather'
import { useTranslations } from 'next-intl'

export function WeatherWidget() {
  const { data, isLoading } = useWeather()
  const t = useTranslations('home')

  if (isLoading || !data?.data) return null

  const w = data.data
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-xl text-sm">
      <span className="text-2xl">🌤</span>
      <div>
        <span className="font-semibold">{Math.round(w.temp)}°C</span>
        <span className="text-gray-500 ml-2">{w.description}</span>
      </div>
      <div className="ml-auto text-gray-400 text-xs">
        💧 {w.humidity}% &nbsp; 💨 {w.windSpeed} m/s
      </div>
    </div>
  )
}
