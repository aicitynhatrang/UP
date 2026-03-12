'use client'

import { useProvider } from '@/lib/provider-context'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { fetchProviderServices } from '@/lib/queries/provider'

export function ServicesContent() {
  const provider = useProvider()
  const t = useTranslations('site')
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProviderServices(provider.id)
      .then(res => setServices(res.data ?? []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false))
  }, [provider.id])

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">{t('our_services')}</h1>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse bg-gray-100 rounded-xl" />)}
        </div>
      ) : services.length === 0 ? (
        <p className="text-gray-500 text-center py-12">{t('no_services')}</p>
      ) : (
        <div className="space-y-4">
          {services.map((service: any) => (
            <div key={service.id} className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold">{service.name}</h3>
                {service.description && (
                  <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                )}
                {service.duration_min && (
                  <p className="text-xs text-gray-400 mt-1">{service.duration_min} {t('minutes')}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-brand-600">
                  {service.price?.toLocaleString()} ₫
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
