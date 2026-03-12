'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { VERTICALS_CONFIG } from '@allcity/shared/constants/verticals'
import { useLocaleUtils } from '@/hooks/useLocaleUtils'

export function CategoryGrid() {
  const locale = useLocale()
  const t      = useTranslations('verticals')

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
      {VERTICALS_CONFIG.map(v => (
        <Link
          key={v.slug}
          href={`/${locale}/catalog/${v.slug}`}
          className="card flex flex-col items-center gap-2 p-4 hover:shadow-md transition-shadow text-center group"
        >
          <span className="text-3xl group-hover:scale-110 transition-transform">
            {v.emoji}
          </span>
          <span className="text-xs font-medium text-gray-700 leading-tight">
            {t(v.slug)}
          </span>
        </Link>
      ))}
    </div>
  )
}
