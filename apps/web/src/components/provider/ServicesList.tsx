'use client'

import { useTranslations } from 'next-intl'
import { useLocaleUtils } from '@/hooks/useLocaleUtils'
import type { ProviderService } from '@/lib/types'

interface Props {
  services:  ProviderService[]
  isLoading: boolean
}

export function ServicesList({ services, isLoading }: Props) {
  const tc          = useTranslations('common')
  const { t, formatVnd } = useLocaleUtils()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse flex justify-between p-3 bg-gray-50 rounded-xl">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (!services.length) {
    return <p className="text-gray-500 text-sm py-4">{tc('no_results')}</p>
  }

  return (
    <div className="space-y-2">
      {services.map(svc => {
        const name = t(svc.name)
        const desc = t(svc.description)
        const price = svc.price_vnd
          ? svc.price_max_vnd
            ? `${formatVnd(svc.price_vnd, true)} – ${formatVnd(svc.price_max_vnd, true)}`
            : formatVnd(svc.price_vnd, true)
          : tc('free')

        return (
          <div
            key={svc.id}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{name}</p>
              {desc && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{desc}</p>}
              {svc.duration_min && (
                <p className="text-xs text-gray-400 mt-0.5">⏱ {svc.duration_min} min</p>
              )}
            </div>
            <div className="ml-4 flex items-center gap-3 flex-shrink-0">
              <span className="font-semibold text-sm text-brand-600">{price}</span>
              <button className="btn-primary text-xs py-1.5 px-3">{tc('book')}</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
