import { Markup } from 'telegraf'

/**
 * Reusable inline keyboards for the bot.
 */

export function mainMenuKeyboard(lang = 'ru') {
  const labels = {
    ru: { catalog: '🔍 Каталог', orders: '📋 Заказы', profile: '👤 Профиль', checkin: '📍 Чекин', invite: '🎁 Пригласить', deals: '🔥 Скидки', weather: '🌤 Погода', events: '🎪 События' },
    en: { catalog: '🔍 Catalog', orders: '📋 Orders', profile: '👤 Profile', checkin: '📍 Check-in', invite: '🎁 Invite', deals: '🔥 Deals', weather: '🌤 Weather', events: '🎪 Events' },
    vi: { catalog: '🔍 Danh mục', orders: '📋 Đơn hàng', profile: '👤 Hồ sơ', checkin: '📍 Check-in', invite: '🎁 Mời', deals: '🔥 Giảm giá', weather: '🌤 Thời tiết', events: '🎪 Sự kiện' },
  }
  const l = labels[lang] ?? labels.ru

  return Markup.keyboard([
    [l.catalog, l.orders, l.deals],
    [l.profile, l.checkin, l.invite],
    [l.events, l.weather],
  ]).resize()
}

export function openAppButton(url, text = '🏙 Открыть AllCity') {
  return Markup.inlineKeyboard([
    Markup.button.webApp(text, url),
  ])
}

export function providerActionsKeyboard(providerId, lang = 'ru') {
  const labels = {
    ru: { book: '📅 Забронировать', menu: '📋 Меню', reviews: '⭐ Отзывы', map: '🗺 На карте' },
    en: { book: '📅 Book', menu: '📋 Menu', reviews: '⭐ Reviews', map: '🗺 Map' },
    vi: { book: '📅 Đặt chỗ', menu: '📋 Thực đơn', reviews: '⭐ Nhận xét', map: '🗺 Bản đồ' },
  }
  const l = labels[lang] ?? labels.ru

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(l.book, `book:${providerId}`),
      Markup.button.callback(l.menu, `menu:${providerId}`),
    ],
    [
      Markup.button.callback(l.reviews, `reviews:${providerId}`),
      Markup.button.callback(l.map, `map:${providerId}`),
    ],
  ])
}

export function confirmKeyboard(actionId, lang = 'ru') {
  const labels = {
    ru: { yes: '✅ Да', no: '❌ Нет' },
    en: { yes: '✅ Yes', no: '❌ No' },
    vi: { yes: '✅ Có', no: '❌ Không' },
  }
  const l = labels[lang] ?? labels.ru

  return Markup.inlineKeyboard([
    Markup.button.callback(l.yes, `confirm:${actionId}`),
    Markup.button.callback(l.no, `cancel:${actionId}`),
  ])
}

export function paginationKeyboard(prefix, page, totalPages) {
  const buttons = []
  if (page > 1)          buttons.push(Markup.button.callback('◀️', `${prefix}:${page - 1}`))
  buttons.push(Markup.button.callback(`${page}/${totalPages}`, 'noop'))
  if (page < totalPages) buttons.push(Markup.button.callback('▶️', `${prefix}:${page + 1}`))
  return Markup.inlineKeyboard(buttons)
}
