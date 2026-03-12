'use client'

import { useProvider } from '@/lib/provider-context'
import { useTranslations, useLocale } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'

export default function ProviderHomePage() {
  const provider = useProvider()
  const t = useTranslations('site')
  const locale = useLocale()

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-center justify-center text-center text-white overflow-hidden">
        {provider.cover_url ? (
          <>
            <Image
              src={provider.cover_url}
              alt={provider.name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/50" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-brand-700" />
        )}
        <div className="relative z-10 px-4 py-16 max-w-2xl">
          {provider.logo_url && (
            <Image
              src={provider.logo_url}
              alt={provider.name}
              width={80}
              height={80}
              className="rounded-2xl mx-auto mb-6 shadow-lg"
            />
          )}
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{provider.name}</h1>
          {provider.description && (
            <p className="text-lg text-white/90 mb-8">{provider.description}</p>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={`/${locale}/services`} className="btn-primary">
              {t('view_services')}
            </Link>
            <Link href={`/${locale}/contact`} className="btn-secondary bg-white/20 text-white hover:bg-white/30">
              {t('contact_us')}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-8 text-center">
          {provider.avg_rating && (
            <div>
              <p className="text-2xl font-bold text-brand-600">{provider.avg_rating.toFixed(1)}</p>
              <p className="text-xs text-gray-500">{t('rating')}</p>
            </div>
          )}
          {provider.review_count != null && (
            <div>
              <p className="text-2xl font-bold">{provider.review_count}</p>
              <p className="text-xs text-gray-500">{t('reviews')}</p>
            </div>
          )}
          {provider.vertical && (
            <div>
              <p className="text-sm font-semibold text-gray-700">{provider.vertical}</p>
              <p className="text-xs text-gray-500">{t('category')}</p>
            </div>
          )}
        </div>
      </section>

      {/* Working hours quick view */}
      {provider.working_hours && Object.keys(provider.working_hours).length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-10">
          <h2 className="text-xl font-bold mb-4">{t('working_hours')}</h2>
          <div className="card p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(provider.working_hours).map(([day, hours]: [string, any]) => (
                <div key={day} className="flex justify-between text-sm py-1.5">
                  <span className="text-gray-600 font-medium">{day}</span>
                  <span className="text-gray-500">{hours.open} — {hours.close}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Photos preview */}
      {provider.photos && provider.photos.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{t('photos')}</h2>
            <Link href={`/${locale}/gallery`} className="text-brand-500 text-sm font-medium hover:underline">
              {t('see_all')}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {provider.photos.slice(0, 4).map((url: string, i: number) => (
              <div key={i} className="aspect-square relative rounded-xl overflow-hidden">
                <Image src={url} alt="" fill className="object-cover hover:scale-105 transition-transform" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-brand-50 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">{t('cta_title')}</h2>
          <p className="text-gray-600 mb-6">{t('cta_subtitle')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {provider.phone && (
              <a href={`tel:${provider.phone}`} className="btn-primary">
                {t('call_now')}
              </a>
            )}
            {provider.tg_channel_username && (
              <a
                href={`https://t.me/${provider.tg_channel_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Telegram
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
