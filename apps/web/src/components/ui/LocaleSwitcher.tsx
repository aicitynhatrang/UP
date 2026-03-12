'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config'

export function LocaleSwitcher() {
  const locale    = useLocale() as Locale
  const router    = useRouter()
  const pathname  = usePathname()
  const t         = useTranslations('auth')
  const [isPending, startTransition] = useTransition()

  function switchLocale(next: Locale) {
    if (next === locale) return
    // Replace the current locale prefix in the path
    const segments = pathname.split('/')
    segments[1] = next
    startTransition(() => {
      router.replace(segments.join('/'))
    })
  }

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label={t('language')}
        disabled={isPending}
      >
        <span>{localeFlags[locale]}</span>
        <span className="hidden sm:inline">{localeNames[locale]}</span>
        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {locales.map(l => (
          <button
            key={l}
            onClick={() => switchLocale(l)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
              l === locale ? 'text-brand-600 font-semibold' : 'text-gray-700'
            }`}
          >
            <span className="text-base">{localeFlags[l]}</span>
            <span>{localeNames[l]}</span>
            {l === locale && (
              <svg className="ml-auto w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
