import { FRAUD_THRESHOLDS } from '@allcity/shared/constants/limits'
import { POINTS_CONFIG } from '@allcity/shared/constants/statuses'
import { Errors } from '../../utils/errors.js'

/**
 * Handles geo check-ins with fraud detection:
 *  - Haversine distance check
 *  - Daily duplicate prevention
 *  - Impossible speed detection
 *  - Streak tracking
 */
export class CheckinService {
  constructor({ supabaseAdmin, geoService, pointsService, fraudConfig, logger }) {
    this.db     = supabaseAdmin
    this.geo    = geoService
    this.points = pointsService
    this.fraud  = fraudConfig
    this.log    = logger
  }

  /**
   * @param {string} userId
   * @param {string} providerId
   * @param {number} lat
   * @param {number} lng
   */
  async checkin(userId, providerId, lat, lng) {
    // 1. Get provider coords
    const { data: provider } = await this.db
      .from('providers')
      .select('id, lat, lng')
      .eq('id', providerId)
      .single()

    if (!provider) throw Errors.notFound('Provider not found')
    if (!provider.lat || !provider.lng) throw Errors.badRequest('Provider has no location')

    // 2. Distance check
    const distanceM = this.geo.distanceMeters(lat, lng, provider.lat, provider.lng)
    const maxRadius = this.fraud.checkin.radiusMeters

    if (distanceM > maxRadius) {
      throw Errors.badRequest(`Too far from venue (${Math.round(distanceM)}m, max ${maxRadius}m)`)
    }

    // 3. Daily duplicate check
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const { data: existing } = await this.db
      .from('checkins')
      .select('id')
      .eq('user_id', userId)
      .eq('provider_id', providerId)
      .eq('is_fraud', false)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
      .maybeSingle()

    if (existing) throw Errors.conflict('Already checked in here today')

    // 4. Impossible speed check
    const { data: lastCheckin } = await this.db
      .from('checkins')
      .select('lat, lng, created_at')
      .eq('user_id', userId)
      .eq('is_fraud', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let isFraud = false
    let fraudReason = null

    if (lastCheckin) {
      const impossible = this.geo.isImpossibleSpeed(
        lastCheckin.lat, lastCheckin.lng, new Date(lastCheckin.created_at),
        lat, lng, new Date(),
      )
      if (impossible) {
        isFraud = true
        fraudReason = 'impossible_speed'
        this.log.warn({ userId, providerId, distanceM }, 'CheckinService: impossible speed detected')
      }
    }

    // 5. Save checkin
    const pointsAmount = isFraud ? 0 : POINTS_CONFIG.CHECKIN
    const { data: checkin, error } = await this.db
      .from('checkins')
      .insert({
        user_id:        userId,
        provider_id:    providerId,
        lat,
        lng,
        distance_m:     Math.round(distanceM),
        points_awarded: pointsAmount,
        is_fraud:       isFraud,
        fraud_reason:   fraudReason,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw Errors.conflict('Already checked in here today')
      throw Errors.internal(error.message)
    }

    // 6. Award points + update streak
    if (!isFraud) {
      await this.points.award(userId, 'checkin', pointsAmount)
      await this.#updateStreak(userId)

      // Update provider checkin count
      await this.db.rpc('increment_checkin_count', { p_id: providerId }).catch(() => {
        // Fallback: manual increment
        this.db
          .from('providers')
          .update({ checkin_count: provider.checkin_count + 1 })
          .eq('id', providerId)
          .then(() => {})
      })
    }

    this.log.info({ userId, providerId, distanceM, isFraud }, 'CheckinService: checkin recorded')
    return { checkin, pointsAwarded: pointsAmount, isFraud }
  }

  async #updateStreak(userId) {
    const { data: streak } = await this.db
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const now = new Date()

    if (!streak) {
      await this.db.from('user_streaks').insert({
        user_id:        userId,
        current_streak: 1,
        longest_streak: 1,
        last_checkin_at: now.toISOString(),
      })
      return
    }

    const lastDate  = new Date(streak.last_checkin_at)
    const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60)

    let newStreak = streak.current_streak
    if (diffHours < 48) {
      newStreak += 1
    } else {
      newStreak = 1
    }

    const longest = Math.max(newStreak, streak.longest_streak)

    await this.db
      .from('user_streaks')
      .update({
        current_streak:  newStreak,
        longest_streak:  longest,
        last_checkin_at: now.toISOString(),
      })
      .eq('user_id', userId)

    // Streak bonus at multiples of 7
    if (newStreak > 0 && newStreak % 7 === 0) {
      await this.points.award(userId, 'streak_bonus', POINTS_CONFIG.STREAK_BONUS)
      this.log.info({ userId, streak: newStreak }, 'CheckinService: streak bonus awarded')
    }
  }
}
