'use client'

import { useTranslations } from 'next-intl'
import { ProviderCard } from './ProviderCard'
import type { Provider } from '@/lib/types'

interface Props {
  providers: Provider[]
  total:     number
  isLoading: boolean
}

export function ProviderList({ providers, total, isLoading }: Props) {
  const t  = useTranslations('catalog')
  const tc = useTranslations('common')

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="aspect-[16/10] bg-gray-200" />
            <div className="p-3.5 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!providers.length) {
    return (
      <div className="text-center py-16">
        <p className="text-5xl mb-4">🔍</p>
        <p className="text-lg font-medium text-gray-700">{t('no_providers')}</p>
        <p className="text-sm text-gray-500 mt-1">{t('no_providers_hint')}</p>
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-gray-500 mb-4">{t('results_count', { count: total })}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map(p => (
          <ProviderCard key={p.id} provider={p} />
        ))}
      </div>
    </>
  )
}
