const counters = new Map()

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 30

/**
 * Simple in-memory rate limiter per Telegram user.
 */
export function rateLimiter() {
  return async (ctx, next) => {
    const userId = ctx.from?.id
    if (!userId) return next()

    const now = Date.now()
    const key = `rl:${userId}`
    const entry = counters.get(key)

    if (!entry || now - entry.start > WINDOW_MS) {
      counters.set(key, { start: now, count: 1 })
      return next()
    }

    entry.count++
    if (entry.count > MAX_PER_WINDOW) {
      return ctx.reply('⏳ Too many requests. Please wait a moment.')
    }

    return next()
  }
}
