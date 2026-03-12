import { createClient } from '@supabase/supabase-js'
import { Markup } from 'telegraf'

const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID ?? '0', 10)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

export function registerAdminHandler(bot) {
  bot.command('admin', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return

    const [usersResult, providersResult, ordersResult] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('providers').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
    ])

    const lines = [
      '🔧 *Admin Panel*',
      '',
      `👥 Users: ${usersResult.count ?? 0}`,
      `🏢 Providers: ${providersResult.count ?? 0}`,
      `📋 Orders: ${ordersResult.count ?? 0}`,
    ]

    await ctx.replyWithMarkdownV2(escapeMarkdown(lines.join('\n')), {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📊 Stats today', 'admin:stats_today')],
        [Markup.button.callback('🚨 Recent bans', 'admin:bans')],
        [Markup.button.callback('📡 Parser status', 'admin:parser')],
      ]),
    })
  })

  bot.action('admin:stats_today', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('Unauthorized')
    await ctx.answerCbQuery()

    const today = new Date().toISOString().slice(0, 10)

    const [ordersToday, checkinsToday, usersToday] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
      supabase.from('checkins').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
    ])

    await ctx.editMessageText(escapeMarkdown([
      '📊 *Stats today*',
      '',
      `📋 Orders: ${ordersToday.count ?? 0}`,
      `📍 Check-ins: ${checkinsToday.count ?? 0}`,
      `👤 New users: ${usersToday.count ?? 0}`,
    ].join('\n')), {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([[Markup.button.callback('◀️ Back', 'admin:back')]]),
    })
  })

  bot.action('admin:back', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return
    await ctx.answerCbQuery()
    // Re-trigger admin
    ctx.startPayload = ''
    await ctx.deleteMessage().catch(() => {})
  })
}

function escapeMarkdown(text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1')
}
