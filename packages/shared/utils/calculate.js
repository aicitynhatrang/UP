import { VERTICALS_CONFIG } from '../constants/verticals.js'
import { COMMISSION_SPLIT, REFERRAL_CHAIN, BLOGGER_REFERRAL_BY_VERTICAL } from '../constants/roles.js'
import { USER_LEVELS } from '../constants/statuses.js'

/**
 * Calculate commission breakdown for a confirmed order
 * @param {number} amountVnd - order amount in VND
 * @param {string} verticalSlug - vertical identifier
 * @returns {{ total, platform, businessReferrer, userReferrer, gamification }}
 */
export function calcCommission(amountVnd, verticalSlug) {
  const vertical = VERTICALS_CONFIG.find(v => v.slug === verticalSlug)
  if (!vertical) throw new Error(`Unknown vertical: ${verticalSlug}`)

  const total             = Math.round(amountVnd * (vertical.commissionPct / 100))
  const platform          = Math.round(total * (COMMISSION_SPLIT.PLATFORM_PCT          / 100))
  const businessReferrer  = Math.round(total * (COMMISSION_SPLIT.BUSINESS_REFERRER_PCT / 100))
  const userReferrer      = Math.round(total * (COMMISSION_SPLIT.USER_REFERRER_PCT     / 100))
  const gamification      = Math.round(total * (COMMISSION_SPLIT.GAMIFICATION_POOL_PCT / 100))

  return { total, platform, businessReferrer, userReferrer, gamification }
}

/**
 * Calculate user discount amount
 * @param {number} amountVnd
 * @param {string} verticalSlug
 */
export function calcDiscount(amountVnd, verticalSlug) {
  const vertical = VERTICALS_CONFIG.find(v => v.slug === verticalSlug)
  if (!vertical) throw new Error(`Unknown vertical: ${verticalSlug}`)
  return Math.round(amountVnd * (vertical.userDiscountPct / 100))
}

/**
 * Calculate multi-level referral earnings
 * @param {number} baseReferralVnd - base referral amount (userReferrer portion)
 * @param {'L1'|'L2'|'L3'} level
 */
export function calcReferral(baseReferralVnd, level) {
  const multiplier = REFERRAL_CHAIN[level] ?? 0
  return Math.round(baseReferralVnd * multiplier)
}

/**
 * Calculate blogger referral % based on vertical
 * @param {string} verticalSlug
 */
export function calcBloggerReferralPct(verticalSlug) {
  return BLOGGER_REFERRAL_BY_VERTICAL[verticalSlug] ?? 3
}

/**
 * Calculate cashback in VND based on user level
 * @param {number} amountVnd
 * @param {number} userLevel - 1–8
 */
export function calcCashback(amountVnd, userLevel) {
  const levelConfig = USER_LEVELS.find(l => l.level === userLevel)
  if (!levelConfig || levelConfig.cashbackPct === 0) return 0
  return Math.round(amountVnd * (levelConfig.cashbackPct / 100))
}

/**
 * Determine user level from lifetime_points
 * @param {number} lifetimePoints
 * @returns {object} level config object
 */
export function calcUserLevel(lifetimePoints) {
  const lvl = [...USER_LEVELS]
    .reverse()
    .find(l => lifetimePoints >= l.minPoints)
  return lvl ?? USER_LEVELS[0]
}

/**
 * Calculate Group Buy discount
 * @param {number} basePrice - price in VND
 * @param {number} participants
 * @param {Array<{minParticipants: number, discountPct: number}>} tiers
 */
export function calcGroupBuyDiscount(basePrice, participants, tiers) {
  const tier = [...tiers]
    .sort((a, b) => b.minParticipants - a.minParticipants)
    .find(t => participants >= t.minParticipants)
  if (!tier) return 0
  return Math.round(basePrice * (tier.discountPct / 100))
}
