import { FLASH_DEAL_LIMITS } from '@allcity/shared/constants/limits'
import { Errors } from '../../utils/errors.js'

/**
 * Flash deals — time-limited discounted offers with slot tracking.
 */
export class FlashDealService {
  constructor({ supabaseAdmin, orderService, pointsService, logger }) {
    this.db     = supabaseAdmin
    this.orders = orderService
    this.points = pointsService
    this.log    = logger
  }

  async listActive({ page = 1, limit = 20 } = {}) {
    const now    = new Date().toISOString()
    const offset = (page - 1) * limit

    const { data, error, count } = await this.db
      .from('flash_deals')
      .select(`
        *,
        provider:providers!flash_deals_provider_id_fkey(id, name, slug, logo_url)
      `, { count: 'exact' })
      .eq('status', 'active')
      .lte('starts_at', now)
      .gte('ends_at', now)
      .gt('remaining_slots', 0)
      .order('ends_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw Errors.internal(error.message)
    return { data: data ?? [], total: count ?? 0, page, limit, totalPages: Math.ceil((count ?? 0) / limit) }
  }

  async purchase(dealId, userId) {
    const { data: deal, error } = await this.db
      .from('flash_deals')
      .select('*')
      .eq('id', dealId)
      .single()

    if (error || !deal) throw Errors.notFound('Deal not found')

    // Validations
    const now = new Date()
    if (deal.status !== 'active') throw Errors.conflict('Deal is not active')
    if (new Date(deal.ends_at) < now) throw Errors.conflict('Deal has expired')
    if (deal.remaining_slots <= 0) throw Errors.conflict('Deal is sold out')

    // Check duplicate
    const { data: existing } = await this.db
      .from('flash_deal_purchases')
      .select('id')
      .eq('deal_id', dealId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) throw Errors.conflict('Already purchased this deal')

    // Determine price (early bird?)
    const purchaseCount = deal.total_slots - deal.remaining_slots
    const isEarlyBird = purchaseCount < deal.early_bird_slots
    const pricePaid = isEarlyBird
      ? Math.round(deal.deal_price_vnd * (1 - deal.early_bird_pct / 100))
      : deal.deal_price_vnd

    // Decrement slots atomically
    const { data: updated, error: updateErr } = await this.db
      .from('flash_deals')
      .update({ remaining_slots: deal.remaining_slots - 1 })
      .eq('id', dealId)
      .gt('remaining_slots', 0)
      .select()
      .single()

    if (updateErr || !updated) throw Errors.conflict('Deal sold out')

    // Mark as sold_out if last slot
    if (updated.remaining_slots === 0) {
      await this.db.from('flash_deals').update({ status: 'sold_out' }).eq('id', dealId)
    }

    // Create purchase record
    const { data: purchase } = await this.db
      .from('flash_deal_purchases')
      .insert({
        deal_id:       dealId,
        user_id:       userId,
        is_early_bird: isEarlyBird,
        price_paid_vnd: pricePaid,
      })
      .select()
      .single()

    // Award points
    if (isEarlyBird) {
      await this.points.award(userId, 'early_bird', 50)
    }
    await this.points.award(userId, 'flash_deal', 30)

    this.log.info({ dealId, userId, isEarlyBird, pricePaid }, 'FlashDealService: purchase')
    return { purchase, isEarlyBird, pricePaid }
  }
}
