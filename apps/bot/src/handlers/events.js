import { Markup } from 'telegraf'
import { api } from '../utils/api.js'
import { logger } from '../utils/logger.js'

const MINI_APP_URL = process.env.MINI_APP_URL ?? 'https://allcity.vn'

export function registerEventsHandler(bot) {
  bot.hears([/🎪\s*Событ/i, /🎪\s*Events/i, /🎪\s*Sự kiện/i], handleEvents)
  bot.command('events', handleEvents)

  // Event detail
  bot.action(/^event_view:(.+)$/, async (ctx) => {
    const eventId = ctx.match[1]
    await ctx.answerCbQuery()

    try {
      const { data: event } = await api.get(`/api/v1/events/${eventId}`)
      const lang = ctx.lang ?? 'ru'
      const title = event.title?.[lang] ?? event.title?.ru ?? event.title?.en ?? 'Event'
      const desc = event.description?.[lang] ?? event.description?.ru ?? ''
      const date = new Date(event.starts_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : lang === 'en' ? 'en-US' : 'ru-RU', {
        weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })

      const lines = [
        `🎪 *${escapeMarkdown(title)}*`,
        ``,
        `📅 ${escapeMarkdown(date)}`,
        event.location_name ? `📍 ${escapeMarkdown(event.location_name)}` : '',
        `👥 ${event.attendee_count} attending`,
        event.is_free ? '🆓 Free' : `💰 ${event.price_vnd?.toLocaleString()} VND`,
        desc ? `\n${escapeMarkdown(desc.slice(0, 200))}` : '',
      ].filter(Boolean)

      await ctx.editMessageText(lines.join('\n'), {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp(
            lang === 'ru' ? '🎪 Подробнее' : '🎪 Details',
            `${MINI_APP_URL}/events/${eventId}`,
          )],
          [Markup.button.callback('◀️', 'events_back')],
        ]),
      })
    } catch (err) {
      logger.error({ err: err.message, eventId }, 'Events: detail failed')
      await ctx.editMessageText('Event not found.')
    }
  })

  bot.action('events_back', async (ctx) => {
    await ctx.answerCbQuery()
    await showEvents(ctx)
  })
}

async function handleEvents(ctx) {
  await showEvents(ctx)
}

async function showEvents(ctx) {
  const lang = ctx.lang ?? 'ru'

  try {
    const { data: events } = await api.get('/api/v1/events?limit=8')

    if (!events?.length) {
      const text = lang === 'ru' ? '🎪 Пока нет предстоящих событий.' : lang === 'vi' ? '🎪 Chưa có sự kiện nào.' : '🎪 No upcoming events.'
      return ctx.callbackQuery
        ? ctx.editMessageText(text)
        : ctx.reply(text)
    }

    const buttons = events.map(e => {
      const title = e.title?.[lang] ?? e.title?.ru ?? e.title?.en ?? 'Event'
      const date = new Date(e.starts_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })
      return [Markup.button.callback(`${e.is_free ? '🆓' : '💰'} ${date} — ${title.slice(0, 30)}`, `event_view:${e.id}`)]
    })

    buttons.push([Markup.button.webApp(
      lang === 'ru' ? '🎪 Все события' : '🎪 All events',
      `${MINI_APP_URL}/events`,
    )])

    const text = lang === 'ru' ? '🎪 Ближайшие события:' : lang === 'vi' ? '🎪 Sự kiện sắp tới:' : '🎪 Upcoming events:'

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, Markup.inlineKeyboard(buttons))
    } else {
      await ctx.reply(text, Markup.inlineKeyboard(buttons))
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Events: list failed')
    await ctx.reply(lang === 'ru' ? '⚠️ Ошибка загрузки событий.' : '⚠️ Failed to load events.')
  }
}

function escapeMarkdown(text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1')
}
