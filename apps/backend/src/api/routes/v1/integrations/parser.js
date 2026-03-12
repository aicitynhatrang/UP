import { z } from 'zod'
import { AppError } from '../../../../utils/errors.js'
import { logger }   from '../../../../utils/logger.js'

const ChannelPostBodySchema = z.object({
  message_id:  z.number().int(),
  chat: z.object({
    id:   z.number().int(),
    type: z.literal('channel'),
  }),
  text:    z.string().optional(),
  caption: z.string().optional(),
  photo:   z.array(z.unknown()).optional(),
  date:    z.number().int(),
})

/**
 * POST /api/v1/parser/channel-post
 * Called by the Telegram bot when a channelPost event arrives.
 * Secured with WEBHOOK_SECRET_TOKEN header.
 */
export function registerParserRoutes(app, cradle) {
  app.post('/parser/channel-post', {
    config: { rateLimit: { max: 300, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    // Verify internal webhook secret
    const secret = request.headers['x-webhook-secret']
    if (secret !== process.env.WEBHOOK_SECRET_TOKEN) {
      throw new AppError('UNAUTHORIZED', 401)
    }

    const body = ChannelPostBodySchema.safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', 400, body.error.issues)
    }

    const post = body.data
    logger.debug('Parser channel-post received', { channelId: post.chat.id, messageId: post.message_id })

    const result = await cradle.channelParserService.handlePost(post)
    return reply.send({ ok: true, data: result })
  })
}
