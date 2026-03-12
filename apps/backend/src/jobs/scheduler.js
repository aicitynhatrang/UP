import cron from 'node-cron'

/**
 * Registers and starts all recurring background jobs.
 * Uses node-cron for lightweight in-process scheduling.
 * Heavy tasks should be offloaded to BullMQ workers (separate files).
 *
 * @param {object} container - Awilix container (cradle)
 */
export function startScheduler(container) {
  const { logger } = container

  logger.info('Scheduler: starting jobs')

  // ── Daily cleanup: expire old parsed post hashes from Redis ──────────────
  // Every day at 03:00 server time (UTC+7 = ~20:00 UTC)
  cron.schedule('0 3 * * *', async () => {
    logger.info('Scheduler: [daily-cleanup] starting')
    try {
      // Nothing to do here — Redis TTL handles hash expiry automatically (86400s).
      // This slot reserved for future DB cleanup (soft-deleted rows, stale sessions, etc.)
      logger.info('Scheduler: [daily-cleanup] done')
    } catch (err) {
      logger.error({ err }, 'Scheduler: [daily-cleanup] failed')
    }
  })

  // ── Hourly: reset AI-processing counters (handled via Redis TTL) ─────────
  // No-op; counters use date-keyed Redis keys that expire naturally.

  // ── Hourly: expire overdue subscriptions ─────────────────────────────────
  cron.schedule('0 * * * *', async () => {
    logger.info('Scheduler: [subscription-expire] starting')
    try {
      const { subscriptionService } = container
      const expired = await subscriptionService.expireOverdue()
      logger.info({ count: expired.length }, 'Scheduler: [subscription-expire] done')
    } catch (err) {
      logger.error({ err }, 'Scheduler: [subscription-expire] failed')
    }
  })

  // ── Every 30 min: weather cache + alerts ─────────────────────────────────
  cron.schedule('*/30 * * * *', async () => {
    try {
      const { weatherService } = container
      await weatherService.getCurrent()
      await weatherService.checkAlerts()
      logger.info('Scheduler: [weather] cache refreshed')
    } catch (err) {
      logger.error({ err }, 'Scheduler: [weather] failed')
    }
  })

  // ── Every 5 min: health-check Redis connection ───────────────────────────
  cron.schedule('*/5 * * * *', async () => {
    try {
      const { redis } = container
      await redis.ping()
    } catch (err) {
      logger.error({ err }, 'Scheduler: [redis-ping] failed')
    }
  })

  logger.info('Scheduler: all jobs registered')
}
