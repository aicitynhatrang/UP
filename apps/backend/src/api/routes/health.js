/**
 * GET /health — liveness probe for Railway / load balancers
 */
export function registerHealthRoute(app) {
  app.get('/health', { logLevel: 'silent' }, async (request, reply) => {
    return reply.send({ ok: true, service: 'allcity-backend', ts: new Date().toISOString() })
  })
}
