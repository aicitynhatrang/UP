import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'

const LoginBody = z.object({
  initData:    z.string().min(1),
  fingerprint: z.string().optional(),
})

const RefreshBody = z.object({
  refreshToken: z.string().min(1),
  fingerprint:  z.string().optional(),
})

const LogoutBody = z.object({
  refreshToken: z.string().min(1),
})

const ApplyReferralBody = z.object({
  referralCode: z.string().min(1),
})

const UpdateProfileBody = z.object({
  language: z.string().length(2).optional(),
  timezone: z.string().optional(),
})

/**
 * Auth routes
 * Prefix: /api/v1/auth
 */
export function registerAuthRoutes(app, cradle) {
  const { authService } = cradle

  // ── POST /auth/login — Telegram initData auth ──────────────────────────
  app.post('/auth/login', async (request, reply) => {
    const { initData, fingerprint } = LoginBody.parse(request.body)

    const meta = {
      fingerprint,
      ip:        request.ip,
      userAgent: request.headers['user-agent'],
    }

    const result = await authService.loginWithTelegram(initData, meta, request.server)
    return reply.send(result)
  })

  // ── POST /auth/refresh — rotate tokens ─────────────────────────────────
  app.post('/auth/refresh', async (request, reply) => {
    const { refreshToken, fingerprint } = RefreshBody.parse(request.body)

    const meta = {
      fingerprint,
      ip:        request.ip,
      userAgent: request.headers['user-agent'],
    }

    const result = await authService.refreshTokens(refreshToken, meta, request.server)
    return reply.send(result)
  })

  // ── POST /auth/logout ──────────────────────────────────────────────────
  app.post('/auth/logout', async (request, reply) => {
    const { refreshToken } = LogoutBody.parse(request.body)
    await authService.logout(refreshToken)
    return reply.send({ ok: true })
  })

  // ── GET /auth/me — current user profile ────────────────────────────────
  app.get('/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await authService.getUser(request.userId)
    return reply.send(user)
  })

  // ── PATCH /auth/me — update profile settings ──────────────────────────
  app.patch('/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const patch = UpdateProfileBody.parse(request.body)

    const { data, error } = await cradle.supabaseAdmin
      .from('users')
      .update(patch)
      .eq('id', request.userId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return reply.send(data)
  })

  // ── POST /auth/apply-referral — apply referral code ────────────────────
  app.post('/auth/apply-referral', { preHandler: [authenticate] }, async (request, reply) => {
    const { referralCode } = ApplyReferralBody.parse(request.body)

    // Find referrer
    const { data: referrer } = await cradle.supabaseAdmin
      .from('users')
      .select('id')
      .eq('referral_code', referralCode)
      .maybeSingle()

    if (!referrer) {
      return reply.status(404).send({ ok: false, error: { code: 'REFERRAL_NOT_FOUND', message: 'Invalid referral code' } })
    }

    if (referrer.id === request.userId) {
      return reply.status(400).send({ ok: false, error: { code: 'SELF_REFERRAL', message: 'Cannot refer yourself' } })
    }

    // Check if already referred
    const { data: user } = await cradle.supabaseAdmin
      .from('users')
      .select('referred_by')
      .eq('id', request.userId)
      .single()

    if (user?.referred_by) {
      return reply.status(409).send({ ok: false, error: { code: 'ALREADY_REFERRED', message: 'Already has a referrer' } })
    }

    // Apply
    await cradle.supabaseAdmin
      .from('users')
      .update({ referred_by: referrer.id })
      .eq('id', request.userId)

    return reply.send({ ok: true, referrerId: referrer.id })
  })
}
