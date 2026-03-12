import { AppError } from '../../utils/errors.js'

const PLATFORM_FEE_PCT = 15

export class CreatorProductService {
  #db
  #logger

  constructor({ supabaseAdmin, logger }) {
    this.#db = supabaseAdmin
    this.#logger = logger
  }

  /** List products with filters */
  async listProducts({ page = 1, limit = 20, type, creatorId }) {
    const from = (page - 1) * limit

    let query = this.#db
      .from('creator_products')
      .select('*, users!inner(first_name, username, avatar_url)', { count: 'exact' })
      .eq('is_active', true)
      .eq('moderation_status', 'approved')

    if (type) query = query.eq('type', type)
    if (creatorId) query = query.eq('creator_id', creatorId)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return { data, total: count }
  }

  /** Get single product */
  async getProduct(productId) {
    const { data, error } = await this.#db
      .from('creator_products')
      .select('*, users(first_name, username, avatar_url)')
      .eq('id', productId)
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 'Product not found', 404)
    return data
  }

  /** Create a new product (pending moderation) */
  async createProduct(creatorId, payload) {
    const { data, error } = await this.#db
      .from('creator_products')
      .insert({ ...payload, creator_id: creatorId, moderation_status: 'pending' })
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    this.#logger.info({ productId: data.id, creatorId }, 'CreatorProduct: created (pending moderation)')
    return data
  }

  /** Update own product */
  async updateProduct(productId, creatorId, payload) {
    const { data, error } = await this.#db
      .from('creator_products')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('creator_id', creatorId)
      .select()
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 'Product not found or not yours', 404)
    return data
  }

  /** Purchase a product */
  async purchase(productId, buyerId) {
    const { data: product } = await this.#db
      .from('creator_products')
      .select('*')
      .eq('id', productId)
      .eq('is_active', true)
      .eq('moderation_status', 'approved')
      .single()

    if (!product) throw new AppError('NOT_FOUND', 'Product not found', 404)
    if (product.creator_id === buyerId) throw new AppError('SELF_PURCHASE', 'Cannot buy your own product', 400)

    // Check duplicate purchase
    const { data: existing } = await this.#db
      .from('creator_product_purchases')
      .select('id')
      .eq('product_id', productId)
      .eq('buyer_id', buyerId)
      .maybeSingle()

    if (existing) throw new AppError('ALREADY_PURCHASED', 'Already purchased', 409)

    const platformFeeVnd = Math.round(product.price_vnd * PLATFORM_FEE_PCT / 100)
    const creatorPayoutVnd = product.price_vnd - platformFeeVnd

    const { data: purchaseRecord, error } = await this.#db
      .from('creator_product_purchases')
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        price_paid_vnd: product.price_vnd,
        platform_fee_vnd: platformFeeVnd,
        creator_payout_vnd: creatorPayoutVnd,
      })
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', error.message, 500)

    // Increment sales count
    await this.#db.rpc('increment_field', {
      table_name: 'creator_products',
      field_name: 'sales_count',
      row_id: productId,
    }).catch(() => {
      // Fallback: manual increment
      this.#db
        .from('creator_products')
        .update({ sales_count: product.sales_count + 1 })
        .eq('id', productId)
        .then(() => {})
    })

    this.#logger.info({ productId, buyerId, platformFeeVnd }, 'CreatorProduct: purchased')
    return { purchase: purchaseRecord, download_url: product.download_url }
  }

  /** List purchases by user */
  async listPurchases(userId, { page = 1, limit = 20 }) {
    const from = (page - 1) * limit

    const { data, count, error } = await this.#db
      .from('creator_product_purchases')
      .select('*, creator_products(title, type, download_url, creator_id)', { count: 'exact' })
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return { data, total: count }
  }

  /** List own products (creator dashboard) */
  async listMyProducts(creatorId, { page = 1, limit = 20 }) {
    const from = (page - 1) * limit

    const { data, count, error } = await this.#db
      .from('creator_products')
      .select('*', { count: 'exact' })
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return { data, total: count }
  }
}
