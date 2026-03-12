'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Provider, ProviderService, Review, CatalogFilters, PaginatedResponse, VerticalConfig } from '@/lib/types'

// ── Verticals ─────────────────────────────────────────────────────────────────

export function useVerticals() {
  return useQuery<VerticalConfig[]>({
    queryKey: ['verticals'],
    queryFn:  () => api.get('/api/v1/catalog/verticals'),
    staleTime: 1000 * 60 * 30, // 30 min — rarely changes
  })
}

// ── Provider list ─────────────────────────────────────────────────────────────

export function useProviders(filters: CatalogFilters) {
  const params = new URLSearchParams()
  if (filters.vertical)   params.set('vertical',   filters.vertical)
  if (filters.q)          params.set('q',           filters.q)
  if (filters.sort)       params.set('sort',        filters.sort)
  if (filters.open_now)   params.set('open_now',    '1')
  if (filters.verified)   params.set('verified',    '1')
  if (filters.min_rating) params.set('min_rating',  String(filters.min_rating))
  if (filters.tags?.length) params.set('tags',      filters.tags.join(','))
  if (filters.lat)        params.set('lat',         String(filters.lat))
  if (filters.lng)        params.set('lng',         String(filters.lng))
  if (filters.radius_km)  params.set('radius_km',   String(filters.radius_km))
  params.set('page',  String(filters.page  ?? 1))
  params.set('limit', String(filters.limit ?? 20))

  const qs = params.toString()

  return useQuery<PaginatedResponse<Provider>>({
    queryKey: ['providers', qs],
    queryFn:  () => api.get(`/api/v1/catalog/providers?${qs}`),
  })
}

// ── Single provider ───────────────────────────────────────────────────────────

export function useProvider(slug: string) {
  return useQuery<Provider>({
    queryKey: ['provider', slug],
    queryFn:  () => api.get(`/api/v1/providers/${slug}`),
    enabled:  !!slug,
  })
}

export function useProviderServices(providerId: string) {
  return useQuery<ProviderService[]>({
    queryKey: ['provider-services', providerId],
    queryFn:  () => api.get(`/api/v1/providers/${providerId}/services`),
    enabled:  !!providerId,
  })
}

export function useProviderReviews(providerId: string, page = 1) {
  return useQuery<PaginatedResponse<Review>>({
    queryKey: ['provider-reviews', providerId, page],
    queryFn:  () => api.get(`/api/v1/providers/${providerId}/reviews?page=${page}`),
    enabled:  !!providerId,
  })
}
