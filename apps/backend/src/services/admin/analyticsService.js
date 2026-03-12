import { AppError } from '../../utils/errors.js'

export class AnalyticsService {
  #db
  #redis
  #logger

  constructor({ supabaseAdmin, redis, logger }) {
    this.#db = supabaseAdmin
    this.#redis = redis
    this.#logger = logger
  }

  /** Platform-wide KPIs (cached 5 min) */
  async getPlatformKPIs() {
    const cacheKey = 'analytics:platform_kpis'
    const cached = await this.#redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const [users, providers, orders, revenue, events] = await Promise.all([
      this.#userStats(),
      this.#providerStats(),
      this.#orderStats(),
      this.#revenueStats(),
      this.#eventStats(),
    ])

    const kpis = { users, providers, orders, revenue, events, generatedAt: new Date().toISOString() }
    await this.#redis.setex(cacheKey, 300, JSON.stringify(kpis))
    return kpis
  }

  /** Provider-specific analytics */
  async getProviderAnalytics(providerId, { days = 30 }) {
    const since = new Date(Date.now() - days * 86400000).toISOString()

    const [orders, revenue, checkins, reviews] = await Promise.all([
      this.#providerOrders(providerId, since),
      this.#providerRevenue(providerId, since),
      this.#providerCheckins(providerId, since),
      this.#providerReviews(providerId, since),
    ])

    return { providerId, period: { days, since }, orders, revenue, checkins, reviews }
  }

  /** User growth over time (daily counts for last N days) */
  async getUserGrowth(days = 30) {
    const since = new Date(Date.now() - days * 86400000).toISOString()

    const { data, error } = await this.#db
      .from('users')
      .select('created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    if (error) throw new AppError('DB_ERROR', 500, error.message)

    // Group by date
    const byDate = {}
    for (const row of data ?? []) {
      const date = row.created_at.slice(0, 10)
      byDate[date] = (byDate[date] ?? 0) + 1
    }

    return Object.entries(byDate).map(([date, count]) => ({ date, count }))
  }

  /** Order volume over time */
  async getOrderVolume(days = 30) {
    const since = new Date(Date.now() - days * 86400000).toISOString()

    const { data, error } = await this.#db
      .from('orders')
      .select('created_at, total_vnd, status')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    if (error) throw new AppError('DB_ERROR', 500, error.message)

    const byDate = {}
    for (const row of data ?? []) {
      const date = row.created_at.slice(0, 10)
      if (!byDate[date]) byDate[date] = { count: 0, total_vnd: 0 }
      byDate[date].count++
      byDate[date].total_vnd += row.total_vnd ?? 0
    }

    return Object.entries(byDate).map(([date, stats]) => ({ date, ...stats }))
  }

  /** Top providers by order count/revenue */
  async getTopProviders({ metric = 'orders', limit = 20 }) {
    if (metric === 'revenue') {
      const { data, error } = await this.#db
        .from('orders')
        .select('provider_id, providers(name, slug), total_vnd')
        .eq('status', 'completed')

      if (error) throw new AppError('DB_ERROR', 500, error.message)

      const byProvider = {}
      for (const row of data ?? []) {
        const pid = row.provider_id
        if (!byProvider[pid]) byProvider[pid] = { provider_id: pid, provider: row.providers, total_vnd: 0, count: 0 }
        byProvider[pid].total_vnd += row.total_vnd ?? 0
        byProvider[pid].count++
      }

      return Object.values(byProvider)
        .sort((a, b) => b.total_vnd - a.total_vnd)
        .slice(0, limit)
    }

    // Default: by order count
    const { data, error } = await this.#db
      .from('providers')
      .select('id, name, slug, rating, review_count, checkin_count')
      .order('checkin_count', { ascending: false })
      .limit(limit)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return data ?? []
  }

  /** Vertical distribution */
  async getVerticalDistribution() {
    const { data, error } = await this.#db
      .from('providers')
      .select('vertical_slug')
      .neq('status', 'rejected')

    if (error) throw new AppError('DB_ERROR', 500, error.message)

    const counts = {}
    for (const row of data ?? []) {
      counts[row.vertical_slug] = (counts[row.vertical_slug] ?? 0) + 1
    }

    return Object.entries(counts)
      .map(([vertical, count]) => ({ vertical, count }))
      .sort((a, b) => b.count - a.count)
  }

  /** Subscription tier distribution */
  async getSubscriptionDistribution() {
    const { data, error } = await this.#db
      .from('providers')
      .select('subscription_tier')

    if (error) throw new AppError('DB_ERROR', 500, error.message)

    const counts = {}
    for (const row of data ?? []) {
      const tier = row.subscription_tier ?? 'free'
      counts[tier] = (counts[tier] ?? 0) + 1
    }

    return Object.entries(counts)
      .map(([tier, count]) => ({ tier, count }))
      .sort((a, b) => b.count - a.count)
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  async #userStats() {
    const { count: total } = await this.#db.from('users').select('id', { count: 'exact', head: true })
    const today = new Date().toISOString().slice(0, 10)
    const { count: todayCount } = await this.#db
      .from('users').select('id', { count: 'exact', head: true })
      .gte('created_at', today)
    const { count: creators } = await this.#db
      .from('users').select('id', { count: 'exact', head: true })
      .eq('is_creator', true)

    return { total: total ?? 0, today: todayCount ?? 0, creators: creators ?? 0 }
  }

  async #providerStats() {
    const { count: total } = await this.#db.from('providers').select('id', { count: 'exact', head: true })
    const { count: active } = await this.#db
      .from('providers').select('id', { count: 'exact', head: true })
      .eq('status', 'active')
    const { count: pending } = await this.#db
      .from('providers').select('id', { count: 'exact', head: true })
      .eq('moderation_status', 'pending')

    return { total: total ?? 0, active: active ?? 0, pendingModeration: pending ?? 0 }
  }

  async #orderStats() {
    const { count: total } = await this.#db.from('orders').select('id', { count: 'exact', head: true })
    const today = new Date().toISOString().slice(0, 10)
    const { count: todayCount } = await this.#db
      .from('orders').select('id', { count: 'exact', head: true })
      .gte('created_at', today)
    const { count: completed } = await this.#db
      .from('orders').select('id', { count: 'exact', head: true })
      .eq('status', 'completed')

    return { total: total ?? 0, today: todayCount ?? 0, completed: completed ?? 0 }
  }

  async #revenueStats() {
    const { data } = await this.#db
      .from('transactions')
      .select('amount_vnd, type')

    const rows = data ?? []
    const totalVnd = rows.reduce((s, r) => s + (r.amount_vnd ?? 0), 0)
    const byType = {}
    for (const row of rows) {
      byType[row.type] = (byType[row.type] ?? 0) + (row.amount_vnd ?? 0)
    }

    return { total_vnd: totalVnd, by_type: byType }
  }

  async #eventStats() {
    const { count: total } = await this.#db.from('city_events').select('id', { count: 'exact', head: true })
    const { count: upcoming } = await this.#db
      .from('city_events').select('id', { count: 'exact', head: true })
      .gte('starts_at', new Date().toISOString())
      .eq('status', 'published')

    return { total: total ?? 0, upcoming: upcoming ?? 0 }
  }

  async #providerOrders(providerId, since) {
    const { count: total } = await this.#db
      .from('orders').select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId).gte('created_at', since)
    const { count: completed } = await this.#db
      .from('orders').select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId).eq('status', 'completed').gte('created_at', since)

    return { total: total ?? 0, completed: completed ?? 0 }
  }

  async #providerRevenue(providerId, since) {
    const { data } = await this.#db
      .from('transactions')
      .select('amount_vnd')
      .eq('provider_id', providerId)
      .gte('created_at', since)

    return { total_vnd: (data ?? []).reduce((s, r) => s + (r.amount_vnd ?? 0), 0) }
  }

  async #providerCheckins(providerId, since) {
    const { count } = await this.#db
      .from('checkins').select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId).gte('created_at', since)

    return { total: count ?? 0 }
  }

  async #providerReviews(providerId, since) {
    const { data } = await this.#db
      .from('reviews')
      .select('rating')
      .eq('provider_id', providerId)
      .gte('created_at', since)

    const reviews = data ?? []
    const avgRating = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0

    return { total: reviews.length, avg_rating: Math.round(avgRating * 100) / 100 }
  }
}
