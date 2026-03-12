/**
 * Format VND currency: 200000 → "200,000 ₫"
 */
export function formatCurrency(amountVnd, short = false) {
  if (short && amountVnd >= 1000000) {
    return `${(amountVnd / 1000000).toFixed(1)}M ₫`
  }
  if (short && amountVnd >= 1000) {
    return `${(amountVnd / 1000).toFixed(0)}K ₫`
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amountVnd)
}

/**
 * Format USD: 49 → "$49"
 */
export function formatUsd(amount) {
  return `$${amount}`
}

/**
 * Format date to locale string
 * @param {string|Date} date
 * @param {string} lang - 'ru' | 'en' | 'vi'
 */
export function formatDate(date, lang = 'en') {
  const localeMap = { ru: 'ru-RU', en: 'en-US', vi: 'vi-VN', zh: 'zh-CN', ko: 'ko-KR', ja: 'ja-JP', fr: 'fr-FR' }
  return new Intl.DateTimeFormat(localeMap[lang] ?? 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Format relative time: "2 hours ago"
 */
export function formatRelativeTime(date, lang = 'en') {
  const localeMap = { ru: 'ru-RU', en: 'en-US', vi: 'vi-VN', zh: 'zh-CN', ko: 'ko-KR', ja: 'ja-JP', fr: 'fr-FR' }
  const rtf = new Intl.RelativeTimeFormat(localeMap[lang] ?? 'en-US', { numeric: 'auto' })
  const diffMs = new Date(date).getTime() - Date.now()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHr  = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHr / 24)

  if (Math.abs(diffSec) < 60)  return rtf.format(diffSec, 'second')
  if (Math.abs(diffMin) < 60)  return rtf.format(diffMin, 'minute')
  if (Math.abs(diffHr)  < 24)  return rtf.format(diffHr,  'hour')
  return rtf.format(diffDay, 'day')
}

/**
 * Format points with K suffix
 */
export function formatPoints(pts) {
  if (pts >= 1000) return `${(pts / 1000).toFixed(1)}K`
  return String(pts)
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLen = 100) {
  if (!text) return ''
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text
}
