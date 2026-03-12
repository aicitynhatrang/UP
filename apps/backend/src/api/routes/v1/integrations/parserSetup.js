import { z } from 'zod'
import { AppError } from '../../../../utils/errors.js'

const SetupBodySchema = z.object({
  provider_id:          z.string().uuid(),
  tg_channel_id:        z.number().int(),
  tg_channel_username:  z.string().optional(),
})

/**
 * GET  /api/v1/parser/setup/:providerId  — get parser status for provider
 * POST /api/v1/parser/setup              — register channel → provider link
 */
export function registerParserSetupRoutes(app, cradle) {
  app.get('/parser/setup/:providerId', async (request, reply) => {
    const { providerId } = request.params

    const { data, error } = await cradle.supabase
      .from('providers')
      .select('id, tg_channel_id, tg_channel_username, parser_enabled, parser_last_sync')
      .eq('id', providerId)
      .single()

    if (error || !data) throw new AppError('PROVIDER_NOT_FOUND', 404)

    return reply.send({ ok: true, data })
  })

  app.post('/parser/setup', async (request, reply) => {
    const body = SetupBodySchema.safeParse(request.body)
    if (!body.success) throw new AppError('VALIDATION_ERROR', 400, body.error.issues)

    const { provider_id, tg_channel_id, tg_channel_username } = body.data

    const { error } = await cradle.supabaseAdmin
      .from('providers')
      .update({
        tg_channel_id,
        tg_channel_username: tg_channel_username ?? null,
        parser_enabled: true,
      })
      .eq('id', provider_id)

    if (error) throw new AppError('PARSER_SETUP_FAILED', 500, error.message)

    return reply.status(200).send({ ok: true, data: { provider_id, tg_channel_id, parser_enabled: true } })
  })
}
