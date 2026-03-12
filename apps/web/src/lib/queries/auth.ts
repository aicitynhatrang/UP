'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

// ── Login ─────────────────────────────────────────────────────────────────────

interface LoginParams {
  initData:     string
  fingerprint?: string
}

export function useLogin() {
  const setAuth = useAuthStore(s => s.setAuth)
  const qc      = useQueryClient()

  return useMutation({
    mutationFn: (params: LoginParams) =>
      api.post<{ user: any; accessToken: string; refreshToken: string }>(
        '/api/v1/auth/login',
        params,
      ),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

// ── Refresh ───────────────────────────────────────────────────────────────────

export function useRefreshToken() {
  const setAuth    = useAuthStore(s => s.setAuth)
  const clearAuth  = useAuthStore(s => s.clearAuth)

  return useMutation({
    mutationFn: ({ refreshToken, fingerprint }: { refreshToken: string; fingerprint?: string }) =>
      api.post<{ user: any; accessToken: string; refreshToken: string }>(
        '/api/v1/auth/refresh',
        { refreshToken, fingerprint },
      ),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
    },
    onError: () => {
      clearAuth()
    },
  })
}

// ── Logout ────────────────────────────────────────────────────────────────────

export function useLogout() {
  const clearAuth   = useAuthStore(s => s.clearAuth)
  const refreshToken = useAuthStore(s => s.refreshToken)
  const qc           = useQueryClient()

  return useMutation({
    mutationFn: () =>
      api.post('/api/v1/auth/logout', { refreshToken }),
    onSettled: () => {
      clearAuth()
      qc.clear()
    },
  })
}

// ── Current user ──────────────────────────────────────────────────────────────

export function useMe() {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['me'],
    queryFn:  () => api.get('/api/v1/auth/me', { token: token! }),
    enabled:  !!token,
    staleTime: 1000 * 60 * 5,
  })
}

// ── Apply referral ────────────────────────────────────────────────────────────

export function useApplyReferral() {
  const token = useAuthStore(s => s.accessToken)

  return useMutation({
    mutationFn: (referralCode: string) =>
      api.post('/api/v1/auth/apply-referral', { referralCode }, { token: token! }),
  })
}

// ── Points history ────────────────────────────────────────────────────────────

export function usePointsHistory() {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['points-history'],
    queryFn:  () => api.get('/api/v1/users/me/points', { token: token! }),
    enabled:  !!token,
  })
}

// ── Referrals ─────────────────────────────────────────────────────────────────

export function useMyReferrals() {
  const token = useAuthStore(s => s.accessToken)

  return useQuery({
    queryKey: ['my-referrals'],
    queryFn:  () => api.get('/api/v1/users/me/referrals', { token: token! }),
    enabled:  !!token,
  })
}
