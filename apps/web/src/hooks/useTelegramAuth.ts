'use client'

import { useEffect, useCallback, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useLogin } from '@/lib/queries/auth'

function getTelegram() {
  if (typeof window === 'undefined') return null
  // @ts-expect-error Telegram global
  return window.Telegram?.WebApp ?? null
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
    const tg = getTelegram()
    if (!tg?.initData) return false

    login.mutate({
      initData:    tg.initData,
      fingerprint: getFingerprint(),
    })
    return true
  }, [login])

  // Auto-login on mount — retry a few times to wait for SDK to load
  useEffect(() => {
    if (token) return

    // Try immediately
    if (tryLogin()) { setIsTelegram(true); return }

    // SDK may not be ready yet — retry up to 5 times
    let attempts = 0
    const timer = setInterval(() => {
      attempts++
      const tg = getTelegram()
      if (tg?.initData) {
        setIsTelegram(true)
        tryLogin()
        clearInterval(timer)
      } else if (attempts >= 5) {
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
