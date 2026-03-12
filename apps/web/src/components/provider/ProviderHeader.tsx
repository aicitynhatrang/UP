'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useLocaleUtils } from '@/hooks/useLocaleUtils'
import type { Provider } from '@/lib/types'

interface Props {
  provider: Provider
}

export function ProviderHeader({ provider }: Props) {
  const tp    = useTranslations('provider')
  const tc    = useTranslations('common')
  const { t, formatVnd } = useLocaleUtils()

  const name = t(provider.name) || provider.slug

  return (
    <div>
      {/* Cover */}
      <div className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-gray-100">
        {provider.cover_url ? (
          <Image
            src={provider.cover_url}
            alt={name}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 56rem"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-6xl text-gray-300">🏢</div>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Logo */}
        {provider.logo_url && (
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-100 flex-shrink-0 -mt-10 sm:-mt-12 ml-4 bg-white shadow-md relative z-10">
            <Image src={provider.logo_url} alt="" fill className="object-cover" sizes="64px" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{name}</h1>
            {provider.is_verified && (
              <span className="badge bg-blue-100 text-blue-700 text-xs">✓ Verified</span>
            )}
          </div>

          {t(provider.short_description) && (
            <p className="text-gray-600 mt-1">{t(provider.short_description)}</p>
          )}

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
            <span className="flex items-center gap-1 font-medium text-gray-900">
              ★ {provider.rating.toFixed(1)}
              <span className="font-normal text-gray-400">
                ({provider.review_count} {tc('reviews')})
              </span>
            </span>

            {provider.address && (
              <span className="flex items-center gap-1">📍 {provider.address}</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-shrink-0">
          <button className="btn-primary text-sm">{tc('book')}</button>
          <button className="btn-secondary text-sm">{tc('share')}</button>
        </div>
      </div>
    </div>
  )
}
