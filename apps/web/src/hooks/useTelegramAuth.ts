'use client'

import { useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useLogin } from '@/lib/queries/auth'

/**
 * Hook that auto-authenticates if running inside Telegram Mini App.
 * Checks for `window.Telegram.WebApp.initData`.
 */
export function useTelegramAuth() {
  const login    = useLogin()
  const token    = useAuthStore(s => s.accessToken)
  const user     = useAuthStore(s => s.user)

  const isTelegram = typeof window !== 'undefined' &&
    // @ts-expect-error Telegram global
    !!window.Telegram?.WebApp?.initData

  const tryLogin = useCallback(() => {
    // @ts-expect-error Telegram global
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null
    if (!tg?.initData) return

    login.mutate({
      initData:    tg.initData,
      fingerprint: getFingerprint(),
    })
  }, [login])

  // Auto-login on mount if no token and inside Telegram
  useEffect(() => {
    if (!token) tryLogin()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    user,
    isLoggedIn:  !!token,
    isLoading:   login.isPending,
    isTelegram,
    error:       login.error,
    login:       tryLogin,
  }
}

/** Simple device fingerprint based on screen + timezone + UA */
function getFingerprint(): string {
  if (typeof window === 'undefined') return ''
  const parts = [
    navigator.userAgent,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ]
  return btoa(parts.join('|')).slice(0, 32)
}
