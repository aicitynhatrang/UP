import { logger } from '../../utils/logger.js'

/**
 * Notification service — sends Telegram messages via BullMQ queue.
 * Full implementation in Phase 6 (bot integration).
 */
export class NotificationService {
  constructor({ telegramConfig, logger: log }) {
    this.botToken = telegramConfig.botToken
    this.adminId  = telegramConfig.adminTelegramId
    this.log      = log ?? logger
  }

  /**
   * Queue a push notification to a user.
   * @param {{ userId: string|number, type: string, data: object, lang: string }} payload
   */
  async send(payload) {
    this.log.debug('NotificationService.send (stub)', { type: payload.type, userId: payload.userId })
    // Phase 6: enqueue to BullMQ → bot sends via bot.telegram.sendMessage
  }

  /**
   * Send an alert to the admin Telegram account.
   */
  async alertAdmin(message) {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ chat_id: this.adminId, text: message, parse_mode: 'HTML' }),
      })
      if (!res.ok) {
        this.log.warn('alertAdmin failed', { status: res.status })
      }
    } catch (err) {
      this.log.error('alertAdmin error', { error: err.message })
    }
  }
}
