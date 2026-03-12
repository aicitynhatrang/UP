import { AppError } from '../../utils/errors.js'
import { SUBSCRIPTION_TIERS } from '@allcity/shared/constants/statuses.js'

const TIERS_ORDER = ['free', 'starter', 'pro', 'business', 'enterprise']

export class SubscriptionService {
  #db
  #logger

  constructor({ supabaseAdmin, logger }) {
    this.#db = supabaseAdmin
    this.#logger = logger
  }

  /** Get current subscription for a provider */
  async getSubscription(providerId) {
    const { data, error } = await this.#db
      .from('providers')
      .select('id, subscription_tier, subscription_expires_at, parser_enabled')
      .eq('id', providerId)
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 404)

    const tier = SUBSCRIPTION_TIERS[data.subscription_tier?.toUpperCase()] ?? SUBSCRIPTION_TIERS.FREE
    const isActive = data.subscription_expires_at
      ? new Date(data.subscription_expires_at) > new Date()
      : data.subscription_tier === 'free'

    return {
      ...data,
      tierConfig: tier,
      isActive,
      daysRemaining: isActive && data.subscription_expires_at
        ? Math.ceil((new Date(data.subscription_expires_at) - new Date()) / 86400000)
        : null,
    }
  }

  /** Subscribe or upgrade a provider */
  async subscribe(providerId, tierSlug, paymentId) {
    const tierKey = tierSlug.toUpperCase()
    const tier = SUBSCRIPTION_TIERS[tierKey]
    if (!tier) throw new AppError('INVALID_TIER', 400, `Unknown tier: ${tierSlug}`)

    // Get current
    const { data: provider } = await this.#db
      .from('providers')
      .select('id, subscription_tier, subscription_expires_at')
      .eq('id', providerId)
      .single()

    if (!provider) throw new AppError('NOT_FOUND', 404)

    // Calculate new expiry (30 days from now or extend existing)
    const now = new Date()
    const currentExpiry = provider.subscription_expires_at
      ? new Date(provider.subscription_expires_at)
      : now

    const baseDate = currentExpiry > now ? currentExpiry : now
    const newExpiry = new Date(baseDate)
    newExpiry.setDate(newExpiry.getDate() + 30)

    // Update provider
    const { data: updated, error } = await this.#db
      .from('providers')
      .update({
        subscription_tier: tier.slug,
        subscription_expires_at: newExpiry.toISOString(),
        parser_enabled: tier.parserEnabled,
      })
      .eq('id', providerId)
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', 500, error.message)

    // Record in subscription_payments
    await this.#db
      .from('subscription_payments')
      .insert({
        provider_id: providerId,
        tier: tier.slug,
        amount_usd: tier.priceUsd,
        payment_id: paymentId,
        period_start: baseDate > now ? baseDate.toISOString() : now.toISOString(),
        period_end: newExpiry.toISOString(),
      })

    // Record transaction
    await this.#db
      .from('transactions')
      .insert({
        provider_id: providerId,
        type: 'subscription',
        amount_vnd: Math.round(tier.priceUsd * 25000),
        description: `Subscription: ${tier.name} (30 days)`,
        metadata: { tier: tier.slug, payment_id: paymentId },
      })

    this.#logger.info({ providerId, tier: tier.slug, expiresAt: newExpiry }, 'Subscription: activated')
    return {
      provider_id: providerId,
      tier: tier.slug,
      expires_at: newExpiry.toISOString(),
      parser_enabled: tier.parserEnabled,
    }
  }

  /** Cancel subscription (downgrade to free at expiry) */
  async cancel(providerId) {
    const { data, error } = await this.#db
      .from('providers')
      .update({ auto_renew: false })
      .eq('id', providerId)
      .select('id, subscription_tier, subscription_expires_at')
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 404)
    this.#logger.info({ providerId }, 'Subscription: cancelled (will expire at end of period)')
    return data
  }

  /** Check and expire overdue subscriptions (called by cron) */
  async expireOverdue() {
    const now = new Date().toISOString()

    const { data: expired, error } = await this.#db
      .from('providers')
      .update({
        subscription_tier: 'free',
        parser_enabled: false,
        ai_bot_enabled: false,
        website_enabled: false,
        social_enabled: false,
      })
      .lt('subscription_expires_at', now)
      .neq('subscription_tier', 'free')
      .select('id, name')

    if (error) {
      this.#logger.error({ error: error.message }, 'Subscription: expire check failed')
      return []
    }

    if (expired?.length) {
      this.#logger.info({ count: expired.length }, 'Subscription: expired providers downgraded')
    }
    return expired ?? []
  }

  /** Get payment history for a provider */
  async getPaymentHistory(providerId, { page = 1, limit = 20 }) {
    const from = (page - 1) * limit

    const { data, count, error } = await this.#db
      .from('subscription_payments')
      .select('*', { count: 'exact' })
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }

  /** List all tiers with pricing */
  getTiers() {
    return Object.values(SUBSCRIPTION_TIERS)
  }

  /** Check if provider has specific feature access */
  async hasFeatureAccess(providerId, feature) {
    const sub = await this.getSubscription(providerId)
    if (!sub.isActive) return false

    const tierIdx = TIERS_ORDER.indexOf(sub.tierConfig.slug)
    const featureRequirements = {
      parser: 3,      // business+
      aiBot: 2,       // pro+
      website: 1,     // starter+
      social: 2,      // pro+
      flashDeal: 2,   // pro+
      story: 3,       // business+
      abTest: 3,      // business+
      analytics: 1,   // starter+
    }

    const required = featureRequirements[feature]
    if (required === undefined) return true
    return tierIdx >= required
  }
}
