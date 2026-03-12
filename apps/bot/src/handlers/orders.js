import { Markup } from 'telegraf'
import { createClient } from '@supabase/supabase-js'
import { formatCurrency } from '@allcity/shared/utils/format'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const MINI_APP_URL = process.env.MINI_APP_URL ?? 'https://allcity.vn'

const STATUS_EMOJI = {
  pending:     '🟡',
  accepted:    '🔵',
  in_progress: '🟣',
  completed:   '🟢',
  cancelled:   '⚫',
  disputed:    '🔴',
}

export function registerOrdersHandler(bot) {
  bot.hears([/📋\s*Заказы/i, /📋\s*Orders/i, /📋\s*Đơn hàng/i], handleOrders)
  bot.command('orders', handleOrders)

  // Action: view order detail
  bot.action(/^order_detail:(.+)$/, async (ctx) => {
    const orderId = ctx.match[1]
    await ctx.answerCbQuery()

    const { data: order } = await supabase
      .from('orders')
      .select(`
        *,
        provider:providers!orders_provider_id_fkey(name, slug)
      `)
      .eq('id', orderId)
      .single()

    if (!order) return ctx.editMessageText('Order not found.')

    const providerName = order.provider?.name?.ru ?? order.provider?.slug ?? 'Provider'
    const emoji = STATUS_EMOJI[order.status] ?? '⚪'

    const lines = [
      `📋 *Заказ*`,
      ``,
      `🏢 ${escapeMarkdown(providerName)}`,
      `${emoji} Статус: ${order.status}`,
      `💰 ${escapeMarkdown(formatCurrency(order.final_amount_vnd))}`,
      `📅 ${escapeMarkdown(new Date(order.created_at).toLocaleDateString())}`,
    ]

    if (order.notes) lines.push(`📝 ${escapeMarkdown(order.notes)}`)

    await ctx.editMessageText(lines.join('\n'), {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('📋 Открыть заказ', `${MINI_APP_URL}/orders/${orderId}`)],
        [Markup.button.callback('◀️ Назад', 'orders_back')],
      ]),
    })
  })

  bot.action('orders_back', async (ctx) => {
    await ctx.answerCbQuery()
    await showOrders(ctx)
  })
}

async function handleOrders(ctx) {
  await showOrders(ctx)
}

async function showOrders(ctx) {
  const user = ctx.dbUser
  if (!user) return ctx.reply('Please /start first.')

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, status, final_amount_vnd, created_at,
      provider:providers!orders_provider_id_fkey(name, slug)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!orders?.length) {
    const text = ctx.lang === 'en' ? 'You have no orders yet.' : ctx.lang === 'vi' ? 'Bạn chưa có đơn hàng.' : 'У вас пока нет заказов.'
    return ctx.callbackQuery
      ? ctx.editMessageText(text)
      : ctx.reply(text)
  }

  const buttons = orders.map(o => {
    const emoji = STATUS_EMOJI[o.status] ?? '⚪'
    const name  = o.provider?.name?.ru ?? 'Order'
    const amount = formatCurrency(o.final_amount_vnd, true)
    return [Markup.button.callback(
      `${emoji} ${name} — ${amount}`,
      `order_detail:${o.id}`,
    )]
  })

  buttons.push([Markup.button.webApp('📋 Все заказы', `${MINI_APP_URL}/orders`)])

  const text = ctx.lang === 'en' ? '📋 Your recent orders:' : ctx.lang === 'vi' ? '📋 Đơn hàng gần đây:' : '📋 Ваши заказы:'

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, Markup.inlineKeyboard(buttons))
  } else {
    await ctx.reply(text, Markup.inlineKeyboard(buttons))
  }
}

function escapeMarkdown(text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1')
}
