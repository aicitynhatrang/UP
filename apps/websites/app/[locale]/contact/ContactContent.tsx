'use client'

import { useProvider } from '@/lib/provider-context'
import { useTranslations } from 'next-intl'

export function ContactContent() {
  const provider = useProvider()
  const t = useTranslations('site')

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold">{t('contact_title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">{t('contact_info')}</h2>

          {provider.address && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5">📍</span>
              <div>
                <p className="text-sm font-medium">{t('address')}</p>
                <p className="text-sm text-gray-600">{provider.address}</p>
              </div>
            </div>
          )}

          {provider.phone && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5">📞</span>
              <div>
                <p className="text-sm font-medium">{t('phone')}</p>
                <a href={`tel:${provider.phone}`} className="text-sm text-brand-600 hover:underline">
                  {provider.phone}
                </a>
              </div>
            </div>
          )}

          {provider.email && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5">✉️</span>
              <div>
                <p className="text-sm font-medium">Email</p>
                <a href={`mailto:${provider.email}`} className="text-sm text-brand-600 hover:underline">
                  {provider.email}
                </a>
              </div>
            </div>
          )}

          {provider.tg_channel_username && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5">💬</span>
              <div>
                <p className="text-sm font-medium">Telegram</p>
                <a
                  href={`https://t.me/${provider.tg_channel_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-600 hover:underline"
                >
                  @{provider.tg_channel_username}
                </a>
              </div>
            </div>
          )}

          {provider.google_maps_url && (
            <a
              href={provider.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 btn-secondary text-sm"
            >
              {t('open_in_maps')}
            </a>
          )}
        </div>

        {/* Working hours */}
        {provider.working_hours && Object.keys(provider.working_hours).length > 0 && (
          <div className="card p-6">
            <h2 className="font-semibold mb-4">{t('working_hours')}</h2>
            <div className="space-y-2">
              {Object.entries(provider.working_hours).map(([day, hours]: [string, any]) => (
                <div key={day} className="flex justify-between text-sm py-1">
                  <span className="text-gray-600">{day}</span>
                  <span className="text-gray-800 font-medium">{hours.open} — {hours.close}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map embed */}
      {provider.location_lat && provider.location_lng && (
        <div className="card overflow-hidden">
          <iframe
            title="Location"
            src={`https://www.google.com/maps?q=${provider.location_lat},${provider.location_lng}&z=16&output=embed`}
            width="100%"
            height="350"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
    </div>
  )
}
