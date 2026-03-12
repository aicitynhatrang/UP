'use client'

import { useState } from 'react'
import { useEvents } from '@/lib/queries/events'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'

export default function EventsPage() {
  const t = useTranslations('events')
  const locale = useLocale()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useEvents({ page, limit: 12 })
  const events = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 12)

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-gray-500 text-center py-12">{t('no_events')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event: any) => (
              <Link
                key={event.id}
                href={`/${locale}/events/${event.id}`}
                className="card p-5 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600 font-bold text-sm">
                    {new Date(event.starts_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm group-hover:text-brand-600 transition-colors">
                      {event.title}
                    </h3>
                    {event.venue && (
                      <p className="text-xs text-gray-400">{event.venue}</p>
                    )}
                  </div>
                </div>
                {event.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{event.description}</p>
                )}
                <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                  <span>
                    {new Date(event.starts_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {event.capacity && (
                    <span>{t('spots_left', { count: event.capacity - (event.attendee_count || 0) })}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
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
        </>
      )}
    </main>
  )
}
