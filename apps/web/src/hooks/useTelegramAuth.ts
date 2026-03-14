'use client'

import { useEffect, useCallback, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useLogin } from '@/lib/queries/auth'

function getTelegram() {
  try {
    if (typeof window === 'undefined') return null
    // @ts-expect-error Telegram global
    return window.Telegram?.WebApp ?? null
  } catch {
    return null
  }
}

/**
 * Hook that auto-authenticates if running inside Telegram Mini App.
 * Checks for `window.Telegram.WebApp.initData`.
 */
export function useTelegramAuth() {
  const login    = useLogin()
  const token    = useAuthStore(s => s.accessToken)
  const user     = useAuthStore(s => s.user)
  const [isTelegram, setIsTelegram] = useState(false)

  const tryLogin = useCallback(() => {
    try {
      const tg = getTelegram()
      if (!tg?.initData) return false

      login.mutate({
        initData:    tg.initData,
        fingerprint: getFingerprint(),
      })
      return true
    } catch {
      return false
    }
  }, [login])

  // Auto-login on mount — retry a few times to wait for SDK to load
  useEffect(() => {
    if (token) return

    try {
      // Try immediately
      if (tryLogin()) { setIsTelegram(true); return }
    } catch { /* ignore */ }

    // SDK may not be ready yet — retry up to 5 times
    let attempts = 0
    const timer = setInterval(() => {
      try {
        attempts++
        const tg = getTelegram()
        if (tg?.initData) {
          setIsTelegram(true)
          tryLogin()
          clearInterval(timer)
        } else if (attempts >= 5) {
          clearInterval(timer)
        }
      } catch {
        clearInterval(timer)
      }
    }, 300)

    return () => clearInterval(timer)
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
  try {
    if (typeof window === 'undefined') return ''
    const parts = [
      navigator.userAgent ?? '',
      String(screen.width ?? 0),
      String(screen.height ?? 0),
      String(screen.colorDepth ?? 0),
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
      navigator.language ?? '',
    ]
    // Use encodeURIComponent + btoa to handle non-Latin1 chars
    return btoa(encodeURIComponent(parts.join('|'))).slice(0, 32)
  } catch {
    return 'unknown'
  }
}
