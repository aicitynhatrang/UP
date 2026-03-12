import crypto from 'node:crypto'
import { validateTelegramInitData } from '@allcity/shared/utils/validate'
import { USER_LEVELS } from '@allcity/shared/constants/statuses'
import { Errors } from '../../utils/errors.js'

/**
 * Handles Telegram-based authentication:
 *  - Validates initData HMAC
 *  - Upserts user record
 *  - Issues JWT access + refresh tokens
 *  - Manages sessions (max concurrent, expiry)
 */
export class AuthService {
  constructor({ supabaseAdmin, securityConfig, telegramConfig, logger }) {
    this.db         = supabaseAdmin
    this.security   = securityConfig
    this.tgConfig   = telegramConfig
    this.log        = logger
  }

  /**
   * Main entry: validate Telegram initData → upsert user → return tokens.
   * @param {string} initData - raw initData string from Telegram Mini App
   * @param {object} meta - { fingerprint, ip, userAgent }
   * @returns {Promise<{ user, accessToken, refreshToken }>}
   */
  async loginWithTelegram(initData, meta, app) {
    // 1. Validate HMAC
    const valid = await validateTelegramInitData(initData, this.tgConfig.botToken)
    if (!valid) throw Errors.unauthorized('Invalid Telegram initData')

    // 2. Parse user data from initData
    const params   = new URLSearchParams(initData)
    const userData = JSON.parse(params.get('user') ?? '{}')

    if (!userData.id) throw Errors.unauthorized('Missing user data in initData')

    // 3. Upsert user
    const user = await this.#upsertUser(userData)

    // 4. Issue tokens
    const accessToken  = app.jwt.sign({
      sub:         user.id,
      telegram_id: user.telegram_id,
      level:       user.level,
      is_admin:    user.is_admin,
    })

    const refreshToken = this.#generateRefreshToken()

    // 5. Create session
    await this.#createSession(user.id, refreshToken, meta)

    this.log.info({ userId: user.id, telegramId: user.telegram_id }, 'Auth: login successful')

    return { user, accessToken, refreshToken }
  }

  /**
   * Refresh access token using refresh token.
   */
  async refreshTokens(refreshToken, meta, app) {
    // Find session
    const { data: session, error } = await this.db
      .from('user_sessions')
      .select('*')
      .eq('refresh_token', refreshToken)
      .maybeSingle()

    if (error || !session) throw Errors.unauthorized('Invalid refresh token')

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      await this.db.from('user_sessions').delete().eq('id', session.id)
      throw Errors.unauthorized('Refresh token expired')
    }

    // Validate fingerprint if present
    if (session.fingerprint && meta.fingerprint && session.fingerprint !== meta.fingerprint) {
      this.log.warn({ sessionId: session.id, userId: session.user_id }, 'Auth: fingerprint mismatch')
      await this.db.from('user_sessions').delete().eq('id', session.id)
      throw Errors.unauthorized('Session invalidated — fingerprint mismatch')
    }

    // Get user
    const { data: user } = await this.db
      .from('users')
      .select('*')
      .eq('id', session.user_id)
      .single()

    if (!user || !user.is_active) throw Errors.forbidden('Account suspended')

    // Rotate refresh token
    const newRefreshToken = this.#generateRefreshToken()
    await this.db
      .from('user_sessions')
      .update({
        refresh_token:  newRefreshToken,
        last_active_at: new Date().toISOString(),
        ip_address:     meta.ip,
      })
      .eq('id', session.id)

    const accessToken = app.jwt.sign({
      sub:         user.id,
      telegram_id: user.telegram_id,
      level:       user.level,
      is_admin:    user.is_admin,
    })

    return { user, accessToken, refreshToken: newRefreshToken }
  }

  /**
   * Logout — destroy session.
   */
  async logout(refreshToken) {
    await this.db
      .from('user_sessions')
      .delete()
      .eq('refresh_token', refreshToken)
  }

  /**
   * Get current user by ID.
   */
  async getUser(userId) {
    const { data, error } = await this.db
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) throw Errors.notFound('User not found')
    return data
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  async #upsertUser(tgUser) {
    const { data: existing } = await this.db
      .from('users')
      .select('*')
      .eq('telegram_id', tgUser.id)
      .maybeSingle()

    if (existing) {
      // Update profile snapshot
      const patch = {
        username:   tgUser.username ?? existing.username,
        first_name: tgUser.first_name ?? existing.first_name,
        last_name:  tgUser.last_name ?? existing.last_name,
        avatar_url: tgUser.photo_url ?? existing.avatar_url,
      }
      const { data } = await this.db
        .from('users')
        .update(patch)
        .eq('id', existing.id)
        .select()
        .single()
      return data ?? existing
    }

    // New user — create
    const referralCode = this.#generateReferralCode()
    const { data: newUser, error } = await this.db
      .from('users')
      .insert({
        telegram_id:   tgUser.id,
        username:      tgUser.username ?? null,
        first_name:    tgUser.first_name ?? 'User',
        last_name:     tgUser.last_name ?? null,
        avatar_url:    tgUser.photo_url ?? null,
        referral_code: referralCode,
        language:      tgUser.language_code ?? 'ru',
      })
      .select()
      .single()

    if (error) {
      this.log.error({ error, tgUser }, 'Auth: failed to create user')
      throw Errors.internal('Failed to create user')
    }

    this.log.info({ userId: newUser.id, telegramId: tgUser.id }, 'Auth: new user created')
    return newUser
  }

  async #createSession(userId, refreshToken, meta) {
    // Enforce max sessions
    const { data: sessions } = await this.db
      .from('user_sessions')
      .select('id, last_active_at')
      .eq('user_id', userId)
      .order('last_active_at', { ascending: true })

    const maxSessions = this.security.session.maxActive
    if (sessions && sessions.length >= maxSessions) {
      // Remove oldest sessions
      const toRemove = sessions.slice(0, sessions.length - maxSessions + 1)
      await this.db
        .from('user_sessions')
        .delete()
        .in('id', toRemove.map(s => s.id))
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + (this.security.session.timeoutHours ?? 48))

    await this.db.from('user_sessions').insert({
      user_id:       userId,
      refresh_token: refreshToken,
      fingerprint:   meta.fingerprint ?? null,
      ip_address:    meta.ip ?? null,
      user_agent:    meta.userAgent ?? null,
      expires_at:    expiresAt.toISOString(),
    })
  }

  #generateRefreshToken() {
    return crypto.randomBytes(48).toString('base64url')
  }

  #generateReferralCode() {
    return 'AC' + crypto.randomBytes(4).toString('hex').toUpperCase()
  }
}
