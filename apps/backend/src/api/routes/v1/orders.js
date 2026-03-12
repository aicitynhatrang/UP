import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { Errors } from '../../../utils/errors.js'

const CreateOrderBody = z.object({
  providerId:   z.string().uuid(),
  serviceId:    z.string().uuid().optional(),
  verticalSlug: z.string().min(1),
  amountVnd:    z.number().int().positive(),
  notes:        z.string().max(500).optional(),
  scheduledAt:  z.string().datetime().optional(),
})

const UpdateStatusBody = z.object({
  status: z.enum(['accepted', 'in_progress', 'completed', 'disputed']),
})

const CancelBody = z.object({
  reason: z.string().max(500).optional(),
})

const SendMessageBody = z.object({
  content:  z.string().max(2000).optional(),
  type:     z.enum(['text', 'image', 'voice', 'system']).default('text'),
  mediaUrl: z.string().url().optional(),
})

const CreateReviewBody = z.object({
  rating: z.number().int().min(1).max(5),
  text:   z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(10).optional(),
})

const CheckinBody = z.object({
  providerId: z.string().uuid(),
  lat:        z.number().min(-90).max(90),
  lng:        z.number().min(-180).max(180),
})

const PaginationQuery = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
})

/**
 * Order routes — full lifecycle + chat + reviews + checkins
 * Prefix: /api/v1
 */
export function registerOrderRoutes(app, { orderService, checkinService }) {

  // ── POST /orders — create ──────────────────────────────────────────────
  app.post('/orders', { preHandler: [authenticate] }, async (request, reply) => {
    const body  = CreateOrderBody.parse(request.body)
    const order = await orderService.create({
      userId:       request.userId,
      providerId:   body.providerId,
      serviceId:    body.serviceId,
      verticalSlug: body.verticalSlug,
      amountVnd:    body.amountVnd,
      notes:        body.notes,
      scheduledAt:  body.scheduledAt,
    })
    return reply.status(201).send(order)
  })

  // ── GET /orders — list my orders ───────────────────────────────────────
  app.get('/orders', { preHandler: [authenticate] }, async (request, reply) => {
    const { page, limit, status } = PaginationQuery.parse(request.query)
    const result = await orderService.listByUser(request.userId, { page, limit, status })
    return reply.send(result)
  })

  // ── GET /orders/:id — detail ───────────────────────────────────────────
  app.get('/orders/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const order = await orderService.getById(request.params.id)

    // Only order owner or provider owner can view
    if (order.user_id !== request.userId) {
      const { data: provider } = await request.container.cradle.supabaseAdmin
        .from('providers')
        .select('owner_id')
        .eq('id', order.provider_id)
        .single()

      if (provider?.owner_id !== request.userId && !request.isAdmin) {
        throw Errors.forbidden('Not authorized to view this order')
      }
    }

    return reply.send(order)
  })

  // ── PATCH /orders/:id/status — update status ──────────────────────────
  app.patch('/orders/:id/status', { preHandler: [authenticate] }, async (request, reply) => {
    const { status } = UpdateStatusBody.parse(request.body)
    const order = await orderService.updateStatus(request.params.id, status, request.userId)
    return reply.send(order)
  })

  // ── POST /orders/:id/cancel — cancel order ────────────────────────────
  app.post('/orders/:id/cancel', { preHandler: [authenticate] }, async (request, reply) => {
    const { reason } = CancelBody.parse(request.body ?? {})
    const order = await orderService.cancel(request.params.id, request.userId, reason)
    return reply.send(order)
  })

  // ── GET /orders/:id/messages — chat history ────────────────────────────
  app.get('/orders/:id/messages', { preHandler: [authenticate] }, async (request, reply) => {
    const messages = await orderService.getMessages(request.params.id, {
      limit:  50,
      before: request.query.before,
    })
    return reply.send(messages)
  })

  // ── POST /orders/:id/messages — send message ──────────────────────────
  app.post('/orders/:id/messages', { preHandler: [authenticate] }, async (request, reply) => {
    const body = SendMessageBody.parse(request.body)
    const msg  = await orderService.sendMessage(request.params.id, request.userId, body)
    return reply.status(201).send(msg)
  })

  // ── POST /orders/:id/review — review after completion ──────────────────
  app.post('/orders/:id/review', { preHandler: [authenticate] }, async (request, reply) => {
    const body   = CreateReviewBody.parse(request.body)
    const review = await orderService.createReview(request.params.id, request.userId, body)
    return reply.status(201).send(review)
  })

  // ── POST /checkins — geo check-in ──────────────────────────────────────
  app.post('/checkins', { preHandler: [authenticate] }, async (request, reply) => {
    const body   = CheckinBody.parse(request.body)
    const result = await checkinService.checkin(request.userId, body.providerId, body.lat, body.lng)
    return reply.status(201).send(result)
  })
}
