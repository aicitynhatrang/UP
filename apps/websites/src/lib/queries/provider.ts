import { api } from '@/lib/api'

interface ProviderResponse {
  ok: boolean
  data: any
}

interface ReviewsResponse {
  ok: boolean
  data: any[]
  total: number
}

export async function fetchProvider(slug: string) {
  return api.get<ProviderResponse>(`/api/v1/providers/${slug}`)
}

export async function fetchProviderServices(providerId: string) {
  return api.get<{ ok: boolean; data: any[] }>(`/api/v1/providers/${providerId}/services`)
}

export async function fetchProviderReviews(providerId: string, page = 1) {
  return api.get<ReviewsResponse>(`/api/v1/providers/${providerId}/reviews?page=${page}`)
}
