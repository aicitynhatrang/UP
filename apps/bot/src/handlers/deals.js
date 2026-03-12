import { Markup } from 'telegraf'
import { api } from '../utils/api.js'
import { logger } from '../utils/logger.js'

const MINI_APP_URL = process.env.MINI_APP_URL ?? 'https://allcity.vn'

export function registerDealsHandler(bot) {
  bot.hears([/🔥\s*Скидки/i, /🔥\s*Deals/i, /🔥\s*Giảm giá/i], handleDeals)
  bot.command('deals', handleDeals)

  // Claim a flash deal
  bot.action(/^deal_claim:(.+)$/, async (ctx) => {
    const dealId = ctx.match[1]
    await ctx.answerCbQuery()
    const lang = ctx.lang ?? 'ru'

    try {
      await api.post(`/api/v1/gamification/flash-deals/${dealId}/claim`)
      const texts = {
        ru: '✅ Вы забрали скидку! Откройте Mini App для деталей.',
        en: '✅ Deal claimed! Open Mini App for details.',
        vi: '✅ Đã nhận ưu đãi! Mở Mini App để xem chi tiết.',
      }
      await ctx.editMessageText(texts[lang] ?? texts.en, {
        ...Markup.inlineKeyboard([
          Markup.button.webApp(lang === 'ru' ? '🏙 Открыть' : '🏙 Open', MINI_APP_URL),
        ]),
      })
    } catch (err) {
      const msg = err.message ?? 'Error'
      await ctx.editMessageText(`⚠️ ${msg}`)
    }
  })
}

async function handleDeals(ctx) {
  const lang = ctx.lang ?? 'ru'

  try {
    const { data: deals } = await api.get('/api/v1/gamification/flash-deals?status=active&limit=5')

    if (!deals?.length) {
      const texts = {
        ru: '🔥 Сейчас нет активных Flash-скидок. Заходите позже!',
        en: '🔥 No active flash deals right now. Check back later!',
        vi: '🔥 Hiện chưa có flash deal. Quay lại sau nhé!',
      }
      return ctx.reply(texts[lang] ?? texts.en)
    }

    const buttons = deals.map(deal => {
      const title = deal.title ?? `${deal.discount_pct}% OFF`
      const remaining = deal.max_claims - deal.claimed_count
      return [Markup.button.callback(
        `🔥 ${title} (${remaining} left)`,
        `deal_claim:${deal.id}`,
      )]
    })

    buttons.push([Markup.button.webApp(
      lang === 'ru' ? '🔥 Все скидки' : '🔥 All deals',
      `${MINI_APP_URL}/deals`,
    )])

    const texts = {
      ru: '🔥 Активные Flash-скидки:',
      en: '🔥 Active Flash Deals:',
      vi: '🔥 Flash Deal đang hoạt động:',
    }

    await ctx.reply(texts[lang] ?? texts.en, Markup.inlineKeyboard(buttons))
  } catch (err) {
    logger.error({ err: err.message }, 'Deals: list failed')
    await ctx.reply(lang === 'ru' ? '⚠️ Ошибка загрузки скидок.' : '⚠️ Failed to load deals.')
  }
}
