'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

// ── List orders ───────────────────────────────────────────────────────────────

export function useOrders(filters: { page?: number; status?: string } = {}) {
  const token = useAuthStore(s => s.accessToken)
  const params = new URLSearchParams()
  if (filters.page)   params.set('page',   String(filters.page))
  if (filters.status) params.set('status', filters.status)

  return useQuery({
    queryKey: ['orders', params.toString()],
    queryFn:  () => api.get(`/api/v1/orders?${params}`, { token: token! }),
    enabled:  !!token,
  })
}

// ── Single order ──────────────────────────────────────────────────────────────

export function useOrder(id: string) {
  const token = useAuthStore(s => s.accessToken)
  return useQuery({
    queryKey: ['order', id],
    queryFn:  () => api.get(`/api/v1/orders/${id}`, { token: token! }),
    enabled:  !!token && !!id,
  })
}

// ── Create order ──────────────────────────────────────────────────────────────

export function useCreateOrder() {
  const token = useAuthStore(s => s.accessToken)
  const qc    = useQueryClient()

  return useMutation({
    mutationFn: (body: {
      providerId:   string
      serviceId?:   string
      verticalSlug: string
      amountVnd:    number
      notes?:       string
      scheduledAt?: string
    }) => api.post('/api/v1/orders', body, { token: token! }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}

// ── Update status ─────────────────────────────────────────────────────────────

export function useUpdateOrderStatus(orderId: string) {
  const token = useAuthStore(s => s.accessToken)
  const qc    = useQueryClient()

  return useMutation({
    mutationFn: (status: string) =>
      api.patch(`/api/v1/orders/${orderId}/status`, { status }, { token: token! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', orderId] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

// ── Cancel order ──────────────────────────────────────────────────────────────

export function useCancelOrder(orderId: string) {
  const token = useAuthStore(s => s.accessToken)
  const qc    = useQueryClient()

  return useMutation({
    mutationFn: (reason?: string) =>
      api.post(`/api/v1/orders/${orderId}/cancel`, { reason }, { token: token! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', orderId] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

// ── Chat messages ─────────────────────────────────────────────────────────────

export function useOrderMessages(orderId: string) {
  const token = useAuthStore(s => s.accessToken)
  return useQuery({
    queryKey: ['order-messages', orderId],
    queryFn:  () => api.get(`/api/v1/orders/${orderId}/messages`, { token: token! }),
    enabled:  !!token && !!orderId,
    refetchInterval: 5000, // poll every 5s for new messages
  })
}

export function useSendMessage(orderId: string) {
  const token = useAuthStore(s => s.accessToken)
  const qc    = useQueryClient()

  return useMutation({
    mutationFn: (body: { content?: string; type?: string; mediaUrl?: string }) =>
      api.post(`/api/v1/orders/${orderId}/messages`, body, { token: token! }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order-messages', orderId] }),
  })
}

// ── Submit review ─────────────────────────────────────────────────────────────

export function useSubmitReview(orderId: string) {
  const token = useAuthStore(s => s.accessToken)
  const qc    = useQueryClient()

  return useMutation({
    mutationFn: (body: { rating: number; text?: string; photos?: string[] }) =>
      api.post(`/api/v1/orders/${orderId}/review`, body, { token: token! }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', orderId] }),
  })
}

// ── Checkin ────────────────────────────────────────────────────────────────────

export function useCheckin() {
  const token = useAuthStore(s => s.accessToken)
  return useMutation({
    mutationFn: (body: { providerId: string; lat: number; lng: number }) =>
      api.post('/api/v1/checkins', body, { token: token! }),
  })
}
