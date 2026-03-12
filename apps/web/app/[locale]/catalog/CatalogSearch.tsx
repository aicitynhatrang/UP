'use client'

import { useState, useCallback } from 'react'
import { SearchBar } from '@/components/catalog/SearchBar'
import { ProviderList } from '@/components/catalog/ProviderList'
import { useProviders } from '@/lib/queries/providers'

export function CatalogSearch() {
  const [query, setQuery] = useState('')

  const { data, isLoading } = useProviders({
    q:     query || undefined,
    sort:  'rating',
    limit: 12,
  })

  return (
    <div className="space-y-4">
      <SearchBar value={query} onChange={setQuery} />

      {query && (
        <ProviderList
          providers={data?.data ?? []}
          total={data?.total ?? 0}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
