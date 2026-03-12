import { z } from 'zod'

export const UserSchema = z.object({
  id:                 z.string().uuid(),
  telegram_id:        z.number().int().positive(),
  username:           z.string().nullable().optional(),
  first_name:         z.string().max(64),
  last_name:          z.string().max(64).nullable().optional(),
  preferred_language: z.enum(['ru', 'en', 'vi', 'zh', 'ko', 'ja', 'fr']).default('en'),
  level:              z.number().int().min(1).max(8).default(1),
  lifetime_points:    z.number().int().min(0).default(0),
  balance_points:     z.number().int().min(0).default(0),
  karma_score:        z.number().int().min(0).default(0),
  referral_code:      z.string().max(20).nullable().optional(),
  referred_by:        z.string().uuid().nullable().optional(),
  is_creator:         z.boolean().default(false),
  creator_nft_address:z.string().nullable().optional(),
  status_emoji:       z.string().max(10).default('🌱'),
  streak_days:        z.number().int().min(0).default(0),
  last_active_date:   z.string().nullable().optional(),  // DATE
  ban_count:          z.number().int().min(0).default(0),
  ban_until:          z.string().nullable().optional(),  // TIMESTAMPTZ
  ban_reason:         z.string().nullable().optional(),
  created_at:         z.string().optional(),
  updated_at:         z.string().optional(),
})

export const CreateUserSchema = z.object({
  telegram_id:        z.number().int().positive(),
  username:           z.string().max(64).optional(),
  first_name:         z.string().max(64),
  last_name:          z.string().max(64).optional(),
  preferred_language: z.enum(['ru', 'en', 'vi', 'zh', 'ko', 'ja', 'fr']).default('en'),
  referred_by:        z.string().uuid().optional(),
})

export const UpdateUserSchema = z.object({
  preferred_language: z.enum(['ru', 'en', 'vi', 'zh', 'ko', 'ja', 'fr']).optional(),
  first_name:         z.string().max(64).optional(),
  last_name:          z.string().max(64).optional(),
}).strict()

/** @typedef {z.infer<typeof UserSchema>} User */
