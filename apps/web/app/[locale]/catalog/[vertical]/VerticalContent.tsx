'use client'

import { useState, useCallback } from 'react'
import { SearchBar } from '@/components/catalog/SearchBar'
import { SortSelect } from '@/components/catalog/SortSelect'
import { ProviderFilters } from '@/components/catalog/ProviderFilters'
import { ProviderList } from '@/components/catalog/ProviderList'
import { useProviders } from '@/lib/queries/providers'
import type { CatalogFilters } from '@/lib/types'

interface Props {
  vertical: string
}

export function VerticalContent({ vertical }: Props) {
  const [filters, setFilters] = useState<CatalogFilters>({
    vertical,
    sort:  'rating',
    page:  1,
    limit: 20,
  })

  const update = useCallback((patch: Partial<CatalogFilters>) => {
    setFilters(prev => ({ ...prev, ...patch, page: 1 }))
  }, [])

  const { data, isLoading } = useProviders(filters)

  return (
    <div className="space-y-4">
      {/* Search + Sort row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={filters.q ?? ''}
            onChange={q => update({ q: q || undefined })}
          />
        </div>
        <SortSelect
          value={filters.sort ?? 'rating'}
          onChange={sort => update({ sort })}
        />
      </div>

      {/* Filters */}
      <ProviderFilters filters={filters} onChange={update} />

      {/* Results */}
      <ProviderList
        providers={data?.data ?? []}
        total={data?.total ?? 0}
        isLoading={isLoading}
      />

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setFilters(prev => ({ ...prev, page: p }))}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                p === filters.page
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
