import { randomBytes } from 'node:crypto'
import { AppError } from '../../utils/errors.js'

export class BloggerReferralService {
  #db
  #logger

  constructor({ supabaseAdmin, logger }) {
    this.#db = supabaseAdmin
    this.#logger = logger
  }

  /** Create referral link for a blogger–provider pair */
  async createLink(bloggerId, providerId) {
    // Check provider exists
    const { data: provider } = await this.#db
      .from('providers')
      .select('id')
      .eq('id', providerId)
      .single()

    if (!provider) throw new AppError('NOT_FOUND', 'Provider not found', 404)

    const code = randomBytes(6).toString('base64url')

    const { data, error } = await this.#db
      .from('blogger_referral_links')
      .upsert(
        { blogger_id: bloggerId, provider_id: providerId, code },
        { onConflict: 'blogger_id,provider_id', ignoreDuplicates: true },
      )
      .select()
      .single()

    // If upsert returned nothing (duplicate ignored), fetch existing
    if (!data) {
      const { data: existing } = await this.#db
        .from('blogger_referral_links')
        .select('*')
        .eq('blogger_id', bloggerId)
        .eq('provider_id', providerId)
        .single()

      return existing
    }

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    this.#logger.info({ linkId: data.id, bloggerId, providerId }, 'BloggerRef: link created')
    return data
  }

  /** List all links for a blogger */
  async listLinks(bloggerId, { page = 1, limit = 20 }) {
    const from = (page - 1) * limit

    const { data, count, error } = await this.#db
      .from('blogger_referral_links')
      .select('*, providers(name, slug)', { count: 'exact' })
      .eq('blogger_id', bloggerId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return { data, total: count }
  }

  /** Track a click on a referral link */
  async trackClick(code) {
    const { data, error } = await this.#db
      .from('blogger_referral_links')
      .select('id, provider_id')
      .eq('code', code)
      .single()

    if (!data || error) throw new AppError('NOT_FOUND', 'Link not found', 404)

    // Increment click count
    await this.#db.rpc('increment_field', {
      table_name: 'blogger_referral_links',
      field_name: 'click_count',
      row_id: data.id,
    }).catch(() => {
      // Fallback
      this.#db
        .from('blogger_referral_links')
        .update({ click_count: data.click_count + 1 })
        .eq('id', data.id)
        .then(() => {})
    })

    return { provider_id: data.provider_id }
  }

  /** Record a conversion (called when order completes via blogger link) */
  async recordConversion(code, earnedVnd) {
    const { data } = await this.#db
      .from('blogger_referral_links')
      .select('id, conversion_count, total_earned_vnd')
      .eq('code', code)
      .single()

    if (!data) return

    await this.#db
      .from('blogger_referral_links')
      .update({
        conversion_count: data.conversion_count + 1,
        total_earned_vnd: data.total_earned_vnd + earnedVnd,
      })
      .eq('id', data.id)

    this.#logger.info({ linkId: data.id, earnedVnd }, 'BloggerRef: conversion recorded')
  }

  /** Get stats for a single link */
  async getLinkStats(linkId, bloggerId) {
    const { data, error } = await this.#db
      .from('blogger_referral_links')
      .select('*, providers(name, slug)')
      .eq('id', linkId)
      .eq('blogger_id', bloggerId)
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 'Link not found', 404)
    return data
  }
}
