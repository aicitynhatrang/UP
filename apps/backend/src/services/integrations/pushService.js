import { AppError } from '../../utils/errors.js'

export class PushService {
  #db
  #logger

  constructor({ supabaseAdmin, logger }) {
    this.#db = supabaseAdmin
    this.#logger = logger
  }

  /** Register a Web Push subscription */
  async subscribe(userId, { endpoint, p256dh, auth, deviceInfo }) {
    const { data, error } = await this.#db
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          device_info: deviceInfo ?? {},
        },
        { onConflict: 'endpoint' },
      )
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    this.#logger.info({ userId, endpoint: endpoint.slice(0, 50) }, 'Push: subscribed')
    return data
  }

  /** Unsubscribe */
  async unsubscribe(userId, endpoint) {
    const { error } = await this.#db
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
  }

  /** Send push notification to a user */
  async sendToUser(userId, { title, body, icon, url, data: extraData }) {
    const { data: subs } = await this.#db
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (!subs?.length) return { sent: 0 }

    const { default: webpush } = await import('web-push')
    const vapidPublic = process.env.VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    const vapidEmail = process.env.VAPID_EMAIL ?? 'mailto:admin@allcity.vn'

    if (!vapidPublic || !vapidPrivate) {
      this.#logger.warn('Push: VAPID keys not configured')
      return { sent: 0 }
    }

    webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate)

    const payload = JSON.stringify({ title, body, icon, url, data: extraData })
    let sent = 0
    const expired = []

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        sent++
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expired.push(sub.endpoint)
        } else {
          this.#logger.warn({ err: err.message, endpoint: sub.endpoint.slice(0, 50) }, 'Push: send failed')
        }
      }
    }

    // Clean up expired subscriptions
    if (expired.length) {
      await this.#db
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expired)
    }

    this.#logger.info({ userId, sent, expired: expired.length }, 'Push: sent')
    return { sent, expired: expired.length }
  }

  /** Send push notification to multiple users */
  async sendBulk(userIds, notification) {
    let totalSent = 0
    for (const userId of userIds) {
      const { sent } = await this.sendToUser(userId, notification)
      totalSent += sent
    }
    return { totalSent, userCount: userIds.length }
  }

  /** Get user's push subscriptions */
  async getSubscriptions(userId) {
    const { data, error } = await this.#db
      .from('push_subscriptions')
      .select('id, endpoint, device_info, created_at')
      .eq('user_id', userId)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return data ?? []
  }
}
