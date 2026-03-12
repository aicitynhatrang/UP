import { z } from 'zod'
import { authenticate, requireAdmin } from '../../../middleware/authenticate.js'

const PushSubscribeBody = z.object({
  endpoint:   z.string().url(),
  p256dh:     z.string().min(1),
  auth:       z.string().min(1),
  deviceInfo: z.record(z.unknown()).optional(),
})

const PushSendBody = z.object({
  title: z.string().min(1).max(200),
  body:  z.string().min(1).max(1000),
  icon:  z.string().url().optional(),
  url:   z.string().url().optional(),
})

const BulkPushBody = z.object({
  userIds:      z.array(z.string().uuid()).min(1).max(1000),
  notification: PushSendBody,
})

const CreateApiKeyBody = z.object({
  name:         z.string().min(1).max(100),
  providerId:   z.string().uuid().optional(),
  scopes:       z.array(z.string()).optional(),
  rateLimitRpm: z.number().int().positive().max(10000).optional(),
  expiresAt:    z.string().datetime().optional(),
})

const PaginationQuery = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export function registerExternalRoutes(app, cradle) {
  const { weatherService, pushService, webhookService, apiKeyService } = cradle

  // ════════════════════ Weather ════════════════════

  /** GET /weather — current weather */
  app.get('/weather', async () => {
    const data = await weatherService.getCurrent()
    return { ok: true, data }
  })

  /** GET /weather/forecast — 5-day forecast */
  app.get('/weather/forecast', async () => {
    const data = await weatherService.getForecast()
    return { ok: true, data }
  })

  /** GET /weather/alerts — active alerts */
  app.get('/weather/alerts', async () => {
    const data = await weatherService.getAlerts()
    return { ok: true, data }
  })

  // ════════════════════ Push Notifications ════════════════════

  /** POST /push/subscribe — register push subscription */
  app.post('/push/subscribe', { preHandler: [authenticate] }, async (request) => {
    const body = PushSubscribeBody.parse(request.body)
    const result = await pushService.subscribe(request.user.id, body)
    return { ok: true, data: result }
  })

  /** DELETE /push/subscribe — unsubscribe */
  app.delete('/push/subscribe', { preHandler: [authenticate] }, async (request) => {
    const { endpoint } = request.body ?? {}
    if (!endpoint) return { ok: false, error: 'endpoint required' }
    await pushService.unsubscribe(request.user.id, endpoint)
    return { ok: true }
  })

  /** GET /push/subscriptions — list my subscriptions */
  app.get('/push/subscriptions', { preHandler: [authenticate] }, async (request) => {
    const data = await pushService.getSubscriptions(request.user.id)
    return { ok: true, data }
  })

  /** POST /push/send — send push to a user (admin) */
  app.post('/push/send/:userId', { preHandler: [authenticate, requireAdmin] }, async (request) => {
    const notification = PushSendBody.parse(request.body)
    const result = await pushService.sendToUser(request.params.userId, notification)
    return { ok: true, data: result }
  })

  /** POST /push/send-bulk — send push to multiple users (admin) */
  app.post('/push/send-bulk', { preHandler: [authenticate, requireAdmin] }, async (request) => {
    const { userIds, notification } = BulkPushBody.parse(request.body)
    const result = await pushService.sendBulk(userIds, notification)
    return { ok: true, data: result }
  })

  // ════════════════════ Webhooks ════════════════════

  /** GET /webhooks/log — delivery log (admin) */
  app.get('/webhooks/log', { preHandler: [authenticate, requireAdmin] }, async (request) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await webhookService.getDeliveries({
      eventType: request.query.eventType,
      page,
      limit,
    })
    return { ok: true, ...result }
  })

  /** POST /webhooks/retry — retry failed deliveries (admin) */
  app.post('/webhooks/retry', { preHandler: [authenticate, requireAdmin] }, async () => {
    const result = await webhookService.retryFailed()
    return { ok: true, data: result }
  })

  // ════════════════════ API Keys ════════════════════

  /** POST /api-keys — create API key */
  app.post('/api-keys', { preHandler: [authenticate] }, async (request) => {
    const body = CreateApiKeyBody.parse(request.body)
    const result = await apiKeyService.createKey(request.user.id, body)
    return { ok: true, data: result }
  })

  /** GET /api-keys — list my API keys */
  app.get('/api-keys', { preHandler: [authenticate] }, async (request) => {
    const data = await apiKeyService.listKeys(request.user.id)
    return { ok: true, data }
  })

  /** DELETE /api-keys/:keyId — revoke API key */
  app.delete('/api-keys/:keyId', { preHandler: [authenticate] }, async (request) => {
    const result = await apiKeyService.revokeKey(request.params.keyId, request.user.id)
    return { ok: true, data: result }
  })
}
