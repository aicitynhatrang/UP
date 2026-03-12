import { GROUP_BUY } from '@allcity/shared/constants/limits'
import { calcGroupBuyDiscount } from '@allcity/shared/utils/calculate'
import { Errors } from '../../utils/errors.js'

/**
 * Group buy — collective purchases with tiered discounts.
 */
export class GroupBuyService {
  constructor({ supabaseAdmin, logger }) {
    this.db  = supabaseAdmin
    this.log = logger
  }

  async listActive({ page = 1, limit = 20 } = {}) {
    const now    = new Date().toISOString()
    const offset = (page - 1) * limit

    const { data, error, count } = await this.db
      .from('group_buys')
      .select(`
        *,
        provider:providers!group_buys_provider_id_fkey(id, name, slug, logo_url)
      `, { count: 'exact' })
      .eq('status', 'open')
      .gte('deadline', now)
      .order('deadline', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw Errors.internal(error.message)
    return { data: data ?? [], total: count ?? 0, page, limit, totalPages: Math.ceil((count ?? 0) / limit) }
  }

  async join(groupBuyId, userId) {
    const { data: gb } = await this.db
      .from('group_buys')
      .select('*')
      .eq('id', groupBuyId)
      .single()

    if (!gb) throw Errors.notFound('Group buy not found')
    if (gb.status !== 'open') throw Errors.conflict('Group buy is not open')
    if (new Date(gb.deadline) < new Date()) throw Errors.conflict('Group buy expired')
    if (gb.current_participants >= gb.max_participants) throw Errors.conflict('Group buy is full')

    // Check already joined
    const { data: existing } = await this.db
      .from('group_buy_participants')
      .select('id')
      .eq('group_buy_id', groupBuyId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) throw Errors.conflict('Already joined')

    // Calculate current price
    const tiers = gb.tiers ?? []
    const newCount = gb.current_participants + 1
    const discount = calcGroupBuyDiscount(gb.base_price_vnd, newCount, tiers)
    const pricePaid = gb.base_price_vnd - discount

    // Add participant
    await this.db.from('group_buy_participants').insert({
      group_buy_id: groupBuyId,
      user_id:      userId,
      price_paid_vnd: pricePaid,
    })

    // Update count
    await this.db
      .from('group_buys')
      .update({ current_participants: newCount })
      .eq('id', groupBuyId)

    // Check if funded
    if (newCount >= gb.max_participants) {
      await this.db
        .from('group_buys')
        .update({ status: 'funded' })
        .eq('id', groupBuyId)
    }

    this.log.info({ groupBuyId, userId, participants: newCount }, 'GroupBuyService: joined')
    return { participants: newCount, pricePaid }
  }
}
