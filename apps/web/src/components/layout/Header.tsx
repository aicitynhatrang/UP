'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher'

export function Header() {
  const t      = useTranslations('nav')
  const tc     = useTranslations('common')
  const locale = useLocale()

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2 font-bold text-xl text-brand-500">
          <span className="text-2xl">🏙️</span>
          <span>{tc('app_name')}</span>
        </Link>

        {/* Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { href: `/${locale}`,         label: t('home') },
            { href: `/${locale}/catalog`, label: t('catalog') },
            { href: `/${locale}/map`,     label: t('map') },
            { href: `/${locale}/events`,  label: t('notifications') },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-brand-500 rounded-lg hover:bg-brand-50 transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: locale + auth */}
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <Link
            href={`/${locale}/profile`}
            className="btn-primary text-sm py-2 px-4"
          >
            {t('profile')}
          </Link>
        </div>
      </div>
    </header>
  )
}
