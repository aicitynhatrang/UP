'use client'

import { useTranslations } from 'next-intl'

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-800',
  accepted:    'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed:   'bg-green-100 text-green-800',
  cancelled:   'bg-gray-100 text-gray-600',
  disputed:    'bg-red-100 text-red-800',
}

interface Props {
  status: string
}

export function OrderStatusBadge({ status }: Props) {
  const t = useTranslations('order')
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending
  const key = `status_${status}` as any

  return (
    <span className={`badge ${style}`}>
      {t(key)}
    </span>
  )
}
