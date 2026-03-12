'use client'

import { useProvider } from '@/lib/provider-context'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { fetchProviderReviews } from '@/lib/queries/provider'

export function ReviewsContent() {
  const provider = useProvider()
  const t = useTranslations('site')
  const [reviews, setReviews] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchProviderReviews(provider.id, page)
      .then(res => {
        setReviews(res.data ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(() => setReviews([]))
      .finally(() => setLoading(false))
  }, [provider.id, page])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('reviews_title')}</h1>
        {provider.avg_rating && (
          <div className="flex items-center gap-2">
            <span className="text-yellow-500 text-lg">★</span>
            <span className="text-xl font-bold">{provider.avg_rating.toFixed(1)}</span>
            <span className="text-sm text-gray-500">({total})</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse bg-gray-100 rounded-xl" />)}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-gray-500 text-center py-12">{t('no_reviews')}</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <div key={review.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-sm">
                    {(review.user_name || '?')[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{review.user_name || t('anonymous')}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={`text-sm ${i < review.rating ? 'text-yellow-500' : 'text-gray-200'}`}>★</span>
                  ))}
                </div>
              </div>
              {review.text && <p className="text-sm text-gray-700">{review.text}</p>}
              {review.photos?.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {review.photos.map((url: string, i: number) => (
                    <img key={i} src={url} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                  ))}
                </div>
              )}
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-1 rounded text-sm ${
                    page === i + 1 ? 'bg-brand-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
