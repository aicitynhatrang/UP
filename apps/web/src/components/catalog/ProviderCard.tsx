'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { useLocaleUtils } from '@/hooks/useLocaleUtils'
import type { Provider } from '@/lib/types'

interface Props {
  provider: Provider
}

export function ProviderCard({ provider }: Props) {
  const locale  = useLocale()
  const tc      = useTranslations('common')
  const tp      = useTranslations('provider')
  const { t }   = useLocaleUtils()

  const name = t(provider.name) || provider.slug
  const desc = t(provider.short_description) || t(provider.description)
  const href = `/${locale}/catalog/${provider.vertical_slug}/${provider.slug}`

  return (
    <Link href={href} className="card group hover:shadow-md transition-shadow">
      {/* Cover image */}
      <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
        {provider.cover_url ? (
          <Image
            src={provider.cover_url}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl text-gray-300">
            🏢
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {provider.is_verified && (
            <span className="badge bg-blue-100 text-blue-700">✓</span>
          )}
          {provider.is_featured && (
            <span className="badge bg-brand-100 text-brand-700">⭐</span>
          )}
        </div>

        {/* Rating pill */}
        <div className="absolute bottom-2 right-2 badge bg-white/90 backdrop-blur-sm text-gray-900 shadow-sm">
          ★ {provider.rating.toFixed(1)}
          <span className="text-gray-400 ml-0.5">({provider.review_count})</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5">
        <h3 className="font-semibold text-sm leading-snug mb-1 line-clamp-1">
          {name}
        </h3>
        {desc && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">{desc}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {provider.address && (
            <span className="truncate">📍 {provider.address}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
