import { z } from 'zod'
import { PARSER_POST_TYPES } from '../constants/parser.js'

const typeValues = /** @type {[string, ...string[]]} */ (Object.values(PARSER_POST_TYPES))

export const ChannelPostSchema = z.object({
  id:                 z.string().uuid(),
  provider_id:        z.string().uuid(),
  tg_post_id:         z.number().int(),
  tg_channel_id:      z.number().int(),
  post_hash:          z.string().length(64),
  raw_text:           z.string().nullable().optional(),
  detected_language:  z.string().max(5).nullable().optional(),
  extracted_type:     z.enum(typeValues).default('general'),
  extracted_data:     z.record(z.unknown()).nullable().optional(),
  photos:             z.array(z.string()).default([]),
  ai_processed:       z.boolean().default(false),
  applied_to_profile: z.boolean().default(false),
  created_at:         z.string().optional(),
})

// Input from bot channelPost event (raw Telegram message)
export const IncomingChannelPostSchema = z.object({
  message_id:   z.number().int(),
  chat: z.object({
    id:       z.number().int(),
    type:     z.enum(['channel']),
    username: z.string().optional(),
  }),
  text:         z.string().optional(),
  caption:      z.string().optional(),
  photo:        z.array(z.unknown()).optional(),
  date:         z.number().int(),
})

/** @typedef {z.infer<typeof ChannelPostSchema>} ChannelPost */
/** @typedef {z.infer<typeof IncomingChannelPostSchema>} IncomingChannelPost */
