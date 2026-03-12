import { authenticate, requireAdmin } from '../../middleware/authenticate.js'
import { Errors } from '../../../utils/errors.js'

/**
 * User routes (points, referrals, sessions).
 * Prefix: /api/v1/users
 */
export function registerUserRoutes(app, { supabaseAdmin, pointsService }) {

  // ── GET /users/me/points — points history ──────────────────────────────
  app.get('/users/me/points', { preHandler: [authenticate] }, async (request, reply) => {
    const { data, error } = await supabaseAdmin
      .from('points_log')
      .select('*')
      .eq('user_id', request.userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw Errors.internal(error.message)
    return reply.send(data ?? [])
  })

  // ── GET /users/me/referrals — referral stats ───────────────────────────
  app.get('/users/me/referrals', { preHandler: [authenticate] }, async (request, reply) => {
    const [referred, payouts] = await Promise.all([
      supabaseAdmin
        .from('users')
        .select('id, first_name, level, created_at')
        .eq('referred_by', request.userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('referral_payouts')
        .select('*')
        .eq('referrer_id', request.userId)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    return reply.send({
      referredUsers: referred.data ?? [],
      payouts:       payouts.data ?? [],
    })
  })

  // ── GET /users/me/sessions — active sessions ──────────────────────────
  app.get('/users/me/sessions', { preHandler: [authenticate] }, async (request, reply) => {
    const { data } = await supabaseAdmin
      .from('user_sessions')
      .select('id, ip_address, user_agent, last_active_at, created_at')
      .eq('user_id', request.userId)
      .order('last_active_at', { ascending: false })

    return reply.send(data ?? [])
  })

  // ── DELETE /users/me/sessions/:id — revoke session ─────────────────────
  app.delete('/users/me/sessions/:id', { preHandler: [authenticate] }, async (request, reply) => {
    await supabaseAdmin
      .from('user_sessions')
      .delete()
      .eq('id', request.params.id)
      .eq('user_id', request.userId)

    return reply.send({ ok: true })
  })

  // ── GET /users/:id — admin: get any user ──────────────────────────────
  app.get('/users/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', request.params.id)
      .single()

    if (error || !data) throw Errors.notFound('User not found')
    return reply.send(data)
  })
}
