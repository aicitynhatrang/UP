import { POINTS_CONFIG, USER_LEVELS } from '@allcity/shared/constants/statuses'
import { AppError } from '../../utils/errors.js'

/**
 * Points & level management service.
 * Full implementation in Phase 7 — Gamification.
 */
export class PointsService {
  constructor({ supabaseAdmin, logger }) {
    this.db  = supabaseAdmin
    this.log = logger
  }

  /**
   * Award points to a user for an action.
   * Adds to both lifetime_points and balance_points.
   * Recalculates level (lifetime_points only, never downgrade).
   */
  async award(userId, action, amount = null) {
    const pts = amount ?? POINTS_CONFIG[action]
    if (!pts) throw new AppError(`UNKNOWN_POINTS_ACTION:${action}`, 500)

    const { data: user, error } = await this.db
      .from('users')
      .select('lifetime_points, balance_points, level')
      .eq('id', userId)
      .single()

    if (error || !user) throw new AppError('USER_NOT_FOUND', 404)

    const newLifetime = user.lifetime_points + pts
    const newBalance  = user.balance_points  + pts
    const newLevel    = this.#calcLevel(newLifetime)

    const { error: updateErr } = await this.db
      .from('users')
      .update({ lifetime_points: newLifetime, balance_points: newBalance, level: newLevel })
      .eq('id', userId)

    if (updateErr) throw new AppError('POINTS_UPDATE_FAILED', 500)

    // Log to points_log table
    await this.db.from('points_log').insert({
      user_id: userId,
      action,
      amount:  pts,
      balance_after: newBalance,
    })

    this.log.info('Points awarded', { userId, action, pts, newLifetime, newLevel })
    return { pts, newLifetime, newBalance, newLevel, leveledUp: newLevel > user.level }
  }

  /**
   * Deduct balance_points (for streak protection, purchases, etc.)
   */
  async spend(userId, amount, reason) {
    const { data: user, error } = await this.db
      .from('users')
      .select('balance_points')
      .eq('id', userId)
      .single()

    if (error || !user) throw new AppError('USER_NOT_FOUND', 404)
    if (user.balance_points < amount) throw new AppError('INSUFFICIENT_POINTS', 400)

    const newBalance = user.balance_points - amount
    await this.db.from('users').update({ balance_points: newBalance }).eq('id', userId)
    await this.db.from('points_log').insert({
      user_id: userId,
      action: `spend:${reason}`,
      amount: -amount,
      balance_after: newBalance,
    })

    return { newBalance }
  }

  /** Determine level from lifetime points */
  #calcLevel(lifetimePoints) {
    const lvl = [...USER_LEVELS]
      .reverse()
      .find(l => lifetimePoints >= l.minPoints)
    return lvl?.level ?? 1
  }
}
