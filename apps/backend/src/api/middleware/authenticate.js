import { Errors } from '../../utils/errors.js'

/**
 * Fastify preHandler hook: verifies JWT and attaches user claims to request.
 * Usage: { preHandler: [authenticate] }
 */
export async function authenticate(request) {
  try {
    const decoded = await request.jwtVerify()
    request.userId    = decoded.sub
    request.telegramId = decoded.telegram_id
    request.userLevel = decoded.level
    request.isAdmin   = decoded.is_admin ?? false
  } catch {
    throw Errors.unauthorized('Invalid or expired token')
  }
}

/**
 * Same as authenticate but doesn't throw — attaches null if no token.
 */
export async function optionalAuth(request) {
  try {
    const decoded = await request.jwtVerify()
    request.userId    = decoded.sub
    request.telegramId = decoded.telegram_id
    request.userLevel = decoded.level
    request.isAdmin   = decoded.is_admin ?? false
  } catch {
    request.userId    = null
    request.telegramId = null
    request.userLevel = null
    request.isAdmin   = false
  }
}

/**
 * Require admin role.
 * Usage: { preHandler: [authenticate, requireAdmin] }
 */
export async function requireAdmin(request) {
  if (!request.isAdmin) {
    throw Errors.forbidden('Admin access required')
  }
}
