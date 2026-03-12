import { z } from 'zod'
import { authenticate, requireAdmin } from '../../middleware/authenticate.js'

const PaginationQuery = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const ModerateProviderBody = z.object({
  action: z.enum(['approve', 'reject']),
  note:   z.string().max(1000).optional(),
})

const SetBanBody = z.object({
  isBanned: z.boolean(),
})

const SetRoleBody = z.object({
  role: z.enum(['user', 'admin', 'moderator']),
})

const SetVerifiedBody = z.object({
  isVerified: z.boolean(),
})

const SetFeaturedBody = z.object({
  isFeatured: z.boolean(),
})

export function registerAdminRoutes(app, cradle) {
  const { adminService, analyticsService } = cradle

  // All admin routes require authentication + admin role
  const preHandler = [authenticate, requireAdmin]

  // ════════════════════ Analytics ════════════════════

  /** GET /admin/analytics/kpis — platform KPIs */
  app.get('/admin/analytics/kpis', { preHandler }, async () => {
    const data = await analyticsService.getPlatformKPIs()
    return { ok: true, data }
  })

  /** GET /admin/analytics/users/growth — user growth chart data */
  app.get('/admin/analytics/users/growth', { preHandler }, async (request) => {
    const days = parseInt(request.query.days ?? '30', 10)
    const data = await analyticsService.getUserGrowth(days)
    return { ok: true, data }
  })

  /** GET /admin/analytics/orders/volume — order volume chart data */
  app.get('/admin/analytics/orders/volume', { preHandler }, async (request) => {
    const days = parseInt(request.query.days ?? '30', 10)
    const data = await analyticsService.getOrderVolume(days)
    return { ok: true, data }
  })

  /** GET /admin/analytics/providers/top — top providers */
  app.get('/admin/analytics/providers/top', { preHandler }, async (request) => {
    const metric = request.query.metric ?? 'orders'
    const limit = parseInt(request.query.limit ?? '20', 10)
    const data = await analyticsService.getTopProviders({ metric, limit })
    return { ok: true, data }
  })

  /** GET /admin/analytics/verticals — vertical distribution */
  app.get('/admin/analytics/verticals', { preHandler }, async () => {
    const data = await analyticsService.getVerticalDistribution()
    return { ok: true, data }
  })

  /** GET /admin/analytics/subscriptions — subscription tier distribution */
  app.get('/admin/analytics/subscriptions', { preHandler }, async () => {
    const data = await analyticsService.getSubscriptionDistribution()
    return { ok: true, data }
  })

  /** GET /admin/analytics/providers/:providerId — provider-specific analytics */
  app.get('/admin/analytics/providers/:providerId', { preHandler }, async (request) => {
    const days = parseInt(request.query.days ?? '30', 10)
    const data = await analyticsService.getProviderAnalytics(request.params.providerId, { days })
    return { ok: true, data }
  })

  // ════════════════════ User Management ════════════════════

  /** GET /admin/users — list users */
  app.get('/admin/users', { preHandler }, async (request) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await adminService.listUsers({
      search: request.query.search,
      role: request.query.role,
      isCreator: request.query.isCreator === 'true' ? true : undefined,
      page,
      limit,
    })
    return { ok: true, ...result }
  })

  /** PUT /admin/users/:userId/ban — ban/unban user */
  app.put('/admin/users/:userId/ban', { preHandler }, async (request) => {
    const { isBanned } = SetBanBody.parse(request.body)
    const data = await adminService.setUserBan(request.params.userId, isBanned, request.user.id)
    return { ok: true, data }
  })

  /** PUT /admin/users/:userId/role — change user role */
  app.put('/admin/users/:userId/role', { preHandler }, async (request) => {
    const { role } = SetRoleBody.parse(request.body)
    const data = await adminService.setUserRole(request.params.userId, role, request.user.id)
    return { ok: true, data }
  })

  // ════════════════════ Provider Management ════════════════════

  /** GET /admin/providers — list providers */
  app.get('/admin/providers', { preHandler }, async (request) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await adminService.listProviders({
      search: request.query.search,
      status: request.query.status,
      moderationStatus: request.query.moderationStatus,
      verticalSlug: request.query.verticalSlug,
      page,
      limit,
    })
    return { ok: true, ...result }
  })

  /** PUT /admin/providers/:providerId/moderate — approve/reject provider */
  app.put('/admin/providers/:providerId/moderate', { preHandler }, async (request) => {
    const { action, note } = ModerateProviderBody.parse(request.body)
    const data = await adminService.moderateProvider(request.params.providerId, action, request.user.id, note)
    return { ok: true, data }
  })

  /** PUT /admin/providers/:providerId/verify — verify/unverify */
  app.put('/admin/providers/:providerId/verify', { preHandler }, async (request) => {
    const { isVerified } = SetVerifiedBody.parse(request.body)
    const data = await adminService.setProviderVerified(request.params.providerId, isVerified, request.user.id)
    return { ok: true, data }
  })

  /** PUT /admin/providers/:providerId/feature — feature/unfeature */
  app.put('/admin/providers/:providerId/feature', { preHandler }, async (request) => {
    const { isFeatured } = SetFeaturedBody.parse(request.body)
    const data = await adminService.setProviderFeatured(request.params.providerId, isFeatured, request.user.id)
    return { ok: true, data }
  })

  // ════════════════════ Moderation Queue ════════════════════

  /** GET /admin/moderation/queue — pending moderation items */
  app.get('/admin/moderation/queue', { preHandler }, async (request) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await adminService.getModerationQueue({ page, limit })
    return { ok: true, ...result }
  })

  /** GET /admin/moderation/log — moderation history */
  app.get('/admin/moderation/log', { preHandler }, async (request) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await adminService.getModerationLog({
      entityType: request.query.entityType,
      page,
      limit,
    })
    return { ok: true, ...result }
  })

  // ════════════════════ System ════════════════════

  /** GET /admin/system/health — system health check */
  app.get('/admin/system/health', { preHandler }, async () => {
    const { redis } = cradle
    const data = await adminService.getSystemHealth(redis)
    return { ok: true, data }
  })
}
