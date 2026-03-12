import { api } from '../utils/api.js'
import { logger } from '../utils/logger.js'

/**
 * Handles channel_post updates.
 * When the bot is added as admin to a Telegram channel,
 * it receives all posts and forwards them to the backend parser.
 */
export function registerChannelPostHandler(bot) {
  bot.on('channel_post', async (ctx) => {
    const post = ctx.channelPost
    if (!post) return

    try {
      await api.post('/api/v1/parser/channel-post', {
        chat:                post.chat,
        message_id:          post.message_id,
        date:                post.date,
        text:                post.text ?? null,
        caption:             post.caption ?? null,
        photo:               post.photo ?? null,
        forward_from_chat:   post.forward_from_chat ?? null,
        entities:            post.entities ?? null,
        caption_entities:    post.caption_entities ?? null,
      })

      logger.debug({
        channelId: post.chat.id,
        messageId: post.message_id,
      }, 'ChannelPost: forwarded to parser')
    } catch (err) {
      logger.error({
        err: err.message,
        channelId: post.chat.id,
        messageId: post.message_id,
      }, 'ChannelPost: failed to forward to parser')
    }
  })

  // Also handle edited channel posts (provider updating info)
  bot.on('edited_channel_post', async (ctx) => {
    const post = ctx.editedChannelPost
    if (!post) return

    try {
      await api.post('/api/v1/parser/channel-post', {
        chat:                post.chat,
        message_id:          post.message_id,
        date:                post.edit_date ?? post.date,
        text:                post.text ?? null,
        caption:             post.caption ?? null,
        photo:               post.photo ?? null,
        forward_from_chat:   post.forward_from_chat ?? null,
        entities:            post.entities ?? null,
        caption_entities:    post.caption_entities ?? null,
        is_edit:             true,
      })
    } catch (err) {
      logger.error({ err: err.message }, 'EditedChannelPost: failed to forward')
    }
  })
}
