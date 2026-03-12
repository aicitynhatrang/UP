import * as Sentry from '@sentry/node'
import { logger } from '../utils/logger.js'

export function initSentry() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    logger.warn('SENTRY_DSN not set — error tracking disabled')
    return
  }
  Sentry.init({
    dsn,
    environment:   process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Strip PII from Sentry events
      if (event.user) {
        delete event.user.email
        delete event.user.ip_address
      }
      return event
    },
  })
  logger.info('Sentry initialized')
}

export { Sentry }
