import OpenAI from 'openai'

function requireEnv(key) {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env: ${key}`)
  return val
}

export const openai = new OpenAI({
  apiKey: requireEnv('OPENAI_API_KEY'),
})

export const aiConfig = {
  apiKey:             requireEnv('OPENAI_API_KEY'),
  googleVisionKey:    requireEnv('GOOGLE_VISION_API_KEY'),
  // Default models
  textModel:          'gpt-4o-mini',
  visionModel:        'gpt-4o-mini',
  translationModel:   'gpt-4o-mini',
  // Supported languages for AI translation
  activeLanguages:    ['ru', 'en', 'vi', 'zh', 'ko', 'ja', 'fr'],
  // Phase 1 languages (required)
  phase1Languages:    ['ru', 'en', 'vi'],
}
