import { z } from 'zod'
import { authenticate, requireAdmin } from '../../middleware/authenticate.js'
import { Errors } from '../../../utils/errors.js'

// ── Schemas ──────────────────────────────────────────────────────────────────

const StripeCheckoutBody = z.object({
  tierSlug:   z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl:  z.string().url(),
})

const OneTimeCheckoutBody = z.object({
  product:    z.string().min(1),
  priceUsd:   z.number().positive(),
  successUrl: z.string().url(),
  cancelUrl:  z.string().url(),
})

const StarsInvoiceBody = z.object({
  product:     z.string().min(1),
  starAmount:  z.number().int().positive(),
  description: z.string().max(500).optional(),
})

const ConfirmStarsBody = z.object({
  invoiceId:              z.string().uuid(),
  telegramPaymentChargeId: z.string().min(1),
})

const SubscribeBody = z.object({
  tierSlug:  z.string().min(1),
  paymentId: z.string().min(1),
})

const CreateDiscountBody = z.object({
  code:             z.string().max(30).optional(),
  discountPct:      z.number().min(0).max(100).optional(),
  discountFixedVnd: z.number().int().positive().optional(),
  maxUses:          z.number().int().positive().optional(),
  expiresAt:        z.string().datetime().optional(),
  providerId:       z.string().uuid().optional(),
  verticalSlug:     z.string().optional(),
  minOrderVnd:      z.number().int().min(0).optional(),
})

const ValidateDiscountBody = z.object({
  code:           z.string().min(1),
  orderAmountVnd: z.number().int().positive(),
  providerId:     z.string().uuid().optional(),
  verticalSlug:   z.string().optional(),
})

const PaginationQuery = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ── Route registrar ─────────────────────────────────────────────────────────

