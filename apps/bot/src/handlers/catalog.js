import { VERTICALS_CONFIG } from '@allcity/shared/constants/verticals'
import { Markup } from 'telegraf'

const MINI_APP_URL = process.env.MINI_APP_URL ?? 'https://allcity.vn'

export function registerCatalogHandler(bot) {
  bot.hears([/🔍\s*Каталог/i, /🔍\s*Catalog/i, /🔍\s*Danh mục/i], handleCatalog)
  bot.command('catalog', handleCatalog)

  // Handle vertical selection
  bot.action(/^vertical:(.+)$/, async (ctx) => {
    const slug = ctx.match[1]
    const v = VERTICALS_CONFIG.find(vc => vc.slug === slug)
    if (!v) return ctx.answerCbQuery('Not found')

    await ctx.answerCbQuery()
    await ctx.editMessageText(
      `${v.emoji} *${v.name.ru}*`,
      {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp(`🔍 Открыть ${v.name.ru}`, `${MINI_APP_URL}/catalog/${slug}`)],
          [Markup.button.callback('◀️ Назад', 'catalog_back')],
        ]),
      },
    )
  })

  bot.action('catalog_back', async (ctx) => {
    await ctx.answerCbQuery()
    await showCatalog(ctx)
  })
}

async function handleCatalog(ctx) {
  await showCatalog(ctx)
}

async function showCatalog(ctx) {
  // Build grid: 2 verticals per row
  const buttons = []
  for (let i = 0; i < VERTICALS_CONFIG.length; i += 2) {
    const row = []
    row.push(Markup.button.callback(
      `${VERTICALS_CONFIG[i].emoji} ${VERTICALS_CONFIG[i].name.ru}`,
      `vertical:${VERTICALS_CONFIG[i].slug}`,
    ))
    if (VERTICALS_CONFIG[i + 1]) {
      row.push(Markup.button.callback(
        `${VERTICALS_CONFIG[i + 1].emoji} ${VERTICALS_CONFIG[i + 1].name.ru}`,
        `vertical:${VERTICALS_CONFIG[i + 1].slug}`,
      ))
    }
    buttons.push(row)
  }

  const text = ctx.lang === 'en' ? '📂 Choose a category:' : ctx.lang === 'vi' ? '📂 Chọn danh mục:' : '📂 Выберите категорию:'

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, Markup.inlineKeyboard(buttons))
  } else {
    await ctx.reply(text, Markup.inlineKeyboard(buttons))
  }
}
