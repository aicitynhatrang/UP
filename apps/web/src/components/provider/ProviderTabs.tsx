'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useLocaleUtils } from '@/hooks/useLocaleUtils'
import { useProviderServices, useProviderReviews } from '@/lib/queries/providers'
import { WorkingHours } from './WorkingHours'
import { ReviewsList } from './ReviewsList'
import { ServicesList } from './ServicesList'
import { cn } from '@/lib/utils'
import type { Provider } from '@/lib/types'

interface Props {
  provider: Provider
}

type Tab = 'about' | 'services' | 'reviews'

export function ProviderTabs({ provider }: Props) {
  const tp         = useTranslations('provider')
  const [tab, set] = useState<Tab>('about')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'about',    label: tp('about') },
    { key: 'services', label: tp('services') },
    { key: 'reviews',  label: `${tp('reviews')} (${provider.review_count})` },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-100 mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => set(t.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px',
              tab === t.key
                ? 'text-brand-600 border-b-2 border-brand-500'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'about'    && <AboutTab provider={provider} />}
      {tab === 'services' && <ServicesTab providerId={provider.id} />}
      {tab === 'reviews'  && <ReviewsTab providerId={provider.id} />}
    </div>
  )
}

// ── About ─────────────────────────────────────────────────────────────────────

function AboutTab({ provider }: { provider: Provider }) {
  const tp    = useTranslations('provider')
  const { t } = useLocaleUtils()

  const description = t(provider.description)

  return (
    <div className="space-y-6">
      {description && (
        <div>
          <h3 className="font-semibold mb-2">{tp('about')}</h3>
          <p className="text-gray-700 whitespace-pre-line">{description}</p>
        </div>
      )}

      {/* Working hours */}
      {Object.keys(provider.working_hours).length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">{tp('working_hours')}</h3>
          <WorkingHours hours={provider.working_hours} />
        </div>
      )}

      {/* Tags */}
      {provider.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {provider.tags.map(tag => (
            <span key={tag} className="badge bg-gray-100 text-gray-600">#{tag}</span>
          ))}
        </div>
      )}

      {/* Amenities */}
      {provider.amenities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {provider.amenities.map(a => (
            <span key={a} className="badge bg-green-50 text-green-700">{a}</span>
          ))}
        </div>
      )}

      {/* Photos grid */}
      {provider.photos.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">{tp('photos')}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {provider.photos.map((url, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Services ──────────────────────────────────────────────────────────────────

function ServicesTab({ providerId }: { providerId: string }) {
  const { data, isLoading } = useProviderServices(providerId)

  return <ServicesList services={data ?? []} isLoading={isLoading} />
}

// ── Reviews ───────────────────────────────────────────────────────────────────

function ReviewsTab({ providerId }: { providerId: string }) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useProviderReviews(providerId, page)

  return (
    <ReviewsList
      reviews={data?.data ?? []}
      total={data?.total ?? 0}
      page={page}
      totalPages={data?.totalPages ?? 1}
      isLoading={isLoading}
      onPageChange={setPage}
    />
  )
}
