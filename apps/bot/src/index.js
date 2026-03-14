import { Telegraf, session } from 'telegraf'
import { logger } from './utils/logger.js'

// Middleware
import { userMiddleware } from './middleware/userMiddleware.js'
import { rateLimiter } from './middleware/rateLimiter.js'

// Handlers
import { registerStartHandler }       from './handlers/start.js'
import { registerProfileHandler }     from './handlers/profile.js'
import { registerCatalogHandler }     from './handlers/catalog.js'
import { registerOrdersHandler }      from './handlers/orders.js'
import { registerCheckinHandler }     from './handlers/checkin.js'
import { registerInviteHandler }      from './handlers/invite.js'
import { registerChannelPostHandler } from './handlers/channelPost.js'
import { registerAdminHandler }       from './handlers/admin.js'
import { registerPaymentHandler }    from './handlers/payment.js'
import { registerAiChatHandler }     from './handlers/aiChat.js'
import { registerEventsHandler }     from './handlers/events.js'
import { registerDealsHandler }      from './handlers/deals.js'
import { registerWeatherHandler }    from './handlers/weather.js'

const BOT_TOKEN = process.env.BOT_TOKEN
if (!BOT_TOKEN) {
  logger.error('BOT_TOKEN is required')
  process.exit(1)
}

const bot = new Telegraf(BOT_TOKEN)

// ── Middleware ────────────────────────────────────────────────────────────────
bot.use(session())
bot.use(rateLimiter())
bot.use(userMiddleware())

// ── Error handler ─────────────────────────────────────────────────────────────
bot.catch((err, ctx) => {
  logger.error({
    err:    err.message,
    update: ctx.update?.update_id,
    from:   ctx.from?.id,
  }, 'Bot: unhandled error')

  ctx.reply('⚠️ Something went wrong. Please try again later.').catch(() => {})
})

// ── Register handlers ─────────────────────────────────────────────────────────
registerStartHandler(bot)
registerProfileHandler(bot)
registerCatalogHandler(bot)
registerOrdersHandler(bot)
registerCheckinHandler(bot)
registerInviteHandler(bot)
registerChannelPostHandler(bot)
registerAdminHandler(bot)
registerPaymentHandler(bot)
registerAiChatHandler(bot)
registerEventsHandler(bot)
registerDealsHandler(bot)
registerWeatherHandler(bot)

// ── Launch ────────────────────────────────────────────────────────────────────
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN
const WEBHOOK_PATH   = process.env.WEBHOOK_PATH ?? '/webhook/telegram'

async function start() {
  if (WEBHOOK_DOMAIN) {
    // Production: webhook mode
    const webhookUrl = `${WEBHOOK_DOMAIN}${WEBHOOK_PATH}`
    await bot.telegram.setWebhook(webhookUrl, {
      secret_token: process.env.WEBHOOK_SECRET_TOKEN,
    })
    logger.info({ webhookUrl }, 'Bot: webhook set')

    // If running standalone (not behind backend), start webhook server
    const PORT = parseInt(process.env.PORT ?? process.env.BOT_PORT ?? '3002', 10)
    await bot.launch({
      webhook: {
        domain:    WEBHOOK_DOMAIN,
        path:      WEBHOOK_PATH,
        port:      PORT,
        secretToken: process.env.WEBHOOK_SECRET_TOKEN,
      },
    })
    logger.info({ port: PORT }, 'Bot: webhook server started')
  } else {
    // Development: long polling
    await bot.launch()
    logger.info('Bot: started in polling mode')
  }
}

start().catch(err => {
  logger.error({ err: err.message }, 'Bot: failed to start')
  process.exit(1)
})

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.once('SIGINT',  () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
