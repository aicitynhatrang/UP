import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Locale } from '@/i18n/config'

/** Merge Tailwind classes with clsx */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format VND amounts */
export function formatVnd(amount: number, short = false): string {
  if (short) {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M₫`
    if (amount >= 1_000)     return `${(amount / 1_000).toFixed(0)}K₫`
    return `${amount}₫`
  }
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

/** Format date by locale */
export function formatDate(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const localeMap: Record<Locale, string> = {
    ru: 'ru-RU', en: 'en-US', vi: 'vi-VN',
    zh: 'zh-CN', ko: 'ko-KR', de: 'de-DE', fr: 'fr-FR',
  }
  return d.toLocaleDateString(localeMap[locale], {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** Truncate text */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + '…'
}

/** Get localized string from JSONB field */
export function getLocalized(
  field: Record<string, string> | undefined | null,
  locale: Locale,
  fallback: Locale = 'en',
): string {
  if (!field) return ''
  return field[locale] ?? field[fallback] ?? field['ru'] ?? Object.values(field)[0] ?? ''
}
