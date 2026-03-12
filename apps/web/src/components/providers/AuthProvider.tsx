'use client'

import { useEffect } from 'react'
import { useTelegramAuth } from '@/hooks/useTelegramAuth'
import { useAuthStore } from '@/store/authStore'
import { useRefreshToken } from '@/lib/queries/auth'

/**
 * Wires Telegram auto-login and periodic token refresh.
 * Mount once in the layout, renders children immediately.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useTelegramAuth()
  useTokenRefresh()
  return <>{children}</>
}

/** Refresh access token every 25 minutes if logged in */
function useTokenRefresh() {
  const refreshToken = useAuthStore(s => s.refreshToken)
  const refresh = useRefreshToken()

  useEffect(() => {
    if (!refreshToken) return

    const interval = setInterval(() => {
      refresh.mutate({ refreshToken })
    }, 25 * 60 * 1000) // 25 min

    return () => clearInterval(interval)
  }, [refreshToken]) // eslint-disable-line react-hooks/exhaustive-deps
}
