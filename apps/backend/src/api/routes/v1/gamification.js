import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { Errors } from '../../../utils/errors.js'

const PaginationQuery = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

/**
 * Gamification routes: seasons, leaderboard, flash deals, group buy, mystery shopper, Club 77
 * Prefix: /api/v1/gamification
 */
export function registerGamificationRoutes(app, cradle) {
  const { seasonService, flashDealService, groupBuyService, mysteryShopperService, club77Service } = cradle

  // ══════════════════ Seasons & Leaderboard ══════════════════

  app.get('/gamification/season', async (_req, reply) => {
    const season = await seasonService.getActiveSeason()
    return reply.send(season)
  })

  app.get('/gamification/leaderboard', async (request, reply) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const season = await seasonService.getActiveSeason()
    if (!season) return reply.send({ data: [], total: 0 })
    const result = await seasonService.getLeaderboard(season.id, { page, limit })
    return reply.send(result)
  })

  app.get('/gamification/my-rank', { preHandler: [authenticate] }, async (request, reply) => {
    const season = await seasonService.getActiveSeason()
    if (!season) return reply.send({ rank: null, points: 0 })
    const result = await seasonService.getUserRank(request.userId, season.id)
    return reply.send(result)
  })

  // ══════════════════ Flash Deals ══════════════════

  app.get('/gamification/flash-deals', async (request, reply) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await flashDealService.listActive({ page, limit })
    return reply.send(result)
  })

  app.post('/gamification/flash-deals/:id/purchase', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await flashDealService.purchase(request.params.id, request.userId)
    return reply.status(201).send(result)
  })

  // ══════════════════ Group Buy ══════════════════

  app.get('/gamification/group-buys', async (request, reply) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await groupBuyService.listActive({ page, limit })
    return reply.send(result)
  })

  app.post('/gamification/group-buys/:id/join', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await groupBuyService.join(request.params.id, request.userId)
    return reply.status(201).send(result)
  })

  // ══════════════════ Mystery Shopper ══════════════════

  app.get('/gamification/mystery-tasks', { preHandler: [authenticate] }, async (request, reply) => {
    const tasks = await mysteryShopperService.listAvailable(request.userId)
    return reply.send(tasks)
  })

  app.post('/gamification/mystery-tasks/:id/claim', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await mysteryShopperService.claim(request.params.id, request.userId)
    return reply.send(result)
  })

  app.post('/gamification/mystery-tasks/:id/submit', { preHandler: [authenticate] }, async (request, reply) => {
    const body = request.body
    const result = await mysteryShopperService.submit(request.params.id, request.userId, body)
    return reply.send(result)
  })

  // ══════════════════ Club 77 ══════════════════

  app.get('/gamification/club-77/status', { preHandler: [authenticate] }, async (request, reply) => {
    const status = await club77Service.getStatus(request.userId)
    return reply.send(status)
  })

  app.get('/gamification/club-77/slots', async (_req, reply) => {
    const slots = await club77Service.getAvailableSlots()
    return reply.send(slots)
  })

  app.post('/gamification/club-77/join', { preHandler: [authenticate] }, async (request, reply) => {
    const { tier } = z.object({ tier: z.string() }).parse(request.body)
    const membership = await club77Service.join(request.userId, tier)
    return reply.status(201).send(membership)
  })

  app.get('/gamification/club-77/:tier/members', async (request, reply) => {
    const result = await club77Service.getMembers(request.params.tier)
    return reply.send(result)
  })
}
