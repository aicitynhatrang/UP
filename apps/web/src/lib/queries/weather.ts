'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useWeather() {
  return useQuery({
    queryKey: ['weather'],
    queryFn: () => api.get<{ ok: boolean; data: any }>('/api/v1/weather'),
    staleTime: 5 * 60 * 1000, // 5 min
    refetchInterval: 10 * 60 * 1000, // 10 min
  })
}

export function useWeatherForecast() {
  return useQuery({
    queryKey: ['weather-forecast'],
    queryFn: () => api.get<{ ok: boolean; data: any }>('/api/v1/weather/forecast'),
    staleTime: 30 * 60 * 1000,
  })
}

export function useWeatherAlerts() {
  return useQuery({
    queryKey: ['weather-alerts'],
    queryFn: () => api.get<{ ok: boolean; data: any[] }>('/api/v1/weather/alerts'),
    staleTime: 5 * 60 * 1000,
  })
}
