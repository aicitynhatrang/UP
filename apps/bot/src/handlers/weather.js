import { api } from '../utils/api.js'
import { logger } from '../utils/logger.js'

export function registerWeatherHandler(bot) {
  bot.hears([/🌤\s*Погода/i, /🌤\s*Weather/i, /🌤\s*Thời tiết/i], handleWeather)
  bot.command('weather', handleWeather)
}

async function handleWeather(ctx) {
  const lang = ctx.lang ?? 'ru'

  try {
    const { data } = await api.get('/api/v1/weather')

    const tempStr = `${Math.round(data.temp)}°C`
    const feelsStr = `${Math.round(data.feelsLike)}°C`
    const desc = data.description ?? ''
    const humidity = data.humidity ?? 0
    const wind = data.windSpeed ? `${data.windSpeed} m/s` : '-'

    const texts = {
      ru: [
        `🌤 *Погода в Нячанге*`,
        ``,
        `🌡 ${tempStr} (ощущается ${feelsStr})`,
        `☁️ ${desc}`,
        `💧 Влажность: ${humidity}%`,
        `💨 Ветер: ${wind}`,
      ],
      en: [
        `🌤 *Weather in Nha Trang*`,
        ``,
        `🌡 ${tempStr} (feels like ${feelsStr})`,
        `☁️ ${desc}`,
        `💧 Humidity: ${humidity}%`,
        `💨 Wind: ${wind}`,
      ],
      vi: [
        `🌤 *Thời tiết Nha Trang*`,
        ``,
        `🌡 ${tempStr} (cảm giác ${feelsStr})`,
        `☁️ ${desc}`,
        `💧 Độ ẩm: ${humidity}%`,
        `💨 Gió: ${wind}`,
      ],
    }

    const lines = texts[lang] ?? texts.en
    await ctx.replyWithMarkdownV2(escapeMarkdown(lines.join('\n')))
  } catch (err) {
    logger.error({ err: err.message }, 'Weather: failed')
    await ctx.reply(lang === 'ru' ? '⚠️ Ошибка получения погоды.' : '⚠️ Failed to get weather.')
  }
}

function escapeMarkdown(text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1')
}
