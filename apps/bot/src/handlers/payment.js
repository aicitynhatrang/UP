import { Markup } from 'telegraf'
import { api } from '../utils/api.js'
import { logger } from '../utils/logger.js'

const MINI_APP_URL = process.env.MINI_APP_URL ?? 'https://allcity.vn'

const PRODUCTS = {
  boost_7d:  { title: { ru: 'Буст 7 дней', en: 'Boost 7 days', vi: 'Boost 7 ngày' }, stars: 50 },
  boost_30d: { title: { ru: 'Буст 30 дней', en: 'Boost 30 days', vi: 'Boost 30 ngày' }, stars: 150 },
  premium:   { title: { ru: 'Premium 30 дней', en: 'Premium 30 days', vi: 'Premium 30 ngày' }, stars: 200 },
}

export function registerPaymentHandler(bot) {
  // Show available Star purchases
  bot.hears([/⭐\s*Stars/i, /⭐\s*Купить/i, /⭐\s*Buy/i], handleStarsMenu)
  bot.command('stars', handleStarsMenu)

  // Handle product selection
  bot.action(/^buy_stars:(.+)$/, async (ctx) => {
    const productKey = ctx.match[1]
    const product = PRODUCTS[productKey]
    if (!product) return ctx.answerCbQuery('Product not found')

    await ctx.answerCbQuery()
    const lang = ctx.lang ?? 'ru'
    const title = product.title[lang] ?? product.title.en

    try {
      // Create invoice in backend
      const { data: invoice } = await api.post('/api/v1/payments/stars/invoice', {
        product: productKey,
        starAmount: product.stars,
        description: title,
      })

      // Send Telegram Stars invoice
      await ctx.replyWithInvoice({
        title,
        description: `AllCity: ${title}`,
        payload: JSON.stringify({ invoiceId: invoice.id, product: productKey }),
        provider_token: '', // empty for Telegram Stars
        currency: 'XTR',
        prices: [{ label: title, amount: product.stars }],
      })
    } catch (err) {
      logger.error({ err: err.message, productKey }, 'Payment: failed to create Stars invoice')
      await ctx.reply(lang === 'ru' ? 'Ошибка создания счёта. Попробуйте позже.' : 'Failed to create invoice. Try again later.')
    }
  })

  // Pre-checkout query — must answer within 10 seconds
  bot.on('pre_checkout_query', async (ctx) => {
    try {
      await ctx.answerPreCheckoutQuery(true)
    } catch (err) {
      logger.error({ err: err.message }, 'Payment: pre_checkout_query failed')
      await ctx.answerPreCheckoutQuery(false, 'Payment processing error').catch(() => {})
    }
  })

  // Successful payment
  bot.on('message', async (ctx, next) => {
    const payment = ctx.message?.successful_payment
    if (!payment) return next()

    const lang = ctx.lang ?? 'ru'

    try {
      const payload = JSON.parse(payment.invoice_payload)

      await api.post('/api/v1/payments/stars/confirm', {
        invoiceId: payload.invoiceId,
        telegramPaymentChargeId: payment.telegram_payment_charge_id,
      })

      const texts = {
        ru: '✅ Оплата прошла успешно! Спасибо за покупку.',
        en: '✅ Payment successful! Thank you for your purchase.',
        vi: '✅ Thanh toán thành công! Cảm ơn bạn.',
      }

      await ctx.reply(texts[lang] ?? texts.en, {
        ...Markup.inlineKeyboard([
          Markup.button.webApp(
            lang === 'ru' ? '🏙 Открыть AllCity' : '🏙 Open AllCity',
            MINI_APP_URL,
          ),
        ]),
      })

      logger.info({
        userId: ctx.dbUser?.id,
        product: payload.product,
        stars: payment.total_amount,
        chargeId: payment.telegram_payment_charge_id,
      }, 'Payment: Stars payment completed')
    } catch (err) {
      logger.error({ err: err.message }, 'Payment: failed to confirm Stars payment')
      await ctx.reply(lang === 'ru' ? '⚠️ Оплата получена, но возникла ошибка обработки. Свяжитесь с поддержкой.' : '⚠️ Payment received but processing error. Contact support.')
    }
  })
}

async function handleStarsMenu(ctx) {
  const lang = ctx.lang ?? 'ru'

  const texts = {
    ru: '⭐ Купить за Telegram Stars:',
    en: '⭐ Buy with Telegram Stars:',
    vi: '⭐ Mua bằng Telegram Stars:',
  }

  const buttons = Object.entries(PRODUCTS).map(([key, product]) => {
    const title = product.title[lang] ?? product.title.en
    return [Markup.button.callback(`⭐ ${product.stars} — ${title}`, `buy_stars:${key}`)]
  })

  await ctx.reply(texts[lang] ?? texts.en, Markup.inlineKeyboard(buttons))
}
