'use client'

import { useProvider } from '@/lib/provider-context'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'

export function SiteFooter() {
  const provider = useProvider()
  const t = useTranslations('footer')
  const locale = useLocale()

  return (
    <footer className="bg-gray-50 border-t border-gray-100 mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-bold text-lg mb-2">{provider.name}</h3>
            {provider.description && (
              <p className="text-sm text-gray-500 line-clamp-3">{provider.description}</p>
            )}
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm mb-3">{t('navigation')}</h4>
            <nav className="space-y-2">
              <Link href={`/${locale}/services`} className="block text-sm text-gray-500 hover:text-brand-600">{t('services')}</Link>
              <Link href={`/${locale}/reviews`} className="block text-sm text-gray-500 hover:text-brand-600">{t('reviews')}</Link>
              <Link href={`/${locale}/gallery`} className="block text-sm text-gray-500 hover:text-brand-600">{t('gallery')}</Link>
              <Link href={`/${locale}/contact`} className="block text-sm text-gray-500 hover:text-brand-600">{t('contact')}</Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm mb-3">{t('contact_us')}</h4>
            <div className="space-y-2 text-sm text-gray-500">
              {provider.address && <p>{provider.address}</p>}
              {provider.phone && (
                <a href={`tel:${provider.phone}`} className="block hover:text-brand-600">{provider.phone}</a>
              )}
              {provider.email && (
                <a href={`mailto:${provider.email}`} className="block hover:text-brand-600">{provider.email}</a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <p>&copy; {new Date().getFullYear()} {provider.name}</p>
          <a
            href="https://allcity.vn"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-500 transition-colors"
          >
            {t('powered_by')}
          </a>
        </div>
      </div>
    </footer>
  )
}
