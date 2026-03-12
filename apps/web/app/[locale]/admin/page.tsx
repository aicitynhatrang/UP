'use client'

import { useState } from 'react'
import {
  usePlatformKPIs, useUserGrowth, useOrderVolume,
  useAdminUsers, useAdminProviders, useModerationQueue,
  useModerateProvider, useBanUser, useSystemHealth,
} from '@/lib/queries/admin'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/authStore'

type Tab = 'kpis' | 'users' | 'providers' | 'moderation' | 'system'

export default function AdminPage() {
  const t = useTranslations('admin')
  const user = useAuthStore(s => s.user)
  const [tab, setTab] = useState<Tab>('kpis')

  if (user?.role !== 'admin') {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
        <p className="text-gray-500">{t('access_denied')}</p>
      </main>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'kpis', label: t('kpis') },
    { key: 'users', label: t('users') },
    { key: 'providers', label: t('providers') },
    { key: 'moderation', label: t('moderation') },
    { key: 'system', label: t('system') },
  ]

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <div className="flex gap-2 overflow-x-auto border-b">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === key ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'kpis' && <KPIsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'providers' && <ProvidersTab />}
      {tab === 'moderation' && <ModerationTab />}
      {tab === 'system' && <SystemTab />}
    </main>
  )
}

function KPIsTab() {
  const t = useTranslations('admin')
  const { data, isLoading } = usePlatformKPIs()
  const kpis = data?.data

  if (isLoading) return <Loading />

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard label={t('total_users')} value={kpis?.total_users} />
      <KpiCard label={t('total_providers')} value={kpis?.total_providers} />
      <KpiCard label={t('total_orders')} value={kpis?.total_orders} />
      <KpiCard label={t('total_revenue')} value={`${(kpis?.total_revenue || 0).toLocaleString()} ₫`} />
      <KpiCard label={t('active_users_7d')} value={kpis?.active_users_7d} />
      <KpiCard label={t('orders_today')} value={kpis?.orders_today} />
      <KpiCard label={t('avg_rating')} value={kpis?.avg_rating?.toFixed(1)} />
      <KpiCard label={t('pending_moderation')} value={kpis?.pending_moderation} />
    </div>
  )
}

function UsersTab() {
  const t = useTranslations('admin')
  const { data, isLoading } = useAdminUsers()
  const banUser = useBanUser()
  const users = data?.data ?? []

  if (isLoading) return <Loading />

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3 font-medium">{t('name')}</th>
            <th className="text-left p-3 font-medium">{t('role')}</th>
            <th className="text-left p-3 font-medium">{t('level')}</th>
            <th className="text-left p-3 font-medium">{t('status')}</th>
            <th className="text-right p-3 font-medium">{t('actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map((u: any) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="p-3">{u.first_name} {u.last_name}</td>
              <td className="p-3">{u.role}</td>
              <td className="p-3">{u.level}</td>
              <td className="p-3">
                <span className={`px-2 py-0.5 rounded-full text-xs ${u.banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {u.banned ? t('banned') : t('active')}
                </span>
              </td>
              <td className="p-3 text-right">
                <button
                  onClick={() => banUser.mutate({ userId: u.id, banned: !u.banned })}
                  className="text-xs text-red-500 hover:underline"
                >
                  {u.banned ? t('unban') : t('ban')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProvidersTab() {
  const t = useTranslations('admin')
  const { data, isLoading } = useAdminProviders()
  const moderate = useModerateProvider()
  const providers = data?.data ?? []

  if (isLoading) return <Loading />

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3 font-medium">{t('name')}</th>
            <th className="text-left p-3 font-medium">{t('vertical')}</th>
            <th className="text-left p-3 font-medium">{t('status')}</th>
            <th className="text-left p-3 font-medium">{t('rating')}</th>
            <th className="text-right p-3 font-medium">{t('actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {providers.map((p: any) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="p-3 font-medium">{p.name}</td>
              <td className="p-3">{p.vertical}</td>
              <td className="p-3">
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  p.status === 'active' ? 'bg-green-100 text-green-700'
                    : p.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {p.status}
                </span>
              </td>
              <td className="p-3">{p.avg_rating?.toFixed(1) || '—'}</td>
              <td className="p-3 text-right space-x-2">
                <button
                  onClick={() => moderate.mutate({ providerId: p.id, action: 'approve' })}
                  className="text-xs text-green-600 hover:underline"
                >
                  {t('approve')}
                </button>
                <button
                  onClick={() => moderate.mutate({ providerId: p.id, action: 'reject' })}
                  className="text-xs text-red-500 hover:underline"
                >
                  {t('reject')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ModerationTab() {
  const t = useTranslations('admin')
  const { data, isLoading } = useModerationQueue()
  const moderate = useModerateProvider()
  const queue = data?.data ?? []

  if (isLoading) return <Loading />

  if (!queue.length) return <p className="text-gray-500 text-center py-8">{t('queue_empty')}</p>

  return (
    <div className="space-y-3">
      {queue.map((item: any) => (
        <div key={item.id} className="card p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{item.name || item.provider_name}</p>
            <p className="text-xs text-gray-400">{item.type} · {new Date(item.created_at).toLocaleDateString()}</p>
            {item.reason && <p className="text-xs text-gray-500 mt-1">{item.reason}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => moderate.mutate({ providerId: item.provider_id || item.id, action: 'approve' })}
              className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg hover:bg-green-200"
            >
              {t('approve')}
            </button>
            <button
              onClick={() => moderate.mutate({ providerId: item.provider_id || item.id, action: 'reject' })}
              className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200"
            >
              {t('reject')}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function SystemTab() {
  const t = useTranslations('admin')
  const { data, isLoading } = useSystemHealth()
  const health = data?.data

  if (isLoading) return <Loading />

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card p-5">
        <h3 className="font-semibold mb-3">{t('system_status')}</h3>
        <div className="space-y-2 text-sm">
          <StatusRow label="API" status={health?.api} />
          <StatusRow label="Database" status={health?.database} />
          <StatusRow label="Redis" status={health?.redis} />
        </div>
      </div>
      <div className="card p-5">
        <h3 className="font-semibold mb-3">{t('server_info')}</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>{t('uptime')}: {health?.uptime ? `${Math.floor(health.uptime / 3600)}h` : '—'}</p>
          <p>{t('memory')}: {health?.memory ? `${Math.round(health.memory.heapUsed / 1024 / 1024)}MB` : '—'}</p>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value ?? '—'}</p>
    </div>
  )
}

function StatusRow({ label, status }: { label: string; status?: string }) {
  const ok = status === 'ok' || status === 'healthy'
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`px-2 py-0.5 rounded-full text-xs ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {status || 'unknown'}
      </span>
    </div>
  )
}

function Loading() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-24 animate-pulse bg-gray-100 rounded-xl" />)}
    </div>
  )
}
