import OpenAI from 'openai'

function optionalEnv(key) {
  return process.env[key] || ''
}

const apiKey = optionalEnv('OPENAI_API_KEY')

export const openai = apiKey
  ? new OpenAI({ apiKey })
  : null

export const aiConfig = {
  apiKey,
  googleVisionKey:    optionalEnv('GOOGLE_VISION_API_KEY'),
  // Default models
  textModel:          'gpt-4o-mini',
  visionModel:        'gpt-4o-mini',
  translationModel:   'gpt-4o-mini',
  // Supported languages for AI translation
  activeLanguages:    ['ru', 'en', 'vi', 'zh', 'ko', 'ja', 'fr'],
  // Phase 1 languages (required)
  phase1Languages:    ['ru', 'en', 'vi'],
}
