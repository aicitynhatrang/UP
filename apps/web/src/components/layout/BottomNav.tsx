'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useLocale, usePathname } from 'next-intl'

const tabs = [
  { key: 'home',     href: '',         icon: '🏠' },
  { key: 'catalog',  href: '/catalog', icon: '🔍' },
  { key: 'map',      href: '/map',     icon: '🗺️' },
  { key: 'orders',   href: '/orders',  icon: '📋' },
  { key: 'profile',  href: '/profile', icon: '👤' },
] as const

export function BottomNav() {
  const t        = useTranslations('nav')
  const locale   = useLocale()
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 pb-safe md:hidden">
      <div className="grid grid-cols-5 h-16">
        {tabs.map(tab => {
          const href    = `/${locale}${tab.href}`
          const isActive = pathname === href || (tab.href !== '' && pathname.startsWith(href))
          return (
            <Link
              key={tab.key}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                isActive ? 'text-brand-500' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className="font-medium">{t(tab.key)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
