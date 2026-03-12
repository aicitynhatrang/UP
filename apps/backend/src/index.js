import Fastify          from 'fastify'
import cors             from '@fastify/cors'
import jwt              from '@fastify/jwt'
import rateLimit        from '@fastify/rate-limit'
import { logger }       from './utils/logger.js'
import { buildContainer } from './container.js'
import { buildErrorHandler } from './utils/errors.js'
import { initSentry }   from './config/sentry.js'
import { securityConfig } from './config/security.js'

// ─── Route registrars (added as phases complete) ─────────────────────────────
import { registerAuthRoutes }     from './api/routes/v1/auth.js'
import { registerUserRoutes }     from './api/routes/v1/users.js'
import { registerProviderRoutes } from './api/routes/v1/providers.js'
import { registerOrderRoutes }    from './api/routes/v1/orders.js'
import { registerCatalogRoutes }  from './api/routes/v1/catalog.js'
import { registerParserRoutes }   from './api/routes/v1/integrations/parser.js'
import { registerParserSetupRoutes } from './api/routes/v1/integrations/parserSetup.js'
import { registerGamificationRoutes } from './api/routes/v1/gamification.js'
import { registerCreatorRoutes }     from './api/routes/v1/creators.js'
import { registerPaymentRoutes }    from './api/routes/v1/payments.js'
import { registerAiRoutes }        from './api/routes/v1/ai.js'
import { registerVoiceRoutes }     from './api/routes/v1/voice.js'
import { registerEventRoutes }    from './api/routes/v1/events.js'
import { registerExternalRoutes } from './api/routes/v1/integrations/external.js'
import { registerAdminRoutes }   from './api/routes/v1/admin.js'
import { registerHealthRoute }    from './api/routes/health.js'

// ─── Jobs ────────────────────────────────────────────────────────────────────
import { startScheduler }  from './jobs/scheduler.js'

const PORT = parseInt(process.env.PORT ?? '4000', 10)
const HOST = process.env.HOST ?? '0.0.0.0'

async function bootstrap() {
  // 1. Sentry (before anything else)
  initSentry()

  // 2. DI container
  const container = buildContainer()
  const cradle    = container.cradle

  // 3. Fastify instance
  const app = Fastify({
    logger: false,           // use Winston instead
    trustProxy: true,        // Railway/Vercel behind proxy
    disableRequestLogging: true,
  })

  // 4. Plugins ─────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? securityConfig.cors.origins
      : true,
    credentials: true,
  })

  await app.register(jwt, {
    secret:  securityConfig.jwt.secret,
    sign:    { expiresIn: securityConfig.jwt.accessExpiresIn },
  })

  await app.register(rateLimit, {
    max:        100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests', details: null },
    }),
  })

  // 5. Decorate request with DI container for handler access
  app.decorateRequest('container', null)
  app.addHook('onRequest', async (request) => {
    request.container = container
  })

  // 6. Request logging via Winston
  app.addHook('onResponse', (request, reply, done) => {
    logger.info('Request', {
      method:     request.method,
      url:        request.url,
      statusCode: reply.statusCode,
      ms:         reply.elapsedTime.toFixed(2),
    })
    done()
  })

  // 7. Error handler
  app.setErrorHandler(buildErrorHandler(logger))

  // 8. Honeypot — instant IP ban for scanner paths
  app.addHook('onRequest', async (request, reply) => {
    const honeypotPaths = securityConfig.honeypot.paths
    if (honeypotPaths.includes(request.url)) {
      logger.warn('Honeypot triggered', { ip: request.ip, url: request.url })
      // Alert admin via Telegram (non-blocking)
      const chatId = securityConfig.honeypot.alertChatId
      if (chatId) {
        cradle.notificationService
          .alertAdmin(`🚨 Honeypot hit: ${request.ip} → ${request.url}`)
          .catch(() => {})
      }
      return reply.status(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Not found', details: null } })
    }
  })

  // 9. Routes ───────────────────────────────────────────────────────────────────
  await app.register(async (api) => {
    registerHealthRoute(api)

    await api.register(async (v1) => {
      registerAuthRoutes(v1, cradle)
      registerUserRoutes(v1, cradle)
      registerProviderRoutes(v1, cradle)
      registerCatalogRoutes(v1, cradle)
      registerOrderRoutes(v1, cradle)
      registerParserRoutes(v1, cradle)
      registerParserSetupRoutes(v1, cradle)
      registerGamificationRoutes(v1, cradle)
      registerCreatorRoutes(v1, cradle)
      registerPaymentRoutes(v1, cradle)
      registerAiRoutes(v1, cradle)
      registerVoiceRoutes(v1, cradle)
      registerEventRoutes(v1, cradle)
      registerExternalRoutes(v1, cradle)
      registerAdminRoutes(v1, cradle)
    }, { prefix: '/api/v1' })
  })

  // 10. Background jobs
  await startScheduler(cradle)

  // 11. Start server
  await app.listen({ port: PORT, host: HOST })
  logger.info(`AllCity backend running on ${HOST}:${PORT}`, {
    env: process.env.NODE_ENV ?? 'development',
  })
}

bootstrap().catch((err) => {
  logger.error('Bootstrap failed', { error: err.message, stack: err.stack })
  process.exit(1)
})
