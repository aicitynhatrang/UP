'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export function useEvents(params?: { category?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams()
  if (params?.category) qs.set('category', params.category)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString()

  return useQuery({
    queryKey: ['events', params],
    queryFn: () => api.get<{ ok: boolean; data: any[]; total: number }>(`/api/v1/events?${query}`),
  })
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => api.get<{ ok: boolean; data: any }>(`/api/v1/events/${eventId}`),
    enabled: !!eventId,
  })
}

export function useCreateEvent() {
  const token = useAuthStore(s => s.accessToken)
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (body: any) => api.post('/api/v1/events', body, { token: token! }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useRsvp() {
  const token = useAuthStore(s => s.accessToken)
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, rsvpStatus }: { eventId: string; rsvpStatus: string }) =>
      api.post(`/api/v1/events/${eventId}/rsvp`, { rsvpStatus }, { token: token! }),
    onSuccess: (_, { eventId }) => qc.invalidateQueries({ queryKey: ['event', eventId] }),
  })
}

export function useEventAttendees(eventId: string) {
  return useQuery({
    queryKey: ['event-attendees', eventId],
    queryFn: () => api.get<{ ok: boolean; data: any[]; total: number }>(`/api/v1/events/${eventId}/attendees`),
    enabled: !!eventId,
  })
}
