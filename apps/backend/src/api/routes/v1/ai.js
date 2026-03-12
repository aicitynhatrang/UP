import { z } from 'zod'
import { authenticate, requireAdmin } from '../../middleware/authenticate.js'

// ── Schemas ──────────────────────────────────────────────────────────────────

const ChatBody = z.object({
  message: z.string().min(1).max(2000),
  lang:    z.enum(['ru', 'en', 'vi', 'zh', 'ko', 'ja', 'fr']).default('ru'),
  lat:     z.number().min(-90).max(90).optional(),
  lng:     z.number().min(-180).max(180).optional(),
})

const RecommendBody = z.object({
  query:        z.string().max(500).optional(),
  mood:         z.string().max(100).optional(),
  lat:          z.number().min(-90).max(90).optional(),
  lng:          z.number().min(-180).max(180).optional(),
  verticalSlug: z.string().optional(),
})

const ModerateTextBody = z.object({
  entityType: z.string().min(1),
  entityId:   z.string().uuid(),
  content:    z.string().min(1).max(10000),
})

const ModerateImageBody = z.object({
  entityType: z.string().min(1),
  entityId:   z.string().uuid(),
  imageUrl:   z.string().url(),
})

const ValidateReceiptBody = z.object({
  checkinId:  z.string().uuid(),
  providerId: z.string().uuid(),
  imageUrl:   z.string().url(),
})

const TranslateBody = z.object({
  text:        z.string().min(1).max(5000),
  targetLangs: z.array(z.string().length(2)).min(1).max(10),
})

const PaginationQuery = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ── Route registrar ─────────────────────────────────────────────────────────

export function registerAiRoutes(app, cradle) {
  const {
    chatbotService,
    moderationService,
    receiptValidationService,
    aiTranslationService,
  } = cradle

  // ════════════════════ Chatbot ════════════════════

  /** POST /ai/chat — send message to AI chatbot */
  app.post('/ai/chat', { preHandler: [authenticate] }, async (request) => {
    const { message, lang, lat, lng } = ChatBody.parse(request.body)
    const result = await chatbotService.chat(request.user.id, message, { lang, lat, lng })
    return { ok: true, data: result }
  })

  /** POST /ai/recommend — get AI recommendations */
  app.post('/ai/recommend', { preHandler: [authenticate] }, async (request) => {
    const body = RecommendBody.parse(request.body)
    const result = await chatbotService.getRecommendations(request.user.id, body)
    return { ok: true, data: result }
  })

  /** GET /ai/chat/history — get chat session history */
  app.get('/ai/chat/history', { preHandler: [authenticate] }, async (request) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await chatbotService.getHistory(request.user.id, { page, limit })
    return { ok: true, ...result }
  })

  /** GET /ai/chat/:sessionId — get specific chat session */
  app.get('/ai/chat/:sessionId', { preHandler: [authenticate] }, async (request) => {
    const result = await chatbotService.getSession(request.params.sessionId, request.user.id)
    return { ok: true, data: result }
  })

  // ════════════════════ Moderation ════════════════════

  /** POST /ai/moderate/text — moderate text content */
  app.post('/ai/moderate/text', { preHandler: [authenticate] }, async (request) => {
    const { entityType, entityId, content } = ModerateTextBody.parse(request.body)
    const result = await moderationService.moderateText(entityType, entityId, content)
    return { ok: true, data: result }
  })

  /** POST /ai/moderate/image — moderate image content */
  app.post('/ai/moderate/image', { preHandler: [authenticate] }, async (request) => {
    const { entityType, entityId, imageUrl } = ModerateImageBody.parse(request.body)
    const result = await moderationService.moderateImage(entityType, entityId, imageUrl)
    return { ok: true, data: result }
  })

  /** PUT /ai/moderate/:logId/override — admin override moderation */
  app.put('/ai/moderate/:logId/override', { preHandler: [authenticate, requireAdmin] }, async (request) => {
    const result = await moderationService.overrideModeration(request.params.logId, request.user.id)
    return { ok: true, data: result }
  })

  /** GET /ai/moderate/:entityType/:entityId — get moderation log */
  app.get('/ai/moderate/:entityType/:entityId', { preHandler: [authenticate] }, async (request) => {
    const result = await moderationService.getLog(request.params.entityType, request.params.entityId)
    return { ok: true, data: result }
  })

  // ════════════════════ Receipt Validation ════════════════════

  /** POST /ai/receipt/validate — validate receipt image */
  app.post('/ai/receipt/validate', { preHandler: [authenticate] }, async (request) => {
    const { checkinId, providerId, imageUrl } = ValidateReceiptBody.parse(request.body)
    const result = await receiptValidationService.validateReceipt({
      checkinId,
      userId: request.user.id,
      providerId,
      imageUrl,
    })
    return { ok: true, data: result }
  })

  /** GET /ai/receipt/:checkinId — get receipt validation result */
  app.get('/ai/receipt/:checkinId', { preHandler: [authenticate] }, async (request) => {
    const result = await receiptValidationService.getValidation(request.params.checkinId)
    return { ok: true, data: result }
  })

  // ════════════════════ Translation ════════════════════

  /** POST /ai/translate — translate text */
  app.post('/ai/translate', { preHandler: [authenticate] }, async (request) => {
    const { text, targetLangs } = TranslateBody.parse(request.body)
    const result = await aiTranslationService.translate(text, targetLangs)
    return { ok: true, data: result }
  })
}
