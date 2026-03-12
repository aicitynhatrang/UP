'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export function useSubscriptionTiers() {
  return useQuery({
    queryKey: ['subscription-tiers'],
    queryFn: () => api.get<{ ok: boolean; data: any[] }>('/api/v1/subscriptions/tiers'),
  })
}

export function useSubscription(providerId: string) {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['subscription', providerId],
    queryFn: () => api.get<{ ok: boolean; data: any }>(`/api/v1/subscriptions/${providerId}`, { token: token! }),
    enabled: !!providerId && !!token,
  })
}

export function useCreateStripeCheckout() {
  const token = useAuthStore(s => s.accessToken)

  return useMutation({
    mutationFn: ({ providerId, tierSlug, successUrl, cancelUrl }: {
      providerId: string; tierSlug: string; successUrl: string; cancelUrl: string
    }) =>
      api.post<{ ok: boolean; data: { sessionId: string; url: string } }>(
        `/api/v1/payments/stripe/checkout?providerId=${providerId}`,
        { tierSlug, successUrl, cancelUrl },
        { token: token! },
      ),
  })
}

export function useTransactions(params?: { page?: number; type?: string }) {
  const token = useAuthStore(s => s.accessToken)
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.type) qs.set('type', params.type)

  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => api.get<{ ok: boolean; data: any[]; total: number }>(`/api/v1/payments/transactions?${qs}`, { token: token! }),
    enabled: !!token,
  })
}

export function useValidateDiscount() {
  const token = useAuthStore(s => s.accessToken)

  return useMutation({
    mutationFn: (body: { code: string; orderAmountVnd: number; providerId?: string }) =>
      api.post<{ ok: boolean; data: any }>('/api/v1/discounts/validate', body, { token: token! }),
  })
}
