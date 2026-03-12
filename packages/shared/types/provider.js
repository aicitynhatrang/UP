import { z } from 'zod'

export const ProviderSchema = z.object({
  id:                     z.string().uuid(),
  slug:                   z.string().max(100),
  name:                   z.string().max(200),
  description:            z.string().nullable().optional(),
  vertical_id:            z.number().int().positive(),
  subgroup_slug:          z.string().max(100).nullable().optional(),
  owner_id:               z.string().uuid().nullable().optional(),
  subscription_tier:      z.enum(['free', 'starter', 'pro', 'business', 'enterprise']).default('free'),
  subscription_expires_at:z.string().nullable().optional(),
  is_verified:            z.boolean().default(false),
  is_active:              z.boolean().default(true),
  tg_channel_id:          z.number().int().nullable().optional(),
  tg_channel_username:    z.string().nullable().optional(),
  parser_enabled:         z.boolean().default(false),
  parser_last_sync:       z.string().nullable().optional(),
  priority_score:         z.number().int().default(0),
  google_maps_url:        z.string().url().nullable().optional(),
  digital_card_url:       z.string().nullable().optional(),
  ab_test_active:         z.boolean().default(false),
  ai_bot_enabled:         z.boolean().default(false),
  website_enabled:        z.boolean().default(false),
  social_enabled:         z.boolean().default(false),
  menu_data:              z.record(z.unknown()).nullable().optional(),
  pricing_data:           z.record(z.unknown()).nullable().optional(),
  working_hours:          z.record(z.unknown()).nullable().optional(),
  location_lat:           z.number().nullable().optional(),
  location_lng:           z.number().nullable().optional(),
  address:                z.string().max(500).nullable().optional(),
  phone:                  z.string().max(30).nullable().optional(),
  created_at:             z.string().optional(),
  updated_at:             z.string().optional(),
})

export const CreateProviderSchema = z.object({
  name:          z.string().min(2).max(200),
  description:   z.string().max(5000).optional(),
  vertical_id:   z.number().int().positive(),
  subgroup_slug: z.string().max(100).optional(),
  phone:         z.string().max(30).optional(),
  address:       z.string().max(500).optional(),
  location_lat:  z.number().optional(),
  location_lng:  z.number().optional(),
})

export const UpdateProviderSchema = z.object({
  name:          z.string().min(2).max(200).optional(),
  description:   z.string().max(5000).optional(),
  phone:         z.string().max(30).optional(),
  address:       z.string().max(500).optional(),
  working_hours: z.record(z.unknown()).optional(),
  menu_data:     z.record(z.unknown()).optional(),
  pricing_data:  z.record(z.unknown()).optional(),
}).strict()

/** @typedef {z.infer<typeof ProviderSchema>} Provider */