export function registerPaymentRoutes(app, cradle) {
  const {
    paymentService,
    subscriptionService,
    discountCodeService,
  } = cradle

  // ════════════════════ Subscriptions ════════════════════

  /** GET /subscriptions/tiers — list all available tiers */
  app.get('/subscriptions/tiers', async () => {
    return { ok: true, data: subscriptionService.getTiers() }
  })

  /** GET /subscriptions/:providerId — get current subscription */
  app.get('/subscriptions/:providerId', { preHandler: [authenticate] }, async (request) => {
    const sub = await subscriptionService.getSubscription(request.params.providerId)
    return { ok: true, data: sub }
  })

  /** POST /subscriptions/:providerId — activate/upgrade subscription */
  app.post('/subscriptions/:providerId', { preHandler: [authenticate] }, async (request) => {
    const { tierSlug, paymentId } = SubscribeBody.parse(request.body)
    const result = await subscriptionService.subscribe(request.params.providerId, tierSlug, paymentId)
    return { ok: true, data: result }
  })

  /** DELETE /subscriptions/:providerId — cancel auto-renew */
  app.delete('/subscriptions/:providerId', { preHandler: [authenticate] }, async (request) => {
    const result = await subscriptionService.cancel(request.params.providerId)
    return { ok: true, data: result }
  })

  /** GET /subscriptions/:providerId/payments — payment history */
  app.get('/subscriptions/:providerId/payments', { preHandler: [authenticate] }, async (request) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await subscriptionService.getPaymentHistory(request.params.providerId, { page, limit })
    return { ok: true, ...result }
  })

  /** GET /subscriptions/:providerId/features/:feature — check feature access */
  app.get('/subscriptions/:providerId/features/:feature', { preHandler: [authenticate] }, async (request) => {
    const hasAccess = await subscriptionService.hasFeatureAccess(
      request.params.providerId,
      request.params.feature,
    )
    return { ok: true, data: { hasAccess } }
  })

  // ════════════════════ Stripe ════════════════════

  /** POST /payments/stripe/checkout — create Stripe checkout for subscription */
  app.post('/payments/stripe/checkout', { preHandler: [authenticate] }, async (request) => {
    const { tierSlug, successUrl, cancelUrl } = StripeCheckoutBody.parse(request.body)
    const providerId = request.query.providerId
    if (!providerId) throw Errors.validation('providerId query param required')
    const result = await paymentService.createStripeCheckout(providerId, tierSlug, successUrl, cancelUrl)
    return { ok: true, data: result }
  })

  /** POST /payments/stripe/one-time — create Stripe checkout for one-time purchase */
  app.post('/payments/stripe/one-time', { preHandler: [authenticate] }, async (request) => {
    const { product, priceUsd, successUrl, cancelUrl } = OneTimeCheckoutBody.parse(request.body)
    const providerId = request.query.providerId
    if (!providerId) throw Errors.validation('providerId query param required')
    const result = await paymentService.createOneTimeCheckout(providerId, product, priceUsd, successUrl, cancelUrl)
    return { ok: true, data: result }
  })

  /** POST /payments/stripe/webhook — handle Stripe webhook events */
  app.post('/payments/stripe/webhook', async (request) => {
    const result = await paymentService.handleStripeWebhook(request.body)

    // If subscription was activated, update via subscriptionService
    if (result.action === 'subscription_activate') {
      await subscriptionService.subscribe(result.provider_id, result.tier, result.payment_id)
    }

    return { ok: true, data: result }
  })

  // ════════════════════ Telegram Stars ════════════════════

  /** POST /payments/stars/invoice — create Stars invoice */
  app.post('/payments/stars/invoice', { preHandler: [authenticate] }, async (request) => {
    const { product, starAmount, description } = StarsInvoiceBody.parse(request.body)
    const result = await paymentService.createStarsInvoice(request.user.id, product, starAmount, description)
    return { ok: true, data: result }
  })

  /** POST /payments/stars/confirm — confirm Stars payment */
  app.post('/payments/stars/confirm', { preHandler: [authenticate] }, async (request) => {
    const { invoiceId, telegramPaymentChargeId } = ConfirmStarsBody.parse(request.body)
    const result = await paymentService.confirmStarsPayment(invoiceId, telegramPaymentChargeId)
    return { ok: true, data: result }
  })

  // ════════════════════ Transactions ════════════════════

  /** GET /payments/transactions — get transaction history */
  app.get('/payments/transactions', { preHandler: [authenticate] }, async (request) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const filters = {
      userId: request.query.userId,
      providerId: request.query.providerId,
      type: request.query.type,
    }
    const result = await paymentService.getTransactions(filters, { page, limit })
    return { ok: true, ...result }
  })

  // ════════════════════ Discount Codes ════════════════════

  /** POST /discounts — create a discount code (admin) */
  app.post('/discounts', { preHandler: [authenticate, requireAdmin] }, async (request) => {
    const body = CreateDiscountBody.parse(request.body)
    const result = await discountCodeService.createCode({ ...body, createdBy: request.user.id })
    return { ok: true, data: result }
  })

  /** POST /discounts/validate — validate a discount code */
  app.post('/discounts/validate', { preHandler: [authenticate] }, async (request) => {
    const { code, orderAmountVnd, providerId, verticalSlug } = ValidateDiscountBody.parse(request.body)
    const result = await discountCodeService.validateCode(code, {
      orderAmountVnd,
      providerId,
      verticalSlug,
      userId: request.user.id,
    })
    return { ok: true, data: result }
  })

  /** GET /discounts — list discount codes (admin) */
  app.get('/discounts', { preHandler: [authenticate, requireAdmin] }, async (request) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await discountCodeService.listCodes({
      providerId: request.query.providerId,
      createdBy: request.query.createdBy,
      page,
      limit,
    })
    return { ok: true, ...result }
  })

  /** DELETE /discounts/:codeId — deactivate a discount code */
  app.delete('/discounts/:codeId', { preHandler: [authenticate] }, async (request) => {
    await discountCodeService.deactivateCode(request.params.codeId, request.user.id)
    return { ok: true }
  })
}
