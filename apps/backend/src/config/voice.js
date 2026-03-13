function optionalEnv(key, fallback = '') {
  return process.env[key] ?? fallback
}

export const voiceConfig = {
  elevenLabs: {
    apiKey:          optionalEnv('ELEVENLABS_API_KEY'),
    baseUrl:         'https://api.elevenlabs.io/v1',
    defaultVoiceId:  'EXAVITQu4vr4xnSDxMaL', // default EL voice
    modelId:         'eleven_multilingual_v2',
    voiceCloneRetentionDays: 30, // auto-delete recordings after N days
  },
  twilio: {
    accountSid:   optionalEnv('TWILIO_ACCOUNT_SID'),
    authToken:    optionalEnv('TWILIO_AUTH_TOKEN'),
    phoneNumber:  optionalEnv('TWILIO_PHONE_NUMBER'),
    whatsappToken: optionalEnv('WHATSAPP_BUSINESS_TOKEN'),
    callbackUrl:  `${process.env.RAILWAY_URL ?? 'http://localhost:4000'}/api/v1/voice/callback`,
    callTimeoutSec: 30, // bot calls back within 30 sec
  },
}
