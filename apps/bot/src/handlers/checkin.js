import { Markup } from 'telegraf'
import { api } from '../utils/api.js'

export function registerCheckinHandler(bot) {
  bot.hears([/📍\s*Чекин/i, /📍\s*Check-in/i, /📍\s*Check/i], handleCheckin)
  bot.command('checkin', handleCheckin)

  // Handle location share
  bot.on('location', async (ctx) => {
    if (!ctx.dbUser) return ctx.reply('Please /start first.')

    // Store location temporarily — user needs to pick a provider next
    ctx.session ??= {}
    ctx.session.lastLocation = {
      lat: ctx.message.location.latitude,
      lng: ctx.message.location.longitude,
    }

    const labels = {
      ru: '📍 Отлично! Теперь выберите заведение для чекина через Mini App:',
      en: '📍 Got it! Now select a venue to check in via Mini App:',
      vi: '📍 Tuyệt! Chọn địa điểm check-in qua Mini App:',
    }

    const btnLabels = {
      ru: '📍 Выбрать заведение',
      en: '📍 Choose venue',
      vi: '📍 Chọn địa điểm',
    }

    const lang = ctx.lang ?? 'ru'
    const MINI_APP_URL = process.env.MINI_APP_URL ?? 'https://allcity.vn'

    await ctx.reply(labels[lang] ?? labels.ru, {
      ...Markup.inlineKeyboard([
        Markup.button.webApp(
          btnLabels[lang] ?? btnLabels.ru,
          `${MINI_APP_URL}/catalog?lat=${ctx.message.location.latitude}&lng=${ctx.message.location.longitude}`,
        ),
      ]),
    })
  })
}

async function handleCheckin(ctx) {
  const labels = {
    ru: '📍 Отправьте вашу геолокацию для чекина:',
    en: '📍 Share your location to check in:',
    vi: '📍 Chia sẻ vị trí để check-in:',
  }

  const lang = ctx.lang ?? 'ru'

  await ctx.reply(labels[lang] ?? labels.ru, {
    ...Markup.keyboard([
      [Markup.button.locationRequest(lang === 'ru' ? '📍 Отправить геолокацию' : lang === 'vi' ? '📍 Gửi vị trí' : '📍 Share Location')],
    ]).resize().oneTime(),
  })
}
