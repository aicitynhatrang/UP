import { PARSER_LIMITS } from '@allcity/shared/constants/limits'

/**
 * Orchestrates the full Telegram channel post parsing pipeline:
 * 1. Resolve provider by channel ID
 * 2. Deduplicate via SHA-256 hash
 * 3. Extract structured data
 * 4. Persist parsed post
 * 5. Optionally run AI enrichment (quota-gated)
 */
export class ChannelParserService {
  constructor({
    supabaseAdmin,
    parsedPostsRepo,
    contentExtractor,
    aiProfileUpdater,
    logger,
  }) {
    this.db              = supabaseAdmin
    this.repo            = parsedPostsRepo
    this.extractor       = contentExtractor
    this.aiUpdater       = aiProfileUpdater
    this.log             = logger
  }

  /**
   * Entry point for a raw Telegram message object forwarded from the bot.
   * @param {object} post - raw Telegram message
   * @returns {Promise<{ skipped?: string, savedId?: string }>}
   */
  async handlePost(post) {
    const channelId = String(post.chat?.id ?? post.forward_from_chat?.id ?? '')
    if (!channelId) {
      this.log.warn({ post }, 'ChannelParserService: missing chat id')
      return { skipped: 'no_chat_id' }
    }

    // 1. Resolve provider
    const providerId = await this.#resolveProvider(channelId)
    if (!providerId) {
      this.log.debug({ channelId }, 'ChannelParserService: no provider linked to channel')
      return { skipped: 'no_provider' }
    }

    // 2. Extract content
    const { text, type, hashtags, photos, contactPhone } = this.extractor.extract(post)

    // 3. Deduplicate
    const hash = this.repo.constructor.buildHash(channelId, post.message_id, text, post.date)
    if (await this.repo.isDuplicate(hash)) {
      this.log.debug({ channelId, hash }, 'ChannelParserService: duplicate post, skipped')
      return { skipped: 'duplicate' }
    }

    // 4. Extract typed data (rule-based)
    const typedData = this.extractor.extractTypedData(text, type)

    // 5. Persist
    const savedId = await this.repo.save({
      provider_id:    providerId,
      channel_id:     channelId,
      message_id:     post.message_id,
      extracted_type: type,
      raw_text:       text,
      extracted_data: typedData,
      hashtags,
      photos,
      contact_phone:  contactPhone,
      hash,
      ai_processed:   false,
    })

    this.log.info({ providerId, type, savedId }, 'ChannelParserService: post saved')

    // 6. AI enrichment — quota-gated, non-blocking
    this.#maybeRunAi({ providerId, text, type, savedId }).catch(err =>
      this.log.error({ err, savedId }, 'ChannelParserService: AI enrichment error')
    )

    return { savedId }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  async #resolveProvider(channelId) {
    const { data, error } = await this.db
      .from('parser_channels')
      .select('provider_id')
      .eq('tg_channel_id', channelId)
      .maybeSingle()

    if (error) this.log.error({ error, channelId }, 'ChannelParserService: DB lookup failed')
    return data?.provider_id ?? null
  }

  async #maybeRunAi({ providerId, text, type, savedId }) {
    const todayCount = await this.repo.countAiProcessedToday(providerId)
    if (todayCount >= PARSER_LIMITS.MAX_AI_POSTS_PER_DAY) {
      this.log.debug({ providerId, todayCount }, 'ChannelParserService: AI quota exhausted for today')
      return
    }

    await this.aiUpdater.applyToProvider({ providerId, text, type })
    await this.repo.markApplied(savedId)
  }
}
