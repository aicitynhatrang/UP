'use client'

import { useParams } from 'next/navigation'
import { useEvent, useRsvp, useEventAttendees } from '@/lib/queries/events'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/authStore'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations('events')
  const token = useAuthStore(s => s.accessToken)

  const { data, isLoading } = useEvent(id)
  const { data: attendeesData } = useEventAttendees(id)
  const rsvp = useRsvp()

  const event = data?.data
  const attendees = attendeesData?.data ?? []

  if (isLoading) return <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse"><div className="h-64 bg-gray-100 rounded-xl" /></div>
  if (!event) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">{t('not_found')}</div>

  const spotsLeft = event.capacity ? event.capacity - (event.attendee_count || 0) : null

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="card p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span>
              {new Date(event.starts_at).toLocaleDateString('ru', {
                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
              })}
            </span>
            {event.venue && <span>📍 {event.venue}</span>}
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-gray-700 whitespace-pre-line">{event.description}</p>
        )}

        {/* Capacity */}
        {spotsLeft !== null && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">{t('capacity')}:</span>
            <span className="font-medium">{event.attendee_count || 0} / {event.capacity}</span>
            <span className={`ml-auto text-xs font-medium ${spotsLeft > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {spotsLeft > 0 ? t('spots_left', { count: spotsLeft }) : t('full')}
            </span>
          </div>
        )}

        {/* RSVP */}
        {token && spotsLeft !== 0 && (
          <div className="flex gap-3">
            <button
              onClick={() => rsvp.mutate({ eventId: id, rsvpStatus: 'going' })}
              disabled={rsvp.isPending}
              className="flex-1 py-3 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {t('going')}
            </button>
            <button
              onClick={() => rsvp.mutate({ eventId: id, rsvpStatus: 'maybe' })}
              disabled={rsvp.isPending}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {t('maybe')}
            </button>
          </div>
        )}

        {/* Attendees */}
        {attendees.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">{t('attendees')} ({attendees.length})</h3>
            <div className="flex flex-wrap gap-2">
              {attendees.slice(0, 20).map((a: any) => (
                <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full text-xs">
                  <div className="w-5 h-5 bg-brand-200 rounded-full flex items-center justify-center text-brand-700 text-[10px] font-bold">
                    {(a.first_name || '?')[0]}
                  </div>
                  <span>{a.first_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
