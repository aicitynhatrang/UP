import { ORDER_STATUSES, POINTS_CONFIG } from '@allcity/shared/constants/statuses'
import { calcDiscount } from '@allcity/shared/utils/calculate'
import { Errors } from '../../utils/errors.js'

/**
 * Manages the full order lifecycle:
 *  create → accept → in_progress → complete → commission + points
 *  or cancel / dispute at allowed stages.
 */
export class OrderService {
  constructor({ supabaseAdmin, commissionEngine, pointsService, notificationService, logger }) {
    this.db           = supabaseAdmin
    this.commission   = commissionEngine
    this.points       = pointsService
    this.notifications = notificationService
    this.log          = logger
  }

  // ── Create ──────────────────────────────────────────────────────────────

  async create({ userId, providerId, serviceId, verticalSlug, amountVnd, notes, scheduledAt }) {
    const discountVnd    = calcDiscount(amountVnd, verticalSlug)
    const finalAmountVnd = amountVnd - discountVnd

    const { data: order, error } = await this.db
      .from('orders')
      .insert({
        user_id:        userId,
        provider_id:    providerId,
        service_id:     serviceId ?? null,
        vertical_slug:  verticalSlug,
        amount_vnd:     amountVnd,
        discount_vnd:   discountVnd,
        final_amount_vnd: finalAmountVnd,
        notes:          notes ?? null,
        scheduled_at:   scheduledAt ?? null,
        status:         ORDER_STATUSES.PENDING,
        status_history: [{ status: ORDER_STATUSES.PENDING, at: new Date().toISOString(), by: userId }],
      })
      .select()
      .single()

    if (error) {
      this.log.error({ error }, 'OrderService: create failed')
      throw Errors.internal('Failed to create order')
    }

    // Notify provider
    this.notifications.send({
      type:    'new_order',
      orderId: order.id,
      providerId,
    }).catch(() => {})

    this.log.info({ orderId: order.id, userId, providerId }, 'OrderService: order created')
    return order
  }

  // ── Update status ───────────────────────────────────────────────────────

  async updateStatus(orderId, newStatus, actorId) {
    const order = await this.#getOrder(orderId)
    this.#validateTransition(order.status, newStatus)

    const historyEntry = { status: newStatus, at: new Date().toISOString(), by: actorId }
    const patch = {
      status:         newStatus,
      status_history: [...(order.status_history ?? []), historyEntry],
    }

    if (newStatus === ORDER_STATUSES.COMPLETED)  patch.completed_at  = new Date().toISOString()
    if (newStatus === ORDER_STATUSES.CANCELLED)  patch.cancelled_at  = new Date().toISOString()

    const { data, error } = await this.db
      .from('orders')
      .update(patch)
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw Errors.internal(error.message)

    // Side effects
    if (newStatus === ORDER_STATUSES.COMPLETED) {
      await this.#onComplete(data)
    }

    this.log.info({ orderId, from: order.status, to: newStatus }, 'OrderService: status updated')
    return data
  }

  // ── Cancel ──────────────────────────────────────────────────────────────

