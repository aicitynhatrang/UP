import { PARSER_HASHTAGS, PARSER_POST_TYPES } from '@allcity/shared/constants/parser'

/**
 * Extracts structured data from raw Telegram channel posts.
 * Pure logic — no DB or external calls.
 */
export class ContentExtractor {
  constructor({ logger }) {
    this.log = logger
  }

  /**
   * Extract text, type, hashtags, and photo URLs from incoming Telegram post.
   * @param {object} post - raw Telegram message object
   * @returns {{ text, type, hashtags, photos, contactPhone }}
   */
  extract(post) {
    const rawText = post.text ?? post.caption ?? ''
    const hashtags = this.#extractHashtags(rawText)
    const type     = this.#detectType(hashtags)
    const photos   = this.#extractPhotos(post)
    const contactPhone = this.#extractPhone(rawText)

    return {
      text:         rawText.trim(),
      type,
      hashtags,
      photos,
      contactPhone,
    }
  }

  /**
   * Parse structured data from text based on detected type.
   * Returns JSONB-ready object for the appropriate provider field.
   */
  extractTypedData(text, type) {
    switch (type) {
      case PARSER_POST_TYPES.HOURS:
        return this.#parseWorkingHours(text)
      case PARSER_POST_TYPES.PRICE:
        return this.#parsePricing(text)
      case PARSER_POST_TYPES.MENU:
        return this.#parseMenu(text)
      case PARSER_POST_TYPES.PROMO:
        return { raw: text, created_at: new Date().toISOString() }
      default:
        return { raw: text }
    }
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  #extractHashtags(text) {
    const matches = text.match(/#\S+/g) ?? []
    return matches.map(h => h.toLowerCase())
  }

  #detectType(hashtags) {
    for (const tag of hashtags) {
      if (PARSER_HASHTAGS.MENU.includes(tag))   return PARSER_POST_TYPES.MENU
      if (PARSER_HASHTAGS.PRICES.includes(tag)) return PARSER_POST_TYPES.PRICE
      if (PARSER_HASHTAGS.HOURS.includes(tag))  return PARSER_POST_TYPES.HOURS
      if (PARSER_HASHTAGS.PROMO.includes(tag))  return PARSER_POST_TYPES.PROMO
      if (PARSER_HASHTAGS.PHOTO.includes(tag))  return PARSER_POST_TYPES.PHOTO
      if (PARSER_HASHTAGS.NEWS.includes(tag))   return PARSER_POST_TYPES.NEWS
    }
    return PARSER_POST_TYPES.DESCRIPTION
  }

  #extractPhotos(post) {
    if (!post.photo || !Array.isArray(post.photo)) return []
    // Telegram sends multiple sizes — take the largest
    const largest = post.photo.reduce((a, b) =>
      (a.file_size ?? 0) > (b.file_size ?? 0) ? a : b
    )
    return [largest.file_id]
  }

  #extractPhone(text) {
    const match = text.match(/(\+?\d[\d\s\-()]{7,15}\d)/)
    return match ? match[1].replace(/\s/g, '') : null
  }

  #parseWorkingHours(text) {
    // Simple extraction: "Mon-Fri: 9:00-22:00"
    const lines  = text.split('\n').filter(l => l.trim())
    const result = {}
    for (const line of lines) {
      const m = line.match(/([A-Za-zА-Яа-я\-,\s]+)\s*[:\-]\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/)
      if (m) result[m[1].trim()] = { open: m[2], close: m[3] }
    }
    return Object.keys(result).length ? result : { raw: text }
  }

  #parsePricing(text) {
    const lines = text.split('\n').filter(l => l.trim())
    const items = []
    for (const line of lines) {
      const m = line.match(/^(.+?)\s*[-–:]\s*([\d,.\s]+)\s*(VND|₫|$)?/i)
      if (m) items.push({ name: m[1].trim(), price: parseInt(m[2].replace(/[,.\s]/g, ''), 10) })
    }
    return items.length ? { items } : { raw: text }
  }

  #parseMenu(text) {
    const sections = text.split(/\n{2,}/)
    const menu     = []
    for (const section of sections) {
      const lines = section.split('\n').filter(l => l.trim())
      if (lines.length) menu.push({ section: lines[0], items: lines.slice(1) })
    }
    return menu.length ? { sections: menu } : { raw: text }
  }
}
