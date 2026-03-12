import { AppError } from '../../utils/errors.js'

export class AdminService {
  #db
  #logger

  constructor({ supabaseAdmin, logger }) {
    this.#db = supabaseAdmin
    this.#logger = logger
  }

  // ════════════════════ Users ════════════════════

  /** List users with filters */
  async listUsers({ search, role, isCreator, page = 1, limit = 50 }) {
    const from = (page - 1) * limit
    let query = this.#db
      .from('users')
      .select('id, first_name, last_name, username, phone_encrypted, email_encrypted, role, is_creator, level, lifetime_points, karma_score, is_banned, created_at', { count: 'exact' })

    if (search) {
      query = query.or(`username.ilike.%${search}%,first_name.ilike.%${search}%`)
    }
    if (role) query = query.eq('role', role)
    if (isCreator !== undefined) query = query.eq('is_creator', isCreator)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }

  /** Ban/unban a user */
  async setUserBan(userId, isBanned, adminId) {
    const { data, error } = await this.#db
      .from('users')
      .update({ is_banned: isBanned })
      .eq('id', userId)
      .select('id, username, is_banned')
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 404)
    this.#logger.info({ userId, isBanned, adminId }, `Admin: user ${isBanned ? 'banned' : 'unbanned'}`)
    return data
  }

  /** Change user role */
  async setUserRole(userId, role, adminId) {
    const { data, error } = await this.#db
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select('id, username, role')
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 404)
    this.#logger.info({ userId, role, adminId }, 'Admin: user role changed')
    return data
  }

  // ════════════════════ Providers ════════════════════

  /** List providers with filters */
  async listProviders({ search, status, moderationStatus, verticalSlug, page = 1, limit = 50 }) {
    const from = (page - 1) * limit
    let query = this.#db
      .from('providers')
      .select('id, name, slug, vertical_slug, status, moderation_status, subscription_tier, rating, review_count, checkin_count, is_verified, created_at', { count: 'exact' })

    if (search) query = query.ilike('slug', `%${search}%`)
    if (status) query = query.eq('status', status)
    if (moderationStatus) query = query.eq('moderation_status', moderationStatus)
    if (verticalSlug) query = query.eq('vertical_slug', verticalSlug)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }

  /** Approve/reject a provider */
  async moderateProvider(providerId, action, adminId, note) {
    const moderationStatus = action === 'approve' ? 'approved' : 'rejected'
    const status = action === 'approve' ? 'active' : 'rejected'

    const { data, error } = await this.#db
      .from('providers')
      .update({ moderation_status: moderationStatus, status, moderation_note: note ?? null })
      .eq('id', providerId)
      .select('id, name, slug, status, moderation_status')
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 404)

    // Log moderation action
    await this.#db.from('moderation_log').insert({
      entity_type: 'provider',
      entity_id: providerId,
      action,
      moderator_id: adminId,
      note,
    })

    this.#logger.info({ providerId, action, adminId }, 'Admin: provider moderated')
    return data
  }

  /** Verify/unverify a provider */
  async setProviderVerified(providerId, isVerified, adminId) {
    const { data, error } = await this.#db
      .from('providers')
      .update({ is_verified: isVerified })
      .eq('id', providerId)
      .select('id, name, slug, is_verified')
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 404)
    this.#logger.info({ providerId, isVerified, adminId }, 'Admin: provider verification changed')
    return data
  }

  /** Feature/unfeature a provider */
  async setProviderFeatured(providerId, isFeatured, adminId) {
    const { data, error } = await this.#db
      .from('providers')
      .update({ is_featured: isFeatured })
      .eq('id', providerId)
      .select('id, name, slug, is_featured')
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 404)
    this.#logger.info({ providerId, isFeatured, adminId }, 'Admin: provider featured status changed')
    return data
  }

  // ════════════════════ Moderation Queue ════════════════════

  /** Get moderation queue (pending providers + reviews + content) */
  async getModerationQueue({ page = 1, limit = 50 }) {
    const from = (page - 1) * limit

    const { data, count, error } = await this.#db
      .from('providers')
      .select('id, name, slug, vertical_slug, owner_id, created_at, users!providers_owner_id_fkey(first_name, username)', { count: 'exact' })
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: true })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }

  /** Get moderation log */
  async getModerationLog({ entityType, page = 1, limit = 50 }) {
    const from = (page - 1) * limit
    let query = this.#db
      .from('moderation_log')
      .select('*, users!moderation_log_moderator_id_fkey(first_name, username)', { count: 'exact' })

    if (entityType) query = query.eq('entity_type', entityType)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }

  // ════════════════════ System Health ════════════════════

  /** Get system health overview */
  async getSystemHealth(redis) {
    const checks = {}

    // Redis
    try {
      await redis.ping()
      checks.redis = { status: 'ok' }
    } catch (err) {
      checks.redis = { status: 'error', message: err.message }
    }

    // DB
    try {
      const { error } = await this.#db.from('users').select('id', { head: true }).limit(1)
      checks.database = error ? { status: 'error', message: error.message } : { status: 'ok' }
    } catch (err) {
      checks.database = { status: 'error', message: err.message }
    }

    const allOk = Object.values(checks).every((c) => c.status === 'ok')

    return {
      status: allOk ? 'healthy' : 'degraded',
      checks,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    }
  }
}
