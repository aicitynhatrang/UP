'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export function useAiChat() {
  const token = useAuthStore(s => s.accessToken)

  return useMutation({
    mutationFn: (body: { message: string; lang?: string }) =>
      api.post<{ ok: boolean; data: { sessionId: string; reply: string; messageCount: number } }>(
        '/api/v1/ai/chat', body, { token: token! },
      ),
  })
}

export function useAiRecommend() {
  const token = useAuthStore(s => s.accessToken)

  return useMutation({
    mutationFn: (body: { query?: string; mood?: string; verticalSlug?: string }) =>
      api.post<{ ok: boolean; data: any[] }>('/api/v1/ai/recommend', body, { token: token! }),
  })
}

export function useChatHistory(params?: { page?: number }) {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['chat-history', params],
    queryFn: () => api.get<{ ok: boolean; data: any[]; total: number }>(
      `/api/v1/ai/chat/history?page=${params?.page ?? 1}`, { token: token! },
    ),
    enabled: !!token,
  })
}

export function useChatSession(sessionId: string) {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['chat-session', sessionId],
    queryFn: () => api.get<{ ok: boolean; data: any }>(`/api/v1/ai/chat/${sessionId}`, { token: token! }),
    enabled: !!sessionId && !!token,
  })
}

export function useAiTranslate() {
  const token = useAuthStore(s => s.accessToken)

  return useMutation({
    mutationFn: (body: { text: string; targetLangs: string[] }) =>
      api.post<{ ok: boolean; data: Record<string, string> }>('/api/v1/ai/translate', body, { token: token! }),
  })
}
