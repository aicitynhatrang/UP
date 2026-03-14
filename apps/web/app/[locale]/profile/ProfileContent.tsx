'use client'

import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import { useMe, useLogout } from '@/lib/queries/auth'
import { useTelegramAuth } from '@/hooks/useTelegramAuth'
import { LevelBadge } from '@/components/profile/LevelBadge'
import { PointsCard } from '@/components/profile/PointsCard'
import { ReferralCard } from '@/components/profile/ReferralCard'
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher'

export function ProfileContent() {
  const ta = useTranslations('auth')
  const tg = useTranslations('gamification')
  const tc = useTranslations('common')

  const { user, isLoggedIn, isLoading, isTelegram, login } = useTelegramAuth()
  const logout = useLogout()

  if (!isLoggedIn || !user) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">🔐</p>
        <h1 className="text-xl font-bold mb-2">{ta('login')}</h1>
        <p className="text-gray-500 mb-6">{ta('login_description')}</p>
        <button
          onClick={login}
          disabled={isLoading || !isTelegram}
          className="btn-primary disabled:opacity-50"
        >
          {isLoading ? '...' : ta('login_with_telegram')}
        </button>
        {!isTelegram && (
          <p className="text-sm text-gray-400 mt-3">{ta('open_in_telegram')}</p>
        )}
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* User header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-600 overflow-hidden">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            user.firstName[0]
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {user.firstName} {user.lastName ?? ''}
          </h1>
          {user.username && (
            <p className="text-sm text-gray-500">@{user.username}</p>
          )}
          <LevelBadge level={user.level} />
        </div>
      </div>

      {/* Points */}
      <PointsCard
        balance={user.balancePoints}
        lifetime={user.lifetimePoints}
        level={user.level}
      />

      {/* Referral */}
      <ReferralCard referralCode={user.referralCode} />

      {/* Menu */}
      <div className="card divide-y divide-gray-50">
        {[
          { label: ta('my_orders'),    href: 'orders',    icon: '📋' },
          { label: ta('my_reviews'),   href: 'reviews',   icon: '⭐' },
          { label: ta('my_favorites'), href: 'favorites', icon: '❤️' },
          { label: ta('subscription'), href: 'subscription', icon: '💎' },
        ].map(item => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm font-medium flex-1">{item.label}</span>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        ))}
      </div>

      {/* Settings */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{ta('language')}</span>
          <LocaleSwitcher />
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => logout.mutate()}
        className="w-full py-3 text-sm text-red-500 hover:text-red-600 font-medium"
      >
        {ta('logout')}
      </button>
    </main>
  )
}
