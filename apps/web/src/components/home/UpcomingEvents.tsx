'use client'

import { useEvents } from '@/lib/queries/events'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useLocale } from 'next-intl'

export function UpcomingEvents() {
  const { data, isLoading } = useEvents({ page: 1, limit: 4 })
  const t = useTranslations('home')
  const locale = useLocale()

  if (isLoading) return <div className="h-32 animate-pulse bg-gray-100 rounded-xl" />

  const events = data?.data ?? []
  if (!events.length) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('events')}</h2>
        <Link href={`/${locale}/events`} className="text-brand-500 text-sm font-medium hover:underline">
          {t('see_all')}
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {events.map((event: any) => (
          <Link
            key={event.id}
            href={`/${locale}/events/${event.id}`}
            className="card p-4 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-sm mb-1">{event.title}</h3>
            <p className="text-xs text-gray-500 mb-2">{event.description?.slice(0, 80)}</p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{new Date(event.starts_at).toLocaleDateString(locale)}</span>
              {event.venue && <span>{event.venue}</span>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
