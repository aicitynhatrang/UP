import { SEASON } from '@allcity/shared/constants/limits'
import { Errors } from '../../utils/errors.js'

/**
 * Manages seasons (90-day cycles), rankings, and prize distribution.
 */
export class SeasonService {
  constructor({ supabaseAdmin, pointsService, logger }) {
    this.db     = supabaseAdmin
    this.points = pointsService
    this.log    = logger
  }

  async getActiveSeason() {
    const { data } = await this.db
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()
    return data
  }

  async createSeason({ name, startsAt, endsAt, prizePoolVnd }) {
    // Deactivate current
    await this.db.from('seasons').update({ is_active: false }).eq('is_active', true)

    const { data, error } = await this.db
      .from('seasons')
      .insert({ name, starts_at: startsAt, ends_at: endsAt, prize_pool_vnd: prizePoolVnd, is_active: true })
      .select()
      .single()

    if (error) throw Errors.internal(error.message)
    this.log.info({ seasonId: data.id, name }, 'SeasonService: season created')
    return data
  }

  async getLeaderboard(seasonId, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit

    const { data, error, count } = await this.db
      .from('season_rankings')
      .select(`
        *,
        user:users!season_rankings_user_id_fkey(id, first_name, last_name, avatar_url, level)
      `, { count: 'exact' })
      .eq('season_id', seasonId)
      .order('points', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw Errors.internal(error.message)

    return {
      data: (data ?? []).map((r, i) => ({ ...r, rank: offset + i + 1 })),
      total: count ?? 0,
      page, limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    }
  }

  async addSeasonPoints(userId, seasonId, points) {
    // Upsert ranking
    const { data: existing } = await this.db
      .from('season_rankings')
      .select('id, points')
      .eq('season_id', seasonId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      await this.db
        .from('season_rankings')
        .update({ points: existing.points + points })
        .eq('id', existing.id)
    } else {
      await this.db
        .from('season_rankings')
        .insert({ season_id: seasonId, user_id: userId, points })
    }
  }

  async getUserRank(userId, seasonId) {
    const { data } = await this.db
      .from('season_rankings')
      .select('points')
      .eq('season_id', seasonId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!data) return { rank: null, points: 0 }

    // Count users with more points
    const { count } = await this.db
      .from('season_rankings')
      .select('id', { count: 'exact', head: true })
      .eq('season_id', seasonId)
      .gt('points', data.points)

    return { rank: (count ?? 0) + 1, points: data.points }
  }
}
