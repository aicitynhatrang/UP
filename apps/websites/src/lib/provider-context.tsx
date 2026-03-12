'use client'

import { createContext, useContext } from 'react'

interface ProviderData {
  id: string
  slug: string
  name: string
  description?: string
  vertical?: string
  logo_url?: string
  cover_url?: string
  photos?: string[]
  address?: string
  phone?: string
  email?: string
  location_lat?: number
  location_lng?: number
  working_hours?: Record<string, { open: string; close: string }>
  avg_rating?: number
  review_count?: number
  tg_channel_username?: string
  google_maps_url?: string
  website_enabled?: boolean
  social_links?: Record<string, string>
}

const ProviderContext = createContext<ProviderData | null>(null)

export function ProviderContextProvider({
  provider,
  children,
}: {
  provider: ProviderData
  children: React.ReactNode
}) {
  return (
    <ProviderContext.Provider value={provider}>
      {children}
    </ProviderContext.Provider>
  )
}

export function useProvider() {
  const ctx = useContext(ProviderContext)
  if (!ctx) throw new Error('useProvider must be used within ProviderContextProvider')
  return ctx
}
