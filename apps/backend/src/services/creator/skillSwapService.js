import { AppError } from '../../utils/errors.js'

export class SkillSwapService {
  #db
  #logger

  constructor({ supabaseAdmin, logger }) {
    this.#db = supabaseAdmin
    this.#logger = logger
  }

  /** List skill listings with optional tag/type filter */
  async listListings({ page = 1, limit = 20, offerType, tags }) {
    const from = (page - 1) * limit

    let query = this.#db
      .from('skill_listings')
      .select('*, users!inner(first_name, username, avatar_url)', { count: 'exact' })
      .eq('is_active', true)

    if (offerType) query = query.eq('offer_type', offerType)
    if (tags?.length) query = query.overlaps('skill_tags', tags)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return { data, total: count }
  }

  /** Get single listing */
  async getListing(listingId) {
    const { data, error } = await this.#db
      .from('skill_listings')
      .select('*, users(first_name, username, avatar_url)')
      .eq('id', listingId)
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 'Listing not found', 404)
    return data
  }

  /** Create a skill listing */
  async createListing(userId, payload) {
    const { data, error } = await this.#db
      .from('skill_listings')
      .insert({ ...payload, user_id: userId })
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    this.#logger.info({ listingId: data.id, userId }, 'SkillSwap: listing created')
    return data
  }

  /** Update own listing */
  async updateListing(listingId, userId, payload) {
    const { data, error } = await this.#db
      .from('skill_listings')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', listingId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 'Listing not found or not yours', 404)
    return data
  }

  /** Delete (deactivate) own listing */
  async deactivateListing(listingId, userId) {
    const { error } = await this.#db
      .from('skill_listings')
      .update({ is_active: false })
      .eq('id', listingId)
      .eq('user_id', userId)

    if (error) throw new AppError('DB_ERROR', error.message, 500)
  }

  /** Propose a swap deal between two listings */
  async proposeDeal(userAId, listingAId, listingBId, cashVnd = 0) {
    // Verify listing A belongs to userA
    const { data: listingA } = await this.#db
      .from('skill_listings')
      .select('id, user_id')
      .eq('id', listingAId)
      .eq('user_id', userAId)
      .single()

    if (!listingA) throw new AppError('FORBIDDEN', 'Listing A is not yours', 403)

    // Get listing B owner
    const { data: listingB } = await this.#db
      .from('skill_listings')
      .select('id, user_id')
      .eq('id', listingBId)
      .eq('is_active', true)
      .single()

    if (!listingB) throw new AppError('NOT_FOUND', 'Listing B not found', 404)
    if (listingB.user_id === userAId) throw new AppError('SELF_SWAP', 'Cannot swap with yourself', 400)

    const feeVnd = Math.round(cashVnd * 0.1) // 10% platform fee on cash portion

    const { data, error } = await this.#db
      .from('skill_swap_deals')
      .insert({
        listing_a_id: listingAId,
        listing_b_id: listingBId,
        user_a_id: userAId,
        user_b_id: listingB.user_id,
        cash_vnd: cashVnd,
        fee_vnd: feeVnd,
        status: 'proposed',
      })
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    this.#logger.info({ dealId: data.id }, 'SkillSwap: deal proposed')
    return data
  }

  /** Accept or reject a deal */
  async respondDeal(dealId, userBId, accept) {
    const { data: deal, error: fetchErr } = await this.#db
      .from('skill_swap_deals')
      .select('*')
      .eq('id', dealId)
      .eq('user_b_id', userBId)
      .eq('status', 'proposed')
      .single()

    if (fetchErr || !deal) throw new AppError('NOT_FOUND', 'Deal not found or already responded', 404)

    const newStatus = accept ? 'accepted' : 'rejected'
    const updates = { status: newStatus }
    if (accept) updates.completed_at = new Date().toISOString()

    const { data, error } = await this.#db
      .from('skill_swap_deals')
      .update(updates)
      .eq('id', dealId)
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    this.#logger.info({ dealId, newStatus }, 'SkillSwap: deal responded')
    return data
  }

  /** List deals for a user */
  async listDeals(userId, { page = 1, limit = 20 }) {
    const from = (page - 1) * limit

    const { data, count, error } = await this.#db
      .from('skill_swap_deals')
      .select('*, skill_listings!listing_a_id(title), skill_listings!listing_b_id(title)', { count: 'exact' })
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return { data, total: count }
  }
}
