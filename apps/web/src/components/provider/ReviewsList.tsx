'use client'

import { useTranslations } from 'next-intl'
import { useLocaleUtils } from '@/hooks/useLocaleUtils'
import type { Review } from '@/lib/types'

interface Props {
  reviews:      Review[]
  total:        number
  page:         number
  totalPages:   number
  isLoading:    boolean
  onPageChange: (page: number) => void
}

export function ReviewsList({ reviews, total, page, totalPages, isLoading, onPageChange }: Props) {
  const tr = useTranslations('review')
  const tc = useTranslations('common')
  const { formatDate } = useLocaleUtils()

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse p-4 bg-gray-50 rounded-xl space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  if (!reviews.length) {
    return (
      <div className="text-center py-8">
        <p className="text-4xl mb-3">💬</p>
        <p className="text-gray-500">{tc('no_results')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map(review => (
        <div key={review.id} className="p-4 rounded-xl bg-gray-50">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-600">
              {review.user?.first_name?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {review.user
                  ? `${review.user.first_name} ${review.user.last_name ?? ''}`.trim()
                  : tr('anonymous')}
              </p>
              <p className="text-xs text-gray-400">{formatDate(review.created_at)}</p>
            </div>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-sm ${i < review.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          {/* Text */}
          {review.text && (
            <p className="text-sm text-gray-700 whitespace-pre-line">{review.text}</p>
          )}

          {/* Photos */}
          {review.photos.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
              {review.photos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
