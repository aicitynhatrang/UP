/**
 * AI-powered translation service for provider content.
 * Translates a source string into multiple target languages in one OpenAI call.
 */
export class AiTranslationService {
  constructor({ openai, aiConfig, logger }) {
    this.openai    = openai
    this.aiConfig  = aiConfig
    this.log       = logger
  }

  /**
   * Translate `text` into all configured active languages.
   * @param {string} text
   * @param {string} [sourceLang='auto']
   * @returns {Promise<Record<string, string>>} e.g. { en: '...', ru: '...', vi: '...' }
   */
  async translateAll(text, sourceLang = 'auto') {
    const targets = this.aiConfig.activeLanguages.filter(l => l !== sourceLang)
    return this.translate(text, targets)
  }

  /**
   * Translate `text` into specified target languages.
   * @param {string} text
   * @param {string[]} targetLangs - ISO codes e.g. ['en','ru','vi','zh','ko','de','fr']
   * @returns {Promise<Record<string, string>>}
   */
  async translate(text, targetLangs) {
    if (!text?.trim() || !targetLangs?.length) return {}

    const prompt = [
      `Translate the following text into these languages: ${targetLangs.join(', ')}.`,
      `Return a JSON object where keys are ISO language codes and values are translations.`,
      `Do not add any explanation — only the JSON object.`,
      ``,
      `Text:`,
      text,
    ].join('\n')

    try {
      const response = await this.openai.chat.completions.create({
        model:       this.aiConfig.models.fast,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are a professional multilingual translator.' },
          { role: 'user',   content: prompt },
        ],
      })

      const raw = response.choices[0]?.message?.content ?? '{}'
      const result = JSON.parse(raw)
      this.log.debug({ targetLangs, chars: text.length }, 'AiTranslationService: translated')
      return result
    } catch (err) {
      this.log.error({ err, targetLangs }, 'AiTranslationService: translation failed')
      return {}
    }
  }

  /**
   * Translate a map of fields { fieldName: text } into a single target language.
   * Used for batch-translating provider profile fields.
   * @param {Record<string, string>} fields
   * @param {string} targetLang
   * @returns {Promise<Record<string, string>>}
   */
  async translateFields(fields, targetLang) {
    const entries = Object.entries(fields).filter(([, v]) => v?.trim())
    if (!entries.length) return {}

    const prompt = [
      `Translate the following JSON fields into ${targetLang}.`,
      `Return a JSON object with the same keys and translated values.`,
      ``,
      JSON.stringify(Object.fromEntries(entries)),
    ].join('\n')

    try {
      const response = await this.openai.chat.completions.create({
        model:       this.aiConfig.models.fast,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are a professional translator. Respond only with valid JSON.' },
          { role: 'user',   content: prompt },
        ],
      })

      const raw = response.choices[0]?.message?.content ?? '{}'
      return JSON.parse(raw)
    } catch (err) {
      this.log.error({ err, targetLang }, 'AiTranslationService: translateFields failed')
      return {}
    }
  }
}
