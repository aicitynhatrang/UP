'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useOrders } from '@/lib/queries/orders'
import { OrderCard } from '@/components/order/OrderCard'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const STATUS_TABS = ['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'] as const

export function OrdersContent() {
  const to = useTranslations('order')
  const tc = useTranslations('common')
  const token = useAuthStore(s => s.accessToken)
  const [tab, setTab] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useOrders({
    page,
    status: tab === 'all' ? undefined : tab,
  })

  if (!token) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">📋</p>
        <p className="text-gray-500">{to('empty')}</p>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">{to('history')}</h1>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar mb-6">
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => { setTab(s); setPage(1) }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
              tab === s ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {s === 'all' ? tc('show_all') : to(`status_${s}` as any)}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : !(data as any)?.data?.length ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-gray-500">{to('empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data as any).data.map((order: any) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </main>
  )
}
