import { randomBytes } from 'node:crypto'
import { AppError } from '../../utils/errors.js'

export class DiscountCodeService {
  #db
  #logger

  constructor({ supabaseAdmin, logger }) {
    this.#db = supabaseAdmin
    this.#logger = logger
  }

  /** Create a discount code (admin or business) */
  async createCode({
    code,
    discountPct,
    discountFixedVnd,
    maxUses,
    expiresAt,
    providerId,
    verticalSlug,
    minOrderVnd,
    createdBy,
  }) {
    const finalCode = code ?? randomBytes(4).toString('hex').toUpperCase()

    const { data, error } = await this.#db
      .from('discount_codes')
      .insert({
        code: finalCode,
        discount_pct: discountPct ?? null,
        discount_fixed_vnd: discountFixedVnd ?? null,
        max_uses: maxUses ?? null,
        expires_at: expiresAt ?? null,
        provider_id: providerId ?? null,
        vertical_slug: verticalSlug ?? null,
        min_order_vnd: minOrderVnd ?? 0,
        created_by: createdBy,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw new AppError('CODE_EXISTS', 409, 'Discount code already exists')
      throw new AppError('DB_ERROR', 500, error.message)
    }

    this.#logger.info({ code: finalCode, discountPct, maxUses }, 'DiscountCode: created')
    return data
  }

  /** Validate and apply a discount code */
  async validateCode(code, { orderAmountVnd, providerId, verticalSlug, userId }) {
    const { data: dc, error } = await this.#db
      .from('discount_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (error || !dc) throw new AppError('INVALID_CODE', 400, 'Discount code not found or inactive')

    // Check expiry
    if (dc.expires_at && new Date(dc.expires_at) < new Date()) {
      throw new AppError('CODE_EXPIRED', 400, 'Discount code has expired')
    }

    // Check usage limit
    if (dc.max_uses && dc.used_count >= dc.max_uses) {
      throw new AppError('CODE_EXHAUSTED', 400, 'Discount code usage limit reached')
    }

    // Check min order
    if (orderAmountVnd < dc.min_order_vnd) {
      throw new AppError('ORDER_TOO_SMALL', 400, `Minimum order: ${dc.min_order_vnd} VND`)
    }

    // Check provider restriction
    if (dc.provider_id && dc.provider_id !== providerId) {
      throw new AppError('CODE_NOT_FOR_PROVIDER', 400, 'Code not valid for this provider')
    }

    // Check vertical restriction
    if (dc.vertical_slug && dc.vertical_slug !== verticalSlug) {
      throw new AppError('CODE_NOT_FOR_VERTICAL', 400, 'Code not valid for this category')
    }

    // Check if user already used this code
    const { data: existing } = await this.#db
      .from('discount_code_uses')
      .select('id')
      .eq('code_id', dc.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) throw new AppError('CODE_ALREADY_USED', 400, 'You already used this code')

    // Calculate discount
    let discountVnd = 0
    if (dc.discount_pct) {
      discountVnd = Math.round(orderAmountVnd * dc.discount_pct / 100)
    } else if (dc.discount_fixed_vnd) {
      discountVnd = dc.discount_fixed_vnd
    }

    // Cap discount at order amount
    discountVnd = Math.min(discountVnd, orderAmountVnd)

    return { code_id: dc.id, discount_vnd: discountVnd, code: dc.code }
  }

  /** Record usage of a discount code */
  async recordUsage(codeId, userId, orderId) {
    await this.#db
      .from('discount_code_uses')
      .insert({ code_id: codeId, user_id: userId, order_id: orderId })

    // Increment used_count
    const { data: dc } = await this.#db
      .from('discount_codes')
      .select('used_count, max_uses')
      .eq('id', codeId)
      .single()

    if (dc) {
      const newCount = (dc.used_count ?? 0) + 1
      const updates = { used_count: newCount }
      if (dc.max_uses && newCount >= dc.max_uses) {
        updates.is_active = false
      }
      await this.#db.from('discount_codes').update(updates).eq('id', codeId)
    }
  }

  /** List discount codes (admin/business) */
  async listCodes({ providerId, createdBy, page = 1, limit = 20 }) {
    const from = (page - 1) * limit
    let query = this.#db
      .from('discount_codes')
      .select('*', { count: 'exact' })

    if (providerId) query = query.eq('provider_id', providerId)
    if (createdBy) query = query.eq('created_by', createdBy)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }

  /** Deactivate a discount code */
  async deactivateCode(codeId, userId) {
    const { error } = await this.#db
      .from('discount_codes')
      .update({ is_active: false })
      .eq('id', codeId)
      .or(`created_by.eq.${userId}`)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
  }
}
