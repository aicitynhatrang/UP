import { Markup } from 'telegraf'
import { api } from '../utils/api.js'
import { logger } from '../utils/logger.js'

const MINI_APP_URL = process.env.MINI_APP_URL ?? 'https://allcity.vn'

export function registerAiChatHandler(bot) {
  bot.command('ai', handleAiStart)

  // Handle direct text messages when in AI chat mode
  bot.on('text', async (ctx, next) => {
    if (!ctx.session?.aiChatActive) return next()

    const message = ctx.message.text
    // Skip if it's a command or keyboard button press
    if (message.startsWith('/') || /^[🔍📋👤📍🎁⭐🌤🎪🔥]/.test(message)) {
      ctx.session.aiChatActive = false
      return next()
    }

    const lang = ctx.lang ?? 'ru'
    const user = ctx.dbUser
    if (!user) return next()

    try {
      const { data } = await api.post('/api/v1/ai/chat', {
        message,
        lang,
      })

      await ctx.reply(data.reply, {
        ...Markup.inlineKeyboard([
          [Markup.button.callback(
            lang === 'ru' ? '❌ Завершить чат' : '❌ End chat',
            'ai:end',
          )],
        ]),
      })
    } catch (err) {
      logger.error({ err: err.message }, 'AiChat: failed')
      await ctx.reply(lang === 'ru' ? '⚠️ AI временно недоступен.' : '⚠️ AI is temporarily unavailable.')
    }
  })

  bot.action('ai:end', async (ctx) => {
    await ctx.answerCbQuery()
    ctx.session ??= {}
    ctx.session.aiChatActive = false
    const lang = ctx.lang ?? 'ru'
    await ctx.editMessageText(
      lang === 'ru' ? '🤖 Чат с AI завершён. Используйте /ai для нового сеанса.' : '🤖 AI chat ended. Use /ai for a new session.',
    )
  })

  // Recommendation shortcut
  bot.command('recommend', async (ctx) => {
    const lang = ctx.lang ?? 'ru'
    const query = ctx.message.text.replace(/^\/recommend\s*/i, '').trim()

    try {
      const { data } = await api.post('/api/v1/ai/recommend', {
        query: query || undefined,
      })

      if (!data?.length) {
        return ctx.reply(lang === 'ru' ? 'Не нашёл рекомендаций.' : 'No recommendations found.')
      }

      const lines = data.map((r, i) =>
        `${i + 1}. *${escapeMarkdown(r.suggestion)}*\n   ${escapeMarkdown(r.reason)}`,
      )

      await ctx.replyWithMarkdownV2(
        `🤖 ${lang === 'ru' ? 'Рекомендации' : 'Recommendations'}:\n\n${lines.join('\n\n')}`,
        {
          ...Markup.inlineKeyboard([
            Markup.button.webApp(
              lang === 'ru' ? '🔍 Открыть каталог' : '🔍 Open catalog',
              `${MINI_APP_URL}/catalog`,
            ),
          ]),
        },
      )
    } catch (err) {
      logger.error({ err: err.message }, 'AiChat: recommend failed')
      await ctx.reply(lang === 'ru' ? '⚠️ Ошибка получения рекомендаций.' : '⚠️ Failed to get recommendations.')
    }
  })
}

async function handleAiStart(ctx) {
  const lang = ctx.lang ?? 'ru'
  ctx.session ??= {}
  ctx.session.aiChatActive = true

  const texts = {
    ru: '🤖 AI-консьерж активирован! Напишите ваш вопрос о Нячанге — рестораны, спа, туры, погода...\n\nИспользуйте /recommend для рекомендаций.',
    en: '🤖 AI concierge activated! Ask me anything about Nha Trang — restaurants, spas, tours, weather...\n\nUse /recommend for recommendations.',
    vi: '🤖 Trợ lý AI đã kích hoạt! Hỏi tôi về Nha Trang — nhà hàng, spa, tour, thời tiết...\n\nDùng /recommend để nhận gợi ý.',
  }

  await ctx.reply(texts[lang] ?? texts.en)
}

function escapeMarkdown(text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1')
}
