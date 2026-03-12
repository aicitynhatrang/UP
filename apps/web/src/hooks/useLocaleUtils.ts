'use client'

import { useLocale } from 'next-intl'
import { getLocalized, formatVnd, formatDate, truncate } from '@/lib/utils'
import type { Locale } from '@/i18n/config'

/**
 * Convenience hook that binds locale-aware utils to the current locale.
 */
export function useLocaleUtils() {
  const locale = useLocale() as Locale

  return {
    locale,
    /** Get localized string from a JSONB { ru, en, vi, ... } object */
    t: (field: Record<string, string> | undefined | null) =>
      getLocalized(field, locale),
    formatVnd,
    formatDate: (date: Date | string) => formatDate(date, locale),
    truncate,
  }
}
