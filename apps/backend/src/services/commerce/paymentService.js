import { AppError } from '../../utils/errors.js'

/**
 * Payment Service — handles Stripe checkout + Telegram Stars payments.
 * All payment methods go through this service for unified transaction logging.
 */
export class PaymentService {
  #db
  #logger
  #stripeKey

  constructor({ supabaseAdmin, logger, integrationsConfig }) {
    this.#db = supabaseAdmin
    this.#logger = logger
    this.#stripeKey = integrationsConfig.stripe.secretKey
  }

  // ══════════════════ Stripe ══════════════════

  /** Create a Stripe checkout session for subscription */
  async createStripeCheckout(providerId, tierSlug, successUrl, cancelUrl) {
    if (!this.#stripeKey) throw new AppError('STRIPE_NOT_CONFIGURED', 500)

    const { default: Stripe } = await import('stripe')
    const stripe = new Stripe(this.#stripeKey)

    const { data: provider } = await this.#db
      .from('providers')
      .select('id, name, owner_id')
      .eq('id', providerId)
      .single()

    if (!provider) throw new AppError('NOT_FOUND', 404)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `AllCity ${tierSlug} — 30 days` },
          unit_amount: this.#getTierPriceCents(tierSlug),
        },
        quantity: 1,
      }],
      metadata: {
        provider_id: providerId,
        tier: tierSlug,
        type: 'subscription',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    this.#logger.info({ providerId, tier: tierSlug, sessionId: session.id }, 'Payment: Stripe checkout created')
    return { sessionId: session.id, url: session.url }
  }

  /** Handle Stripe webhook event */
  async handleStripeWebhook(event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const { provider_id, tier, type } = session.metadata

        if (type === 'subscription') {
          // Record payment
          const { data: payment } = await this.#db
            .from('subscription_payments')
            .insert({
              provider_id,
              tier,
              amount_usd: session.amount_total / 100,
              payment_id: session.payment_intent,
              payment_method: 'stripe',
              stripe_session_id: session.id,
              period_start: new Date().toISOString(),
              period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
            })
            .select()
            .single()

          this.#logger.info({ providerId: provider_id, tier, paymentId: payment?.id }, 'Payment: Stripe subscription completed')
          return { action: 'subscription_activate', provider_id, tier, payment_id: session.payment_intent }
        }

        if (type === 'one_time') {
          await this.#db
            .from('transactions')
            .insert({
              provider_id,
              type: 'subscription',
              amount_vnd: Math.round((session.amount_total / 100) * 25000),
              description: session.metadata.description ?? 'One-time purchase',
              metadata: { stripe_session: session.id, product: session.metadata.product },
            })

          this.#logger.info({ providerId: provider_id, product: session.metadata.product }, 'Payment: Stripe one-time completed')
          return { action: 'one_time', provider_id, product: session.metadata.product }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object
        this.#logger.warn({ intentId: intent.id }, 'Payment: Stripe payment failed')
        return { action: 'payment_failed', intent_id: intent.id }
      }
    }

    return { action: 'ignored', type: event.type }
  }

  /** Create Stripe checkout for one-time purchase (boost, flash deal, etc.) */
  async createOneTimeCheckout(providerId, product, priceUsd, successUrl, cancelUrl) {
    if (!this.#stripeKey) throw new AppError('STRIPE_NOT_CONFIGURED', 500)

    const { default: Stripe } = await import('stripe')
    const stripe = new Stripe(this.#stripeKey)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `AllCity: ${product}` },
          unit_amount: Math.round(priceUsd * 100),
        },
        quantity: 1,
      }],
      metadata: {
        provider_id: providerId,
        type: 'one_time',
        product,
        description: `AllCity: ${product}`,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return { sessionId: session.id, url: session.url }
  }

  // ══════════════════ Telegram Stars ══════════════════

  /** Create a Telegram Stars invoice */
  async createStarsInvoice(userId, product, starAmount, description) {
    const { data: invoice, error } = await this.#db
      .from('stars_invoices')
      .insert({
        user_id: userId,
        product,
        star_amount: starAmount,
        description,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    this.#logger.info({ userId, product, starAmount, invoiceId: invoice.id }, 'Payment: Stars invoice created')
    return invoice
  }

  /** Confirm Telegram Stars payment (called from bot pre_checkout_query) */
  async confirmStarsPayment(invoiceId, telegramPaymentChargeId) {
    const { data: invoice, error: fetchErr } = await this.#db
      .from('stars_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('status', 'pending')
      .single()

    if (fetchErr || !invoice) throw new AppError('NOT_FOUND', 404, 'Invoice not found or already paid')

    const { error } = await this.#db
      .from('stars_invoices')
      .update({
        status: 'paid',
        telegram_charge_id: telegramPaymentChargeId,
        paid_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    if (error) throw new AppError('DB_ERROR', 500, error.message)

    // Record transaction
    await this.#db
      .from('transactions')
      .insert({
        user_id: invoice.user_id,
        type: 'subscription',
        amount_vnd: invoice.star_amount * 1000,
        description: `Telegram Stars: ${invoice.description}`,
        metadata: { invoice_id: invoiceId, stars: invoice.star_amount, charge_id: telegramPaymentChargeId },
      })

    this.#logger.info({ invoiceId, chargeId: telegramPaymentChargeId }, 'Payment: Stars payment confirmed')
    return { ...invoice, status: 'paid' }
  }

  // ══════════════════ Transaction History ══════════════════

  /** Get all transactions for a user or provider */
  async getTransactions(filters, { page = 1, limit = 20 }) {
    const from = (page - 1) * limit
    let query = this.#db
      .from('transactions')
      .select('*', { count: 'exact' })

    if (filters.userId) query = query.eq('user_id', filters.userId)
    if (filters.providerId) query = query.eq('provider_id', filters.providerId)
    if (filters.type) query = query.eq('type', filters.type)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  #getTierPriceCents(tierSlug) {
    const prices = { free: 0, starter: 1900, pro: 4900, business: 9900, enterprise: 19900 }
    return prices[tierSlug] ?? 0
  }
}
