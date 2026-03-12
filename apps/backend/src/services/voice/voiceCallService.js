import { AppError } from '../../utils/errors.js'

export class VoiceCallService {
  #db
  #voiceConfig
  #logger

  constructor({ supabaseAdmin, voiceConfig, logger }) {
    this.#db = supabaseAdmin
    this.#voiceConfig = voiceConfig
    this.#logger = logger
  }

  /** Initiate an outbound call via Twilio */
  async initiateCall(userId, { providerId, orderId, toPhone }) {
    const twilio = await this.#getTwilioClient()
    const cfg = this.#voiceConfig.twilio

    const call = await twilio.calls.create({
      to: toPhone,
      from: cfg.phoneNumber,
      url: `${cfg.callbackUrl}/twiml`,
      statusCallback: `${cfg.callbackUrl}/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      timeout: cfg.callTimeoutSec,
    })

    const { data, error } = await this.#db
      .from('voice_calls')
      .insert({
        user_id: userId,
        provider_id: providerId ?? null,
        order_id: orderId ?? null,
        twilio_call_sid: call.sid,
        direction: 'outbound',
        status: 'initiated',
      })
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    this.#logger.info({ callId: data.id, sid: call.sid, userId }, 'VoiceCall: initiated')
    return data
  }

  /** Handle Twilio status callback */
  async handleStatusCallback(callSid, status, duration) {
    const updates = { status }
    if (status === 'completed') {
      updates.ended_at = new Date().toISOString()
      updates.duration_sec = duration ?? 0
    }

    const { data, error } = await this.#db
      .from('voice_calls')
      .update(updates)
      .eq('twilio_call_sid', callSid)
      .select()
      .single()

    if (error || !data) {
      this.#logger.warn({ callSid, status }, 'VoiceCall: status callback — call not found')
      return null
    }

    this.#logger.info({ callId: data.id, callSid, status, duration }, 'VoiceCall: status updated')
    return data
  }

  /** Generate TTS audio via ElevenLabs */
  async generateTts(text, { voiceId, lang = 'en' } = {}) {
    const cfg = this.#voiceConfig.elevenLabs
    const vid = voiceId ?? cfg.defaultVoiceId

    const response = await fetch(`${cfg.baseUrl}/text-to-speech/${vid}`, {
      method: 'POST',
      headers: {
        'xi-api-key': cfg.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: cfg.modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      this.#logger.error({ status: response.status, errText }, 'VoiceCall: TTS failed')
      throw new AppError('TTS_FAILED', 502, 'Text-to-speech generation failed')
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer())
    this.#logger.info({ chars: text.length, voiceId: vid }, 'VoiceCall: TTS generated')
    return { audio: audioBuffer, contentType: 'audio/mpeg' }
  }

  /** Get call history for a user */
  async getCallHistory(userId, { page = 1, limit = 20 }) {
    const from = (page - 1) * limit

    const { data, count, error } = await this.#db
      .from('voice_calls')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }

  /** Get a single call by ID */
  async getCall(callId, userId) {
    const { data, error } = await this.#db
      .from('voice_calls')
      .select('*')
      .eq('id', callId)
      .eq('user_id', userId)
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 404)
    return data
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  async #getTwilioClient() {
    const { default: twilio } = await import('twilio')
    const cfg = this.#voiceConfig.twilio
    return twilio(cfg.accountSid, cfg.authToken)
  }
}
