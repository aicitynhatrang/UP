'use client'

import { useTranslations } from 'next-intl'
import { useOrder, useCancelOrder } from '@/lib/queries/orders'
import { useLocaleUtils } from '@/hooks/useLocaleUtils'
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge'
import { OrderChat } from '@/components/order/OrderChat'
import { ReviewForm } from '@/components/order/ReviewForm'

interface Props {
  orderId: string
}

export function OrderDetailContent({ orderId }: Props) {
  const to = useTranslations('order')
  const tc = useTranslations('common')
  const { t, formatVnd, formatDate } = useLocaleUtils()

  const { data: order, isLoading } = useOrder(orderId) as { data: any; isLoading: boolean }
  const cancel = useCancelOrder(orderId)

  if (isLoading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
        </div>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">{tc('no_results')}</p>
      </main>
    )
  }

  const canCancel = ['pending', 'accepted'].includes(order.status)
  const canReview = order.status === 'completed'

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {order.provider ? t(order.provider.name) : to('title')}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{formatDate(order.created_at)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Amount card */}
      <div className="card p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{to('total')}</span>
          <span>{formatVnd(order.amount_vnd)}</span>
        </div>
        {order.discount_vnd > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{to('discount')}</span>
            <span className="text-green-600">-{formatVnd(order.discount_vnd)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-2">
          <span>{to('total')}</span>
          <span className="text-brand-600">{formatVnd(order.final_amount_vnd)}</span>
        </div>
      </div>

      {/* Status timeline */}
      {order.status_history?.length > 0 && (
        <div className="card p-4">
          <div className="space-y-3">
            {order.status_history.map((entry: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  i === order.status_history.length - 1 ? 'bg-brand-500' : 'bg-gray-300'
                }`} />
                <span className="font-medium capitalize">{entry.status.replace('_', ' ')}</span>
                <span className="text-gray-400 ml-auto">
                  {new Date(entry.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="card p-4">
          <p className="text-sm text-gray-600">{order.notes}</p>
        </div>
      )}

      {/* Chat */}
      <OrderChat orderId={orderId} />

      {/* Review form (after completion) */}
      {canReview && <ReviewForm orderId={orderId} />}

      {/* Cancel button */}
      {canCancel && (
        <button
          onClick={() => cancel.mutate()}
          disabled={cancel.isPending}
          className="w-full py-3 text-sm text-red-500 hover:text-red-600 font-medium"
        >
          {to('cancel_order')}
        </button>
      )}
    </main>
  )
}
