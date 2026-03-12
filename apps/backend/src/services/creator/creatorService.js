import { AppError } from '../../utils/errors.js'
import { CREATOR_THRESHOLDS, REFERRAL_CHAIN, COMMISSION_SPLIT } from '@allcity/shared/constants/roles.js'

export class CreatorService {
  #db
  #logger

  constructor({ supabaseAdmin, logger }) {
    this.#db = supabaseAdmin
    this.#logger = logger
  }

  /** Check if user qualifies for Creator status */
  async checkCreatorEligibility(userId) {
    // Count referred businesses (confirmed)
    const { count: bizCount } = await this.#db
      .from('business_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', userId)
      .eq('status', 'confirmed')

    // Count referred users (who made at least 1 order)
    const { count: userCount } = await this.#db
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', userId)
      .eq('activated', true)

    const eligible =
      bizCount >= CREATOR_THRESHOLDS.MIN_BUSINESSES ||
      userCount >= CREATOR_THRESHOLDS.MIN_USERS

    return { eligible, bizCount, userCount, thresholds: CREATOR_THRESHOLDS }
  }

  /** Promote user to Creator */
  async promoteToCreator(userId) {
    const { eligible } = await this.checkCreatorEligibility(userId)
    if (!eligible) throw new AppError('NOT_ELIGIBLE', 400, 'Does not meet Creator thresholds')

    const { data: user, error } = await this.#db
      .from('users')
      .update({ is_creator: true })
      .eq('id', userId)
      .select('id, is_creator')
      .single()

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    this.#logger.info({ userId }, 'Creator: user promoted to Creator')
    return user
  }

  /** Get creator profile with aggregated stats */
  async getProfile(userId) {
    const { data: user, error } = await this.#db
      .from('users')
      .select('id, first_name, username, avatar_url, is_creator, creator_nft_address, lifetime_points, level, karma_score')
      .eq('id', userId)
      .single()

    if (error || !user) throw new AppError('NOT_FOUND', 404)

    // Parallel stats queries
    const [bizRefs, userRefs, earnings, products] = await Promise.all([
      this.#countBusinessReferrals(userId),
      this.#countUserReferrals(userId),
      this.#getEarningsSummary(userId),
      this.#countProducts(userId),
    ])

    return {
      ...user,
      stats: {
        businesses_referred: bizRefs,
        users_referred: userRefs,
        total_earned_vnd: earnings.total,
        pending_payout_vnd: earnings.pending,
        paid_out_vnd: earnings.paid,
        products_count: products,
      },
    }
  }

  /** Get referral tree (3 levels deep) */
  async getReferralTree(userId, { page = 1, limit = 20 }) {
    const from = (page - 1) * limit

    // L1: direct referrals
    const { data: l1Users, count: l1Count } = await this.#db
      .from('referrals')
      .select('referred_id, users!referrals_referred_id_fkey(first_name, username, avatar_url, lifetime_points, level), activated, created_at', { count: 'exact' })
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    // L2: referrals of L1 (aggregate count only)
    const l1Ids = (l1Users ?? []).map((r) => r.referred_id)
    let l2Count = 0
    let l3Count = 0

    if (l1Ids.length > 0) {
      const { count: c2 } = await this.#db
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .in('referrer_id', l1Ids)

      l2Count = c2 ?? 0

      // L3
      if (l2Count > 0) {
        const { data: l2Rows } = await this.#db
          .from('referrals')
          .select('referred_id')
          .in('referrer_id', l1Ids)

        const l2Ids = (l2Rows ?? []).map((r) => r.referred_id)
        if (l2Ids.length > 0) {
          const { count: c3 } = await this.#db
            .from('referrals')
            .select('id', { count: 'exact', head: true })
            .in('referrer_id', l2Ids)

          l3Count = c3 ?? 0
        }
      }
    }

    return {
      l1: { data: l1Users ?? [], total: l1Count ?? 0 },
      l2_count: l2Count,
      l3_count: l3Count,
      chain_percentages: REFERRAL_CHAIN,
    }
  }

  /** Get earnings breakdown by month */
  async getEarningsHistory(userId, { months = 6 }) {
    const since = new Date()
    since.setMonth(since.getMonth() - months)

    const { data, error } = await this.#db
      .from('creator_earnings')
      .select('*')
      .eq('creator_id', userId)
      .gte('period_start', since.toISOString())
      .order('period_start', { ascending: false })

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return data ?? []
  }

  /** Get business referral stats */
  async getBusinessReferrals(userId, { page = 1, limit = 20 }) {
    const from = (page - 1) * limit

    const { data, count, error } = await this.#db
      .from('blogger_referral_links')
      .select('*, providers(name, slug, avatar_url)', { count: 'exact' })
      .eq('blogger_id', userId)
      .order('total_earned_vnd', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }

  /** Dashboard KPIs for creator */
  async getDashboardKPIs(userId) {
    const [profile, tree, history] = await Promise.all([
      this.getProfile(userId),
      this.getReferralTree(userId, { page: 1, limit: 1 }),
      this.getEarningsHistory(userId, { months: 1 }),
    ])

    const thisMonth = history[0] ?? { business_earned_vnd: 0, user_earned_vnd: 0, marketplace_earned_vnd: 0 }

    return {
      level: profile.level,
      lifetime_points: profile.lifetime_points,
      is_creator: profile.is_creator,
      businesses_referred: profile.stats.businesses_referred,
      users_referred: profile.stats.users_referred,
      total_network: tree.l1.total + tree.l2_count + tree.l3_count,
      total_earned_vnd: profile.stats.total_earned_vnd,
      pending_payout_vnd: profile.stats.pending_payout_vnd,
      this_month_earned_vnd:
        (thisMonth.business_earned_vnd ?? 0) +
        (thisMonth.user_earned_vnd ?? 0) +
        (thisMonth.marketplace_earned_vnd ?? 0),
      commission_split: COMMISSION_SPLIT,
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  async #countBusinessReferrals(userId) {
    const { count } = await this.#db
      .from('blogger_referral_links')
      .select('id', { count: 'exact', head: true })
      .eq('blogger_id', userId)

    return count ?? 0
  }

  async #countUserReferrals(userId) {
    const { count } = await this.#db
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', userId)
      .eq('activated', true)

    return count ?? 0
  }

  async #getEarningsSummary(userId) {
    const { data } = await this.#db
      .from('creator_payouts')
      .select('amount_vnd, status')
      .eq('creator_id', userId)

    const rows = data ?? []
    const paid = rows
      .filter((r) => r.status === 'paid')
      .reduce((s, r) => s + r.amount_vnd, 0)
    const pending = rows
      .filter((r) => r.status === 'pending')
      .reduce((s, r) => s + r.amount_vnd, 0)

    // Total from referral links
    const { data: links } = await this.#db
      .from('blogger_referral_links')
      .select('total_earned_vnd')
      .eq('blogger_id', userId)

    const totalFromLinks = (links ?? []).reduce((s, l) => s + l.total_earned_vnd, 0)

    return { total: totalFromLinks, pending, paid }
  }

  async #countProducts(userId) {
    const { count } = await this.#db
      .from('creator_products')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', userId)

    return count ?? 0
  }
}
