import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Locale } from '@/i18n/config'

interface User {
  id:              string
  telegramId:      number
  username:        string | null
  firstName:       string
  lastName:        string | null
  level:           string
  lifetimePoints:  number
  balancePoints:   number
  referralCode:    string
  subscriptionTier: string
  avatarUrl:       string | null
  language:        Locale
  isAdmin:         boolean
  isBlogger:       boolean
}

interface AuthState {
  user:         User | null
  accessToken:  string | null
  refreshToken: string | null
  isLoading:    boolean
  setAuth:      (user: User, accessToken: string, refreshToken: string) => void
  updateUser:   (patch: Partial<User>) => void
  clearAuth:    () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isLoading:    false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      updateUser: (patch) =>
        set(state => ({
          user: state.user ? { ...state.user, ...patch } : null,
        })),

      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name:    'allcity-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as Storage)
      ),
      partialize: (state) => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
