import { randomBytes, createHash } from 'node:crypto'
import { AppError } from '../../utils/errors.js'

export class ApiKeyService {
  #db
  #logger

  constructor({ supabaseAdmin, logger }) {
    this.#db = supabaseAdmin
    this.#logger = logger
  }

  /** Generate a new API key */
  async createKey(userId, { providerId, name, scopes, rateLimitRpm, expiresAt }) {
    const rawKey = `ac_${randomBytes(24).toString('hex')}`
    const keyHash = createHash('sha256').update(rawKey).digest('hex')

    const { data, error } = await this.#db
      .from('api_keys')
      .insert({
        user_id: userId,
        provider_id: providerId ?? null,
        key_hash: keyHash,
        name,
        scopes: scopes ?? [],
        rate_limit_rpm: rateLimitRpm ?? 60,
        expires_at: expiresAt ?? null,
      })
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    this.#logger.info({ keyId: data.id, userId, name }, 'ApiKey: created')

    // Return the raw key only once — it won't be retrievable again
    return { ...data, rawKey }
  }

  /** Validate an API key and return associated user/provider */
  async validateKey(rawKey) {
    const keyHash = createHash('sha256').update(rawKey).digest('hex')

    const { data, error } = await this.#db
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single()

    if (error || !data) return null

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null
    }

    // Update last_used_at
    await this.#db
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)

    return data
  }

  /** List API keys for a user */
  async listKeys(userId) {
    const { data, error } = await this.#db
      .from('api_keys')
      .select('id, name, scopes, rate_limit_rpm, last_used_at, expires_at, is_active, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return data ?? []
  }

  /** Revoke an API key */
  async revokeKey(keyId, userId) {
    const { data, error } = await this.#db
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 404)
    this.#logger.info({ keyId, userId }, 'ApiKey: revoked')
    return data
  }
}
