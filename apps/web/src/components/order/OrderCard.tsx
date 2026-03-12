'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useLocaleUtils } from '@/hooks/useLocaleUtils'
import { OrderStatusBadge } from './OrderStatusBadge'

interface Props {
  order: {
    id:               string
    status:           string
    final_amount_vnd: number
    created_at:       string
    provider?: {
      name:     Record<string, string>
      slug:     string
      logo_url: string | null
    }
  }
}

export function OrderCard({ order }: Props) {
  const locale = useLocale()
  const { t, formatVnd, formatDate } = useLocaleUtils()

  return (
    <Link
      href={`/${locale}/orders/${order.id}`}
      className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
    >
      {/* Provider logo */}
      <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
        {order.provider?.logo_url ? (
          <img src={order.provider.logo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl">🏢</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {order.provider ? t(order.provider.name) : 'Order'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
      </div>

      {/* Amount + status */}
      <div className="text-right flex-shrink-0">
        <p className="font-semibold text-sm">{formatVnd(order.final_amount_vnd, true)}</p>
        <OrderStatusBadge status={order.status} />
      </div>
    </Link>
  )
}
