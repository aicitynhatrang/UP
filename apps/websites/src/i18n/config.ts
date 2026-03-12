export const locales = ['ru', 'en', 'vi', 'zh', 'ko', 'de', 'fr'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'ru'

export const localeNames: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  vi: 'Tiếng Việt',
  zh: '中文',
  ko: '한국어',
  de: 'Deutsch',
  fr: 'Français',
}
