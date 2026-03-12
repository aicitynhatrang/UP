'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export function useCreatorProfile() {
  const token = useAuthStore(s => s.accessToken)
  const userId = useAuthStore(s => s.user?.id)

  return useQuery({
    queryKey: ['creator-profile', userId],
    queryFn: () => api.get<{ ok: boolean; data: any }>(`/api/v1/creators/profile`, { token: token! }),
    enabled: !!token && !!userId,
  })
}

export function useCreatorDashboard() {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['creator-dashboard'],
    queryFn: () => api.get<{ ok: boolean; data: any }>('/api/v1/creators/dashboard', { token: token! }),
    enabled: !!token,
  })
}

export function useCreatorReferralTree(params?: { page?: number }) {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['creator-referral-tree', params],
    queryFn: () => api.get<{ ok: boolean; data: any }>(
      `/api/v1/creators/referral-tree?page=${params?.page ?? 1}`, { token: token! },
    ),
    enabled: !!token,
  })
}

export function useCreatorEarnings(months = 6) {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['creator-earnings', months],
    queryFn: () => api.get<{ ok: boolean; data: any[] }>(
      `/api/v1/creators/earnings?months=${months}`, { token: token! },
    ),
    enabled: !!token,
  })
}

export function useCreatorPayouts(params?: { page?: number }) {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['creator-payouts', params],
    queryFn: () => api.get<{ ok: boolean; data: any[]; total: number }>(
      `/api/v1/creators/payouts?page=${params?.page ?? 1}`, { token: token! },
    ),
    enabled: !!token,
  })
}

export function useRequestPayout() {
  const token = useAuthStore(s => s.accessToken)
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (body: { method: string; details: any }) =>
      api.post('/api/v1/creators/payouts', body, { token: token! }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['creator-payouts'] }),
  })
}

export function useCheckEligibility() {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['creator-eligibility'],
    queryFn: () => api.get<{ ok: boolean; data: any }>('/api/v1/creators/eligibility', { token: token! }),
    enabled: !!token,
  })
}
