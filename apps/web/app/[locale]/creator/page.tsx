'use client'

import { useCreatorProfile, useCreatorDashboard, useCreatorReferralTree, useCreatorEarnings, useRequestPayout } from '@/lib/queries/creator'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/authStore'
import { useState } from 'react'

export default function CreatorPage() {
  const t = useTranslations('creator')
  const token = useAuthStore(s => s.accessToken)
  const [tab, setTab] = useState<'overview' | 'referrals' | 'earnings'>('overview')

  const { data: profileData } = useCreatorProfile()
  const { data: dashData, isLoading } = useCreatorDashboard()
  const { data: treeData } = useCreatorReferralTree()
  const { data: earningsData } = useCreatorEarnings()
  const payout = useRequestPayout()

  if (!token) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
        <p className="text-gray-500">{t('login_required')}</p>
      </main>
    )
  }

  const profile = profileData?.data
  const dashboard = dashData?.data
  const referrals = treeData?.data ?? []
  const earnings = earningsData?.data

  const tabs = [
    { key: 'overview', label: t('overview') },
    { key: 'referrals', label: t('referrals') },
    { key: 'earnings', label: t('earnings') },
  ] as const

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 animate-pulse bg-gray-100 rounded-xl" />)}
            </div>
          ) : dashboard ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label={t('total_referrals')} value={dashboard.total_referrals} />
              <StatCard label={t('active_referrals')} value={dashboard.active_referrals} />
              <StatCard label={t('total_earned')} value={`${dashboard.total_earned?.toLocaleString()} ₫`} />
              <StatCard label={t('pending_payout')} value={`${dashboard.pending_payout?.toLocaleString()} ₫`} />
            </div>
          ) : null}

          {profile && (
            <div className="card p-5">
              <h2 className="font-semibold mb-3">{t('your_link')}</h2>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={profile.referral_link || ''}
                  className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm font-mono"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(profile.referral_link || '')}
                  className="px-4 py-2 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors"
                >
                  {t('copy')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Referrals */}
      {tab === 'referrals' && (
        <div className="space-y-3">
          {referrals.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('no_referrals')}</p>
          ) : (
            referrals.map((ref: any) => (
              <div key={ref.id} className="card px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{ref.first_name || t('anonymous')}</p>
                  <p className="text-xs text-gray-400">
                    {t('level')} {ref.level} · {new Date(ref.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs text-gray-500">{ref.status}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Earnings */}
      {tab === 'earnings' && (
        <div className="space-y-6">
          {earnings && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label={t('this_month')} value={`${earnings.this_month?.toLocaleString()} ₫`} />
              <StatCard label={t('last_month')} value={`${earnings.last_month?.toLocaleString()} ₫`} />
              <StatCard label={t('all_time')} value={`${earnings.all_time?.toLocaleString()} ₫`} />
            </div>
          )}

          <button
            onClick={() => payout.mutate({ method: 'bank', details: {} })}
            disabled={payout.isPending}
            className="px-6 py-3 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {t('request_payout')}
          </button>
          {payout.isSuccess && (
            <p className="text-green-600 text-sm">{t('payout_requested')}</p>
          )}
        </div>
      )}
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold">{value ?? '—'}</p>
    </div>
  )
}