  async cancel(orderId, actorId, reason) {
    const order = await this.#getOrder(orderId)

    const allowed = [ORDER_STATUSES.PENDING, ORDER_STATUSES.ACCEPTED]
    if (!allowed.includes(order.status)) {
      throw Errors.conflict(`Cannot cancel order in status "${order.status}"`)
    }

    const { data, error } = await this.db
      .from('orders')
      .update({
        status:         ORDER_STATUSES.CANCELLED,
        cancelled_at:   new Date().toISOString(),
        cancel_reason:  reason ?? null,
        status_history: [
          ...(order.status_history ?? []),
          { status: ORDER_STATUSES.CANCELLED, at: new Date().toISOString(), by: actorId },
        ],
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw Errors.internal(error.message)
    this.log.info({ orderId, actorId, reason }, 'OrderService: order cancelled')
    return data
  }

  // ── Get order with provider data ────────────────────────────────────────

  async getById(orderId) {
    const { data, error } = await this.db
      .from('orders')
      .select(`
        *,
        provider:providers!orders_provider_id_fkey(id, name, slug, logo_url, vertical_slug),
        service:provider_services!orders_service_id_fkey(id, name, price_vnd)
      `)
      .eq('id', orderId)
      .single()

    if (error || !data) throw Errors.notFound('Order not found')
    return data
  }

  // ── List user orders ────────────────────────────────────────────────────

  async listByUser(userId, { page = 1, limit = 20, status } = {}) {
    const offset = (page - 1) * limit

    let query = this.db
      .from('orders')
      .select(`
        *,
        provider:providers!orders_provider_id_fkey(id, name, slug, logo_url)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw Errors.internal(error.message)

    return {
      data:       data ?? [],
      total:      count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    }
  }

  // ── List provider orders ────────────────────────────────────────────────

  async listByProvider(providerId, { page = 1, limit = 20, status } = {}) {
    const offset = (page - 1) * limit

    let query = this.db
      .from('orders')
      .select(`
        *,
        user:users!orders_user_id_fkey(id, first_name, last_name, avatar_url, level)
      `, { count: 'exact' })
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw Errors.internal(error.message)

    return {
      data:       data ?? [],
      total:      count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    }
  }

  // ── Chat messages ───────────────────────────────────────────────────────

  async getMessages(orderId, { limit = 50, before } = {}) {
    let query = this.db
      .from('order_messages')
      .select(`
        *,
        sender:users!order_messages_sender_id_fkey(id, first_name, avatar_url)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) query = query.lt('created_at', before)

    const { data, error } = await query
    if (error) throw Errors.internal(error.message)
    return (data ?? []).reverse()
  }

  async sendMessage(orderId, senderId, { content, type = 'text', mediaUrl }) {
    const { data, error } = await this.db
      .from('order_messages')
      .insert({
        order_id:  orderId,
        sender_id: senderId,
        content:   content ?? null,
        type,
        media_url: mediaUrl ?? null,
      })
      .select()
      .single()

    if (error) throw Errors.internal(error.message)
    return data
  }

  // ── Create review after order ───────────────────────────────────────────

  async createReview(orderId, userId, { rating, text, photos }) {
    const order = await this.#getOrder(orderId)

    if (order.user_id !== userId) throw Errors.forbidden('Not your order')
    if (order.status !== ORDER_STATUSES.COMPLETED) throw Errors.conflict('Order not completed')

    const { data, error } = await this.db
      .from('reviews')
      .insert({
        user_id:     userId,
        provider_id: order.provider_id,
        order_id:    orderId,
        rating,
        text:        text ?? null,
        photos:      photos ?? [],
        is_published: true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw Errors.conflict('Already reviewed this order')
      throw Errors.internal(error.message)
    }

    // Award points
    await this.points.award(userId, 'review_left', POINTS_CONFIG.REVIEW_LEFT)

    this.log.info({ orderId, userId, rating }, 'OrderService: review created')
    return data
  }

  // ─── Private ──────────────────────────────────────────────────────────

  async #getOrder(orderId) {
    const { data, error } = await this.db
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !data) throw Errors.notFound('Order not found')
    return data
  }

  async #onComplete(order) {
    try {
      // 1. Process commission
      const referrers = await this.#getReferrerChain(order.user_id)
      await this.commission.processOrderCommission(
        order.id,
        order.final_amount_vnd,
        order.vertical_slug,
        referrers,
      )

      // 2. Award points
      await this.points.award(order.user_id, 'order_complete', POINTS_CONFIG.ORDER_COMPLETE)

      // 3. Mark commission processed
      await this.db
        .from('orders')
        .update({ commission_processed: true })
        .eq('id', order.id)

    } catch (err) {
      this.log.error({ err, orderId: order.id }, 'OrderService: onComplete side-effects failed')
    }
  }

  async #getReferrerChain(userId) {
    const referrers = []
    let currentId = userId

    for (let level = 1; level <= 3; level++) {
      const { data } = await this.db
        .from('users')
        .select('id, referred_by')
        .eq('id', currentId)
        .single()

      if (!data?.referred_by) break
      referrers.push({ userId: data.referred_by, level })
      currentId = data.referred_by
    }

    return referrers
  }

  #validateTransition(from, to) {
    const allowed = {
      [ORDER_STATUSES.PENDING]:     [ORDER_STATUSES.ACCEPTED, ORDER_STATUSES.CANCELLED],
      [ORDER_STATUSES.ACCEPTED]:    [ORDER_STATUSES.IN_PROGRESS, ORDER_STATUSES.CANCELLED],
      [ORDER_STATUSES.IN_PROGRESS]: [ORDER_STATUSES.COMPLETED, ORDER_STATUSES.DISPUTED],
      [ORDER_STATUSES.COMPLETED]:   [],
      [ORDER_STATUSES.CANCELLED]:   [],
      [ORDER_STATUSES.DISPUTED]:    [ORDER_STATUSES.COMPLETED, ORDER_STATUSES.CANCELLED],
    }

    if (!allowed[from]?.includes(to)) {
      throw Errors.conflict(`Cannot transition from "${from}" to "${to}"`)
    }
  }
}
