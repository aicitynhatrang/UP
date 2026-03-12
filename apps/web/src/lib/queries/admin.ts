'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export function usePlatformKPIs() {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['admin-kpis'],
    queryFn: () => api.get<{ ok: boolean; data: any }>('/api/v1/admin/analytics/kpis', { token: token! }),
    enabled: !!token,
    refetchInterval: 60 * 1000,
  })
}

export function useUserGrowth(days = 30) {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['admin-user-growth', days],
    queryFn: () => api.get<{ ok: boolean; data: any[] }>(`/api/v1/admin/analytics/users/growth?days=${days}`, { token: token! }),
    enabled: !!token,
  })
}

export function useOrderVolume(days = 30) {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['admin-order-volume', days],
    queryFn: () => api.get<{ ok: boolean; data: any[] }>(`/api/v1/admin/analytics/orders/volume?days=${days}`, { token: token! }),
    enabled: !!token,
  })
}

export function useAdminUsers(params?: { search?: string; role?: string; page?: number }) {
  const token = useAuthStore(s => s.accessToken)
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.role) qs.set('role', params.role)
  if (params?.page) qs.set('page', String(params.page))

  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => api.get<{ ok: boolean; data: any[]; total: number }>(`/api/v1/admin/users?${qs}`, { token: token! }),
    enabled: !!token,
  })
}

export function useAdminProviders(params?: { search?: string; status?: string; moderationStatus?: string; page?: number }) {
  const token = useAuthStore(s => s.accessToken)
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.status) qs.set('status', params.status)
  if (params?.moderationStatus) qs.set('moderationStatus', params.moderationStatus)
  if (params?.page) qs.set('page', String(params.page))

  return useQuery({
    queryKey: ['admin-providers', params],
    queryFn: () => api.get<{ ok: boolean; data: any[]; total: number }>(`/api/v1/admin/providers?${qs}`, { token: token! }),
    enabled: !!token,
  })
}

export function useModerationQueue(params?: { page?: number }) {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['admin-moderation-queue', params],
    queryFn: () => api.get<{ ok: boolean; data: any[]; total: number }>(
      `/api/v1/admin/moderation/queue?page=${params?.page ?? 1}`, { token: token! },
    ),
    enabled: !!token,
  })
}

export function useModerateProvider() {
  const token = useAuthStore(s => s.accessToken)
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ providerId, action, note }: { providerId: string; action: 'approve' | 'reject'; note?: string }) =>
      api.put(`/api/v1/admin/providers/${providerId}/moderate`, { action, note }, { token: token! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-providers'] })
      qc.invalidateQueries({ queryKey: ['admin-moderation-queue'] })
    },
  })
}

export function useBanUser() {
  const token = useAuthStore(s => s.accessToken)
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, isBanned }: { userId: string; isBanned: boolean }) =>
      api.put(`/api/v1/admin/users/${userId}/ban`, { isBanned }, { token: token! }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useSystemHealth() {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => api.get<{ ok: boolean; data: any }>('/api/v1/admin/system/health', { token: token! }),
    enabled: !!token,
    refetchInterval: 30 * 1000,
  })
}
