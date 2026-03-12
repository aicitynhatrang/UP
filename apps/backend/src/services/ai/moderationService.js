import { AppError } from '../../utils/errors.js'

const UNSAFE_THRESHOLD = 0.7

export class ModerationService {
  #db
  #openai
  #aiConfig
  #logger

  constructor({ supabaseAdmin, openai, aiConfig, logger }) {
    this.#db = supabaseAdmin
    this.#openai = openai
    this.#aiConfig = aiConfig
    this.#logger = logger
  }

  /** Moderate text content using OpenAI moderation API */
  async moderateText(entityType, entityId, content) {
    const moderation = await this.#openai.moderations.create({ input: content })
    const result = moderation.results[0]

    const safe = !result.flagged
    const categories = Object.entries(result.categories)
      .filter(([, v]) => v)
      .map(([k]) => k)
    const scores = result.category_scores

    // Log moderation result
    await this.#db
      .from('ai_moderation_log')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        content: content.slice(0, 2000),
        result: { safe, categories, scores },
        model: 'text-moderation-latest',
      })

    this.#logger.info(
      { entityType, entityId, safe, categories },
      'Moderation: text checked',
    )

    return { safe, categories, scores }
  }

  /** Moderate image URL using GPT-4o-mini vision */
  async moderateImage(entityType, entityId, imageUrl) {
    const completion = await this.#openai.chat.completions.create({
      model: this.#aiConfig.visionModel,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: 'You are a content moderation system. Analyze the image and return a JSON object: { "safe": true/false, "categories": ["category1"], "reason": "..." }. Categories: nudity, violence, hate, spam, scam. Only return JSON.',
        },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
            { type: 'text', text: 'Is this image safe for a city marketplace platform?' },
          ],
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    let result
    try {
      result = JSON.parse(raw)
    } catch {
      result = { safe: true, categories: [], reason: 'Parse error — defaulting to safe' }
    }

    await this.#db
      .from('ai_moderation_log')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        content: imageUrl,
        result,
        model: this.#aiConfig.visionModel,
      })

    this.#logger.info({ entityType, entityId, safe: result.safe }, 'Moderation: image checked')
    return result
  }

  /** Admin override moderation decision */
  async overrideModeration(logId, adminId) {
    const { data, error } = await this.#db
      .from('ai_moderation_log')
      .update({
        overridden_by: adminId,
        overridden_at: new Date().toISOString(),
      })
      .eq('id', logId)
      .select()
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 404)
    this.#logger.info({ logId, adminId }, 'Moderation: overridden by admin')
    return data
  }

  /** Get moderation log for an entity */
  async getLog(entityType, entityId) {
    const { data, error } = await this.#db
      .from('ai_moderation_log')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return data ?? []
  }
}
