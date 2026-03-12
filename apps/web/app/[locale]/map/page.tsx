'use client'

import { useEffect, useRef, useState } from 'react'
import { useProviders } from '@/lib/queries/providers'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'

const NHA_TRANG_CENTER = { lng: 109.1967, lat: 12.2388 }

export default function MapPage() {
  const t = useTranslations('map')
  const locale = useLocale()
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<any>(null)

  const { data } = useProviders({ page: 1, limit: 200 })
  const providers = data?.data ?? []

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) return

    import('mapbox-gl').then(mapboxgl => {
      (mapboxgl as any).accessToken = token

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [NHA_TRANG_CENTER.lng, NHA_TRANG_CENTER.lat],
        zoom: 13,
      })

      map.addControl(new mapboxgl.NavigationControl(), 'top-right')
      map.addControl(
        new mapboxgl.GeolocateControl({ trackUserLocation: true }),
        'top-right',
      )

      map.on('load', () => setMapLoaded(true))
      mapRef.current = map
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !providers.length) return

    import('mapbox-gl').then(mapboxgl => {
      providers.forEach((p: any) => {
        if (!p.lat || !p.lng) return

        const el = document.createElement('div')
        el.className = 'w-8 h-8 bg-brand-500 rounded-full border-2 border-white shadow-md cursor-pointer flex items-center justify-center text-white text-xs font-bold'
        el.textContent = p.emoji || '📍'

        const marker = new mapboxgl.Marker(el)
          .setLngLat([p.lng, p.lat])
          .addTo(mapRef.current!)

        el.addEventListener('click', () => setSelectedProvider(p))
      })
    })
  }, [mapLoaded, providers])

  return (
    <main className="relative h-[calc(100vh-4rem)]">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Search overlay */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <input
          type="text"
          placeholder={t('search_placeholder')}
          className="w-full max-w-md px-4 py-3 bg-white rounded-xl shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Selected provider card */}
      {selectedProvider && (
        <div className="absolute bottom-20 left-4 right-4 z-10 max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-sm">{selectedProvider.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{selectedProvider.vertical}</p>
                {selectedProvider.avg_rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-yellow-500 text-xs">★</span>
                    <span className="text-xs font-medium">{selectedProvider.avg_rating}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedProvider(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </button>
            </div>
            <Link
              href={`/${locale}/catalog/${selectedProvider.vertical}/${selectedProvider.slug}`}
              className="mt-3 block text-center px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
            >
              {t('view_details')}
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
