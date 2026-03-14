'use client'

import { WeatherWidget } from '@/components/home/WeatherWidget'
import { FeaturedDeals } from '@/components/home/FeaturedDeals'
import { FeaturedProviders } from '@/components/home/FeaturedProviders'
import { UpcomingEvents } from '@/components/home/UpcomingEvents'

export function HomeClient() {
  return (
    <>
      <WeatherWidget />
      <FeaturedDeals />
      <FeaturedProviders />
      <UpcomingEvents />
    </>
  )
}
