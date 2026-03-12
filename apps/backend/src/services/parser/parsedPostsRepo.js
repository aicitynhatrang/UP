import { createHash } from 'crypto'
import { AppError }   from '../../utils/errors.js'

/**
 * DB operations for parsed_posts table.
 */
export class ParsedPostsRepo {
  constructor({ supabaseAdmin, redis, logger }) {
    this.db    = supabaseAdmin
    this.redis = redis
    this.log   = logger
  }

  /**
   * Generate SHA-256 hash for dedup.
   * Hash = sha256(channelId + messageId + text + date)
   */
  static buildHash(channelId, messageId, text, date) {
    return createHash('sha256')
      .update(`${channelId}:${messageId}:${text ?? ''}:${date}`)
      .digest('hex')
  }

  /**
   * Check if post was already processed (Redis cache → DB fallback).
   */
  async isDuplicate(hash) {
    const cacheKey = `parsed_posts:hash:${hash}`
    const cached   = await this.redis.get(cacheKey)
    if (cached) return true

    const { data } = await this.db
      .from('parsed_posts')
      .select('id')
      .eq('post_hash', hash)
      .maybeSingle()

    return data !== null
  }

  /**
   * Save parsed post record and cache hash for 24h.
   */
  async save(payload) {
    const { data, error } = await this.db
      .from('parsed_posts')
      .insert(payload)
      .select()
      .single()

    if (error) throw new AppError('PARSED_POST_SAVE_FAILED', 500, error.message)

    // Cache hash for 24h to avoid DB lookup on duplicates
    await this.redis.setex(`parsed_posts:hash:${payload.post_hash}`, 86400, '1')

    return data
  }

  /**
   * Mark post as AI-processed and applied to profile.
   */
  async markApplied(id) {
    await this.db
      .from('parsed_posts')
      .update({ ai_processed: true, applied_to_profile: true })
      .eq('id', id)
  }

  /**
   * Count AI-processed posts for provider today (rate limit check).
   */
  async countAiProcessedToday(providerId) {
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const { count, error } = await this.db
      .from('parsed_posts')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .eq('ai_processed', true)
      .gte('created_at', `${today}T00:00:00Z`)

    if (error) return 0
    return count ?? 0
  }
}
