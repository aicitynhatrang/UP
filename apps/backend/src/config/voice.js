function requireEnv(key) {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env: ${key}`)
  return val
}

export const voiceConfig = {
  elevenLabs: {
    apiKey:          requireEnv('ELEVENLABS_API_KEY'),
    baseUrl:         'https://api.elevenlabs.io/v1',
    defaultVoiceId:  'EXAVITQu4vr4xnSDxMaL', // default EL voice
    modelId:         'eleven_multilingual_v2',
    voiceCloneRetentionDays: 30, // auto-delete recordings after N days
  },
  twilio: {
    accountSid:   requireEnv('TWILIO_ACCOUNT_SID'),
    authToken:    requireEnv('TWILIO_AUTH_TOKEN'),
    phoneNumber:  requireEnv('TWILIO_PHONE_NUMBER'),
    whatsappToken: process.env.WHATSAPP_BUSINESS_TOKEN ?? '',
    callbackUrl:  `${process.env.RAILWAY_URL ?? 'http://localhost:4000'}/api/v1/voice/callback`,
    callTimeoutSec: 30, // bot calls back within 30 sec
  },
}
