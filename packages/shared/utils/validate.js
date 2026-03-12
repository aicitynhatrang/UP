/**
 * Validate Telegram initData HMAC-SHA256
 * Used on both backend and mini-app entry
 * @param {string} initData - raw initData string from Telegram.WebApp
 * @param {string} botToken
 * @returns {boolean}
 */
export async function validateTelegramInitData(initData, botToken) {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return false

  params.delete('hash')
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  // Web Crypto API — works in both Node 20 and browser
  const encoder = new TextEncoder()
  const secretKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const botKeyBuffer = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(botToken))
  const dataKey = await crypto.subtle.importKey(
    'raw',
    botKeyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signBuffer = await crypto.subtle.sign('HMAC', dataKey, encoder.encode(dataCheckString))
  const computedHash = Array.from(new Uint8Array(signBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computedHash === hash
}

/**
 * Check if a string is a valid UUID v4
 */
export function isUUID(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Check if value is a valid ISO 8601 date string
 */
export function isISODate(value) {
  return !isNaN(Date.parse(value))
}

/**
 * Sanitize user text input — trim, strip null bytes
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return ''
  return text.replace(/\0/g, '').trim()
}

/**
 * Check slug format: lowercase, hyphens only
 */
export function isValidSlug(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
}

/**
 * Validate that amount is a positive integer (VND cents-free)
 */
export function isValidVndAmount(amount) {
  return Number.isInteger(amount) && amount > 0
}

/**
 * Validate latitude/longitude pair
 */
export function isValidCoords(lat, lng) {
  return (
    typeof lat === 'number' && lat >= -90  && lat <= 90 &&
    typeof lng === 'number' && lng >= -180 && lng <= 180
  )
}
