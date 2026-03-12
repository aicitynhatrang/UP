import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'

// ── Schemas ──────────────────────────────────────────────────────────────────

const InitiateCallBody = z.object({
  toPhone:    z.string().min(5).max(20),
  providerId: z.string().uuid().optional(),
  orderId:    z.string().uuid().optional(),
})

const TtsBody = z.object({
  text:    z.string().min(1).max(5000),
  voiceId: z.string().optional(),
  lang:    z.enum(['ru', 'en', 'vi']).default('en'),
})

const PaginationQuery = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ── Route registrar ─────────────────────────────────────────────────────────

export function registerVoiceRoutes(app, cradle) {
  const { voiceCallService } = cradle

  /** POST /voice/call — initiate outbound call */
  app.post('/voice/call', { preHandler: [authenticate] }, async (request) => {
    const { toPhone, providerId, orderId } = InitiateCallBody.parse(request.body)
    const result = await voiceCallService.initiateCall(request.user.id, { providerId, orderId, toPhone })
    return { ok: true, data: result }
  })

  /** POST /voice/callback/status — Twilio status callback (no auth — Twilio calls this) */
  app.post('/voice/callback/status', async (request) => {
    const { CallSid, CallStatus, CallDuration } = request.body ?? {}
    if (!CallSid) return { ok: false }
    await voiceCallService.handleStatusCallback(
      CallSid,
      CallStatus,
      CallDuration ? parseInt(CallDuration, 10) : undefined,
    )
    return { ok: true }
  })

  /** POST /voice/callback/twiml — TwiML response for calls */
  app.post('/voice/callback/twiml', async (request, reply) => {
    const twiml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      '  <Say language="vi-VN">Xin chao. AllCity connecting your call.</Say>',
      '  <Pause length="1"/>',
      '  <Say language="en-US">Please wait while we connect you.</Say>',
      '</Response>',
    ].join('\n')

    return reply.type('text/xml').send(twiml)
  })

  /** POST /voice/tts — generate text-to-speech audio */
  app.post('/voice/tts', { preHandler: [authenticate] }, async (request, reply) => {
    const { text, voiceId, lang } = TtsBody.parse(request.body)
    const { audio, contentType } = await voiceCallService.generateTts(text, { voiceId, lang })
    return reply.type(contentType).send(audio)
  })

  /** GET /voice/calls — call history */
  app.get('/voice/calls', { preHandler: [authenticate] }, async (request) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await voiceCallService.getCallHistory(request.user.id, { page, limit })
    return { ok: true, ...result }
  })

  /** GET /voice/calls/:callId — get specific call */
  app.get('/voice/calls/:callId', { preHandler: [authenticate] }, async (request) => {
    const result = await voiceCallService.getCall(request.params.callId, request.user.id)
    return { ok: true, data: result }
  })
}
