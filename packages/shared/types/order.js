import { z } from 'zod'
import { ORDER_STATUSES } from '../constants/statuses.js'

const statusValues = /** @type {[string, ...string[]]} */ (Object.values(ORDER_STATUSES))

export const CreateOrderSchema = z.object({
  provider_id:  z.string().uuid(),
  vertical_id:  z.number().int().positive(),
  message:      z.string().min(10).max(1000),
  service_name: z.string().max(200).optional(),
  amount_vnd:   z.number().int().positive().optional(),
  lang:         z.enum(['ru', 'en', 'vi', 'zh', 'ko', 'ja', 'fr']).default('en'),
})

export const UpdateOrderStatusSchema = z.object({
  status:  z.enum(statusValues),
  comment: z.string().max(500).optional(),
})

export const OrderSchema = z.object({
  id:               z.string().uuid(),
  user_id:          z.string().uuid(),
  provider_id:      z.string().uuid(),
  vertical_id:      z.number().int(),
  status:           z.enum(statusValues),
  message:          z.string(),
  service_name:     z.string().nullable().optional(),
  amount_vnd:       z.number().int().nullable().optional(),
  commission_vnd:   z.number().int().nullable().optional(),
  discount_vnd:     z.number().int().nullable().optional(),
  lang:             z.string().default('en'),
  created_at:       z.string(),
  updated_at:       z.string(),
  confirmed_at:     z.string().nullable().optional(),
})

export const CreateReviewSchema = z.object({
  order_id:    z.string().uuid(),
  rating:      z.number().int().min(1).max(5),
  text:        z.string().min(10).max(2000),
  lang:        z.enum(['ru', 'en', 'vi', 'zh', 'ko', 'ja', 'fr']).default('en'),
})

/** @typedef {z.infer<typeof OrderSchema>} Order */
