'use client'

import { useProviders } from '@/lib/queries/providers'
import { ProviderCard } from '@/components/catalog/ProviderCard'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useLocale } from 'next-intl'

export function FeaturedProviders() {
  const { data, isLoading } = useProviders({ sort: 'rating', limit: 6, page: 1 })
  const t = useTranslations('home')
  const locale = useLocale()

  if (isLoading) return <div className="h-48 animate-pulse bg-gray-100 rounded-xl" />

  const providers = data?.data ?? []
  if (!providers.length) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('featured')}</h2>
        <Link href={`/${locale}/catalog`} className="text-brand-500 text-sm font-medium hover:underline">
          {t('see_all')}
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((p: any) => (
          <ProviderCard key={p.id} provider={p} />
        ))}
      </div>
    </section>
  )
}
