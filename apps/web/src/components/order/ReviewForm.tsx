'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSubmitReview } from '@/lib/queries/orders'

interface Props {
  orderId: string
}

export function ReviewForm({ orderId }: Props) {
  const t  = useTranslations('review')
  const tc = useTranslations('common')
  const submit = useSubmitReview(orderId)

  const [rating, setRating] = useState(0)
  const [text, setText]     = useState('')
  const [hover, setHover]   = useState(0)

  function handleSubmit() {
    if (rating < 1) return
    submit.mutate({ rating, text: text || undefined })
  }

  if (submit.isSuccess) {
    return (
      <div className="card p-6 text-center">
        <p className="text-4xl mb-2">🎉</p>
        <p className="font-medium">{t('success')}</p>
      </div>
    )
  }

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-semibold">{t('title')}</h3>

      {/* Star rating */}
      <div>
        <p className="text-sm text-gray-600 mb-2">{t('rating_label')}</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(star)}
              className="text-3xl transition-transform hover:scale-110"
            >
              <span className={star <= (hover || rating) ? 'text-yellow-400' : 'text-gray-200'}>
                ★
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Text */}
      <div>
        <p className="text-sm text-gray-600 mb-2">{t('text_label')}</p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t('text_placeholder')}
          rows={3}
          className="input resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={rating < 1 || submit.isPending}
        className="btn-primary w-full"
      >
        {submit.isPending ? tc('loading') : t('submit')}
      </button>

      {submit.isError && (
        <p className="text-sm text-red-500">{tc('unknown_error')}</p>
      )}
    </div>
  )
}
