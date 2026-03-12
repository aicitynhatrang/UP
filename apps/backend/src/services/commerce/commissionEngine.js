import { calcCommission, calcDiscount, calcReferral, calcBloggerReferralPct } from '@allcity/shared/utils/calculate'
import { AppError } from '../../utils/errors.js'

/**
 * Commission Engine — all money calculations live here.
 * No hardcoded percentages anywhere else in the codebase.
 * Full payment integration in Phase 9.
 */
export class CommissionEngine {
  constructor({ supabaseAdmin, logger }) {
    this.db  = supabaseAdmin
    this.log = logger
  }

  /**
   * Calculate and record commission for a confirmed order.
   * @param {string} orderId
   * @param {number} amountVnd
   * @param {string} verticalSlug
   * @param {{ businessReferrerId?: string, userReferrerId?: string }} referrers
   */
  async processOrderCommission(orderId, amountVnd, verticalSlug, referrers = {}) {
    const breakdown = calcCommission(amountVnd, verticalSlug)
    this.log.info('Commission calculated', { orderId, amountVnd, verticalSlug, breakdown })

    // Phase 9: disburse to wallets / escrow
    // For now: store breakdown on the order record
    const { error } = await this.db
      .from('orders')
      .update({ commission_vnd: breakdown.total })
      .eq('id', orderId)

    if (error) throw new AppError('COMMISSION_UPDATE_FAILED', 500, error.message)

    return breakdown
  }

  /**
   * Calculate discount for a user on a provider service.
   */
  getDiscountAmount(amountVnd, verticalSlug) {
    return calcDiscount(amountVnd, verticalSlug)
  }

  /**
   * Multi-level referral payout calculation.
   */
  getReferralPayouts(baseReferralVnd, verticalSlug) {
    const bloggerPct = calcBloggerReferralPct(verticalSlug)
    const base       = Math.round(baseReferralVnd * (bloggerPct / 100))
    return {
      l1: calcReferral(base, 'L1'),
      l2: calcReferral(base, 'L2'),
      l3: calcReferral(base, 'L3'),
    }
  }
}
