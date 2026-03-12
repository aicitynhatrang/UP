'use client'

import { useState } from 'react'
import { useFlashDeals } from '@/lib/queries/gamification'
import { FlashDealCard } from '@/components/gamification/FlashDealCard'
import { useTranslations } from 'next-intl'

export default function DealsPage() {
  const t = useTranslations('deals')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useFlashDeals(page)
  const deals = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <p className="text-gray-500 text-center py-12">{t('no_deals')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {deals.map((deal: any) => (
              <FlashDealCard key={deal.id} deal={deal} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-1 rounded text-sm ${
                    page === i + 1 ? 'bg-brand-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}
