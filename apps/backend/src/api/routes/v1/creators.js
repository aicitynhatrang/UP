import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireAdmin } from '../../middleware/authenticate.js'

const PaginationQuery = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * Creator Economy routes
 * Prefix: /api/v1/creators
 */
export function registerCreatorRoutes(app, cradle) {
  const {
    creatorService,
    creatorPayoutService,
    bloggerReferralService,
    creatorProductService,
    coInvestService,
    skillSwapService,
    nftService,
  } = cradle

  // ══════════════════ Creator Profile & Dashboard ══════════════════

  app.get('/creators/eligibility', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await creatorService.checkCreatorEligibility(request.userId)
    return reply.send({ ok: true, data: result })
  })

  app.post('/creators/promote', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await creatorService.promoteToCreator(request.userId)
    return reply.send({ ok: true, data: result })
  })

  app.get('/creators/profile', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await creatorService.getProfile(request.userId)
    return reply.send({ ok: true, data: result })
  })

  app.get('/creators/dashboard', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await creatorService.getDashboardKPIs(request.userId)
    return reply.send({ ok: true, data: result })
  })

  app.get('/creators/referral-tree', { preHandler: [authenticate] }, async (request, reply) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await creatorService.getReferralTree(request.userId, { page, limit })
    return reply.send({ ok: true, data: result })
  })

  app.get('/creators/earnings', { preHandler: [authenticate] }, async (request, reply) => {
    const months = z.coerce.number().int().min(1).max(24).default(6).parse(request.query.months)
    const result = await creatorService.getEarningsHistory(request.userId, { months })
    return reply.send({ ok: true, data: result })
  })

  app.get('/creators/business-referrals', { preHandler: [authenticate] }, async (request, reply) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await creatorService.getBusinessReferrals(request.userId, { page, limit })
    return reply.send({ ok: true, data: result })
  })

  // ══════════════════ Blogger Referral Links ══════════════════

  app.post('/creators/referral-links', { preHandler: [authenticate] }, async (request, reply) => {
    const { providerId } = z.object({ providerId: z.string().uuid() }).parse(request.body)
    const result = await bloggerReferralService.createLink(request.userId, providerId)
    return reply.status(201).send({ ok: true, data: result })
  })

  app.get('/creators/referral-links', { preHandler: [authenticate] }, async (request, reply) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await bloggerReferralService.listLinks(request.userId, { page, limit })
    return reply.send({ ok: true, data: result.data, meta: { total: result.total } })
  })

  app.get('/creators/referral-links/:id/stats', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await bloggerReferralService.getLinkStats(request.params.id, request.userId)
    return reply.send({ ok: true, data: result })
  })

  // Public: track click (no auth)
  app.get('/ref/:code', async (request, reply) => {
    const result = await bloggerReferralService.trackClick(request.params.code)
    return reply.send({ ok: true, data: result })
  })

  // ══════════════════ Payouts ══════════════════

  app.post('/creators/payouts', { preHandler: [authenticate] }, async (request, reply) => {
    const body = z.object({
      method: z.enum(['bank', 'crypto', 'wallet']),
      details: z.record(z.string()),
    }).parse(request.body)
    const result = await creatorPayoutService.requestPayout(request.userId, body)
    return reply.status(201).send({ ok: true, data: result })
  })

  app.get('/creators/payouts', { preHandler: [authenticate] }, async (request, reply) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await creatorPayoutService.listPayouts(request.userId, { page, limit })
    return reply.send({ ok: true, data: result.data, meta: { total: result.total } })
  })

  // Admin payout management
  app.get('/admin/payouts/pending', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await creatorPayoutService.listPendingPayouts({ page, limit })
    return reply.send({ ok: true, data: result.data, meta: { total: result.total } })
  })

  app.post('/admin/payouts/:id/approve', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const result = await creatorPayoutService.approvePayout(request.params.id, request.userId)
    return reply.send({ ok: true, data: result })
  })

  app.post('/admin/payouts/:id/pay', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const { txRef } = z.object({ txRef: z.string().min(1) }).parse(request.body)
    const result = await creatorPayoutService.markPaid(request.params.id, request.userId, txRef)
    return reply.send({ ok: true, data: result })
  })

  app.post('/admin/payouts/:id/reject', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const { reason } = z.object({ reason: z.string().min(1) }).parse(request.body)
    const result = await creatorPayoutService.rejectPayout(request.params.id, request.userId, reason)
    return reply.send({ ok: true, data: result })
  })

  // ══════════════════ NFT ══════════════════

  app.post('/creators/nft/mint', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await nftService.mintCreatorNft(request.userId)
    return reply.status(201).send({ ok: true, data: result })
  })

  app.get('/creators/nft', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await nftService.getNft(request.userId)
    return reply.send({ ok: true, data: result })
  })

  // ══════════════════ Creator Products (Marketplace) ══════════════════

  app.get('/marketplace/products', async (request, reply) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const type = request.query.type ?? null
    const result = await creatorProductService.listProducts({ page, limit, type })
    return reply.send({ ok: true, data: result.data, meta: { total: result.total } })
  })

  app.get('/marketplace/products/:id', async (request, reply) => {
    const result = await creatorProductService.getProduct(request.params.id)
    return reply.send({ ok: true, data: result })
  })

  app.post('/marketplace/products', { preHandler: [authenticate] }, async (request, reply) => {
    const body = z.object({
      title: z.record(z.string()),
      description: z.record(z.string()),
      type: z.enum(['course', 'template', 'guide', 'consultation']),
      price_vnd: z.number().int().min(10000),
      download_url: z.string().url().optional(),
      preview_url: z.string().url().optional(),
      tags: z.array(z.string()).default([]),
    }).parse(request.body)
    const result = await creatorProductService.createProduct(request.userId, body)
    return reply.status(201).send({ ok: true, data: result })
  })

  app.patch('/marketplace/products/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await creatorProductService.updateProduct(request.params.id, request.userId, request.body)
    return reply.send({ ok: true, data: result })
  })

  app.post('/marketplace/products/:id/purchase', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await creatorProductService.purchase(request.params.id, request.userId)
    return reply.status(201).send({ ok: true, data: result })
  })

  app.get('/marketplace/my-products', { preHandler: [authenticate] }, async (request, reply) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await creatorProductService.listMyProducts(request.userId, { page, limit })
    return reply.send({ ok: true, data: result.data, meta: { total: result.total } })
  })

  app.get('/marketplace/my-purchases', { preHandler: [authenticate] }, async (request, reply) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await creatorProductService.listPurchases(request.userId, { page, limit })
    return reply.send({ ok: true, data: result.data, meta: { total: result.total } })
  })

  // ══════════════════ Co-Invest ══════════════════

  app.get('/co-invest/rounds', async (request, reply) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const status = request.query.status ?? 'open'
    const result = await coInvestService.listRounds({ page, limit, status })
    return reply.send({ ok: true, data: result.data, meta: { total: result.total } })
  })

  app.get('/co-invest/rounds/:id', async (request, reply) => {
    const result = await coInvestService.getRound(request.params.id)
    return reply.send({ ok: true, data: result })
  })

  app.post('/co-invest/rounds', { preHandler: [authenticate] }, async (request, reply) => {
    const body = z.object({
      provider_id: z.string().uuid(),
      title: z.record(z.string()),
      description: z.record(z.string()),
      target_amount_vnd: z.number().int().min(1),
      min_investment_vnd: z.number().int().min(1),
      max_investment_vnd: z.number().int().optional(),
      expected_roi_pct: z.number().min(0).max(100),
      lockup_months: z.number().int().min(1).default(3),
      deadline: z.string().datetime(),
    }).parse(request.body)
    const result = await coInvestService.createRound(request.userId, body)
    return reply.status(201).send({ ok: true, data: result })
  })

  app.post('/co-invest/rounds/:id/invest', { preHandler: [authenticate] }, async (request, reply) => {
    const { amount_vnd } = z.object({ amount_vnd: z.number().int().min(1) }).parse(request.body)
    const result = await coInvestService.invest(request.params.id, request.userId, amount_vnd)
    return reply.status(201).send({ ok: true, data: result })
  })

  app.post('/co-invest/rounds/:id/vote', { preHandler: [authenticate] }, async (request, reply) => {
    const body = z.object({
      vote: z.enum(['approve', 'reject']),
      reason: z.string().optional(),
    }).parse(request.body)
    const result = await coInvestService.vote(request.params.id, request.userId, body.vote, body.reason)
    return reply.send({ ok: true, data: result })
  })

  app.get('/co-invest/rounds/:id/votes', async (request, reply) => {
    const result = await coInvestService.getVotes(request.params.id)
    return reply.send({ ok: true, data: result })
  })

  // ══════════════════ Skill Swap ══════════════════

  app.get('/skill-swap/listings', async (request, reply) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const offerType = request.query.offerType ?? null
    const tags = request.query.tags ? request.query.tags.split(',') : null
    const result = await skillSwapService.listListings({ page, limit, offerType, tags })
    return reply.send({ ok: true, data: result.data, meta: { total: result.total } })
  })

  app.get('/skill-swap/listings/:id', async (request, reply) => {
    const result = await skillSwapService.getListing(request.params.id)
    return reply.send({ ok: true, data: result })
  })

  app.post('/skill-swap/listings', { preHandler: [authenticate] }, async (request, reply) => {
    const body = z.object({
      title: z.record(z.string()),
      description: z.record(z.string()),
      offer_type: z.enum(['offer', 'request']),
      skill_tags: z.array(z.string()).min(1),
      price_vnd: z.number().int().optional(),
      swap_for: z.object({
        description: z.string().optional(),
        skills: z.array(z.string()).optional(),
      }).default({}),
    }).parse(request.body)
    const result = await skillSwapService.createListing(request.userId, body)
    return reply.status(201).send({ ok: true, data: result })
  })

  app.patch('/skill-swap/listings/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await skillSwapService.updateListing(request.params.id, request.userId, request.body)
    return reply.send({ ok: true, data: result })
  })

  app.delete('/skill-swap/listings/:id', { preHandler: [authenticate] }, async (request, reply) => {
    await skillSwapService.deactivateListing(request.params.id, request.userId)
    return reply.send({ ok: true })
  })

  app.post('/skill-swap/deals', { preHandler: [authenticate] }, async (request, reply) => {
    const body = z.object({
      listing_a_id: z.string().uuid(),
      listing_b_id: z.string().uuid(),
      cash_vnd: z.number().int().min(0).default(0),
    }).parse(request.body)
    const result = await skillSwapService.proposeDeal(request.userId, body.listing_a_id, body.listing_b_id, body.cash_vnd)
    return reply.status(201).send({ ok: true, data: result })
  })

  app.post('/skill-swap/deals/:id/respond', { preHandler: [authenticate] }, async (request, reply) => {
    const { accept } = z.object({ accept: z.boolean() }).parse(request.body)
    const result = await skillSwapService.respondDeal(request.params.id, request.userId, accept)
    return reply.send({ ok: true, data: result })
  })

  app.get('/skill-swap/my-deals', { preHandler: [authenticate] }, async (request, reply) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await skillSwapService.listDeals(request.userId, { page, limit })
    return reply.send({ ok: true, data: result.data, meta: { total: result.total } })
  })
}
