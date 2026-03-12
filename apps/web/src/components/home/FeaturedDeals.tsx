'use client'

import { useFlashDeals } from '@/lib/queries/gamification'
import { FlashDealCard } from '@/components/gamification/FlashDealCard'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export function FeaturedDeals() {
  const { data, isLoading } = useFlashDeals()
  const t = useTranslations('home')

  if (isLoading) return <div className="h-32 animate-pulse bg-gray-100 rounded-xl" />

  const deals = data?.data?.slice(0, 4) ?? []
  if (!deals.length) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('flash_deals')}</h2>
        <Link href="/deals" className="text-brand-500 text-sm font-medium hover:underline">
          {t('see_all')}
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {deals.map((deal: any) => (
          <FlashDealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </section>
  )
}
