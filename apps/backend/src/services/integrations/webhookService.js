import { AppError } from '../../utils/errors.js'

const MAX_RETRIES = 3

export class WebhookService {
  #db
  #logger

  constructor({ supabaseAdmin, logger }) {
    this.#db = supabaseAdmin
    this.#logger = logger
  }

  /** Send a webhook to a target URL */
  async send(eventType, payload, targetUrl) {
    const { data: delivery, error: insertErr } = await this.#db
      .from('webhook_deliveries')
      .insert({
        event_type: eventType,
        payload,
        target_url: targetUrl,
        attempt_count: 1,
      })
      .select()
      .single()

    if (insertErr) throw new AppError('DB_ERROR', 500, insertErr.message)

    const result = await this.#deliver(delivery.id, targetUrl, payload)
    return result
  }

  /** Retry failed webhook deliveries */
  async retryFailed() {
    const { data: failed } = await this.#db
      .from('webhook_deliveries')
      .select('*')
      .is('delivered_at', null)
      .lt('attempt_count', MAX_RETRIES)
      .order('created_at', { ascending: true })
      .limit(50)

    if (!failed?.length) return { retried: 0 }

    let retried = 0
    for (const delivery of failed) {
      await this.#deliver(delivery.id, delivery.target_url, delivery.payload)
      retried++
    }

    this.#logger.info({ retried }, 'Webhook: retried failed deliveries')
    return { retried }
  }

  /** Get delivery log */
  async getDeliveries({ eventType, page = 1, limit = 50 }) {
    const from = (page - 1) * limit
    let query = this.#db
      .from('webhook_deliveries')
      .select('*', { count: 'exact' })

    if (eventType) query = query.eq('event_type', eventType)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  async #deliver(deliveryId, targetUrl, payload) {
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      })

      const responseBody = await response.text()

      await this.#db
        .from('webhook_deliveries')
        .update({
          response_status: response.status,
          response_body: responseBody.slice(0, 2000),
          delivered_at: response.ok ? new Date().toISOString() : null,
        })
        .eq('id', deliveryId)

      this.#logger.info(
        { deliveryId, targetUrl, status: response.status },
        'Webhook: delivered',
      )

      return { delivered: response.ok, status: response.status }
    } catch (err) {
      await this.#db
        .from('webhook_deliveries')
        .update({
          response_body: err.message,
          attempt_count: this.#db.rpc ? undefined : undefined,
        })
        .eq('id', deliveryId)

      // Increment attempt_count
      await this.#db.rpc('increment_webhook_attempt', { delivery_id: deliveryId }).catch(() => {
        // Fallback: manual increment
        this.#db
          .from('webhook_deliveries')
          .select('attempt_count')
          .eq('id', deliveryId)
          .single()
          .then(({ data }) => {
            if (data) {
              this.#db
                .from('webhook_deliveries')
                .update({ attempt_count: data.attempt_count + 1, response_body: err.message })
                .eq('id', deliveryId)
            }
          })
      })

      this.#logger.warn({ deliveryId, targetUrl, err: err.message }, 'Webhook: delivery failed')
      return { delivered: false, error: err.message }
    }
  }
}
