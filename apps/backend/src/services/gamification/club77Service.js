import { CLUB_77_TIERS } from '@allcity/shared/constants/roles'
import { Errors } from '../../utils/errors.js'

/**
 * Club 77 — exclusive membership with 77 slots per tier.
 */
export class Club77Service {
  constructor({ supabaseAdmin, logger }) {
    this.db  = supabaseAdmin
    this.log = logger
  }

  async getStatus(userId) {
    const { data } = await this.db
      .from('club_77_memberships')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    return data
  }

  async getAvailableSlots() {
    const tiers = Object.entries(CLUB_77_TIERS)
    const result = {}

    for (const [tierName, config] of tiers) {
      const { count } = await this.db
        .from('club_77_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('tier', tierName)

      result[tierName] = {
        ...config,
        totalSlots: config.maxSlots,
        takenSlots: count ?? 0,
        available:  config.maxSlots - (count ?? 0),
      }
    }

    return result
  }

  async join(userId, tier) {
    const tierConfig = CLUB_77_TIERS[tier]
    if (!tierConfig) throw Errors.badRequest('Invalid tier')

    // Check if already member
    const { data: existing } = await this.db
      .from('club_77_memberships')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) throw Errors.conflict('Already a Club 77 member')

    // Check user meets requirements
    const { data: user } = await this.db
      .from('users')
      .select('level, lifetime_points')
      .eq('id', userId)
      .single()

    if (!user) throw Errors.notFound('User not found')

    // Check available slots
    const { count } = await this.db
      .from('club_77_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('tier', tier)

    if ((count ?? 0) >= tierConfig.maxSlots) {
      throw Errors.conflict(`No slots available in ${tier} tier`)
    }

    const slotNumber = (count ?? 0) + 1

    const { data: membership, error } = await this.db
      .from('club_77_memberships')
      .insert({
        user_id:     userId,
        tier,
        slot_number: slotNumber,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw Errors.conflict('Already a member')
      throw Errors.internal(error.message)
    }

    this.log.info({ userId, tier, slotNumber }, 'Club77Service: joined')
    return membership
  }

  async getMembers(tier, { page = 1, limit = 77 } = {}) {
    const offset = (page - 1) * limit

    const { data, count } = await this.db
      .from('club_77_memberships')
      .select(`
        *,
        user:users!club_77_memberships_user_id_fkey(id, first_name, last_name, avatar_url, level)
      `, { count: 'exact' })
      .eq('tier', tier)
      .order('slot_number')
      .range(offset, offset + limit - 1)

    return { data: data ?? [], total: count ?? 0 }
  }
}
