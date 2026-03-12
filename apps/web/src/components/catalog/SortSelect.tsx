'use client'

import { useTranslations } from 'next-intl'
import type { CatalogFilters } from '@/lib/types'

type SortValue = NonNullable<CatalogFilters['sort']>

interface Props {
  value:    SortValue
  onChange: (v: SortValue) => void
}

const OPTIONS: SortValue[] = ['rating', 'distance', 'price_asc', 'price_desc', 'new']

export function SortSelect({ value, onChange }: Props) {
  const t = useTranslations('catalog')

  const labels: Record<SortValue, string> = {
    rating:     t('sort_rating'),
    distance:   t('sort_distance'),
    price_asc:  t('sort_price_asc'),
    price_desc: t('sort_price_desc'),
    new:        t('sort_new'),
  }

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as SortValue)}
      className="input py-2 pr-8 text-sm"
    >
      {OPTIONS.map(opt => (
        <option key={opt} value={opt}>{labels[opt]}</option>
      ))}
    </select>
  )
}
