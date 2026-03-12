'use client'

import { useTranslations } from 'next-intl'
import type { CatalogFilters } from '@/lib/types'

interface Props {
  filters:   CatalogFilters
  onChange:  (patch: Partial<CatalogFilters>) => void
}

const RATING_OPTIONS = [0, 3, 3.5, 4, 4.5]

export function ProviderFilters({ filters, onChange }: Props) {
  const t = useTranslations('catalog')

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Open now */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={filters.open_now ?? false}
          onChange={e => onChange({ open_now: e.target.checked || undefined })}
          className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
        />
        <span className="text-sm">{t('filter_open_now')}</span>
      </label>

      {/* Verified */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={filters.verified ?? false}
          onChange={e => onChange({ verified: e.target.checked || undefined })}
          className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
        />
        <span className="text-sm">{t('filter_verified')}</span>
      </label>

      {/* Min rating */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{t('filter_rating_min')}:</span>
        <select
          value={filters.min_rating ?? 0}
          onChange={e => onChange({ min_rating: Number(e.target.value) || undefined })}
          className="input py-1.5 text-sm w-20"
        >
          {RATING_OPTIONS.map(r => (
            <option key={r} value={r}>{r === 0 ? '—' : `${r}+`}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
