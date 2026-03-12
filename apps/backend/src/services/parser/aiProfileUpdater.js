import { PARSER_POST_TYPES } from '@allcity/shared/constants/parser'

/**
 * Uses OpenAI to extract structured provider data from unstructured post text,
 * then patches the provider record in Supabase.
 */
export class AiProfileUpdater {
  constructor({ openai, aiConfig, supabaseAdmin, logger }) {
    this.openai        = openai
    this.aiConfig      = aiConfig
    this.supabaseAdmin = supabaseAdmin
    this.log           = logger
  }

  /**
   * Attempt AI extraction for post types that benefit from it.
   * Returns the patched provider data or null if skipped/failed.
   * @param {object} opts
   * @param {string} opts.providerId
   * @param {string} opts.text
   * @param {string} opts.type  - PARSER_POST_TYPES value
   * @returns {Promise<object|null>}
   */
  async applyToProvider({ providerId, text, type }) {
    const prompt = this.#buildPrompt(type, text)
    if (!prompt) return null

    let parsed
    try {
      const response = await this.openai.chat.completions.create({
        model:       this.aiConfig.models.fast,
        temperature: 0,
        messages: [
          { role: 'system', content: 'You are a structured data extractor. Respond only with valid JSON.' },
          { role: 'user',   content: prompt },
        ],
      })
      const raw = response.choices[0]?.message?.content ?? '{}'
      parsed = JSON.parse(raw)
    } catch (err) {
      this.log.warn({ err, providerId, type }, 'AiProfileUpdater: OpenAI extraction failed')
      return null
    }

    const patch = this.#mapToPatch(type, parsed)
    if (!patch) return null

    const { error } = await this.supabaseAdmin
      .from('providers')
      .update(patch)
      .eq('id', providerId)

    if (error) {
      this.log.error({ error, providerId }, 'AiProfileUpdater: failed to patch provider')
      return null
    }

    this.log.info({ providerId, type, patch }, 'AiProfileUpdater: provider patched')
    return patch
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  #buildPrompt(type, text) {
    switch (type) {
      case PARSER_POST_TYPES.HOURS:
        return `Extract working hours from the following text. Return JSON: { "working_hours": { "Mon-Fri": { "open": "HH:MM", "close": "HH:MM" }, ... } }.\n\nText:\n${text}`

      case PARSER_POST_TYPES.PRICE:
        return `Extract a price list from the following text. Return JSON: { "pricing": [{ "name": "...", "price": 0 }] }.\n\nText:\n${text}`

      case PARSER_POST_TYPES.MENU:
        return `Extract the menu from the following text. Return JSON: { "menu": [{ "section": "...", "items": ["..."] }] }.\n\nText:\n${text}`

      case PARSER_POST_TYPES.DESCRIPTION:
        return `Extract a short business description (max 200 chars) in the same language as the input. Return JSON: { "description": "..." }.\n\nText:\n${text}`

      default:
        return null
    }
  }

  #mapToPatch(type, parsed) {
    switch (type) {
      case PARSER_POST_TYPES.HOURS:
        return parsed.working_hours ? { working_hours: parsed.working_hours } : null
      case PARSER_POST_TYPES.PRICE:
        return parsed.pricing       ? { pricing: parsed.pricing }             : null
      case PARSER_POST_TYPES.MENU:
        return parsed.menu          ? { menu: parsed.menu }                   : null
      case PARSER_POST_TYPES.DESCRIPTION:
        return parsed.description   ? { description: parsed.description }     : null
      default:
        return null
    }
  }
}
