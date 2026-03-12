import { mainMenuKeyboard, openAppButton } from '../utils/keyboard.js'

const MINI_APP_URL = process.env.MINI_APP_URL ?? 'https://allcity.vn'

const WELCOME = {
  ru: `🏙 *Добро пожаловать в AllCity Nha Trang\\!*

Всё лучшее в Нячанге — рестораны, спа, туры, жильё — в одном месте\\.

✅ Кешбэк с каждого заказа
✅ Баллы за чекины и отзывы
✅ Реферальная программа
✅ Флеш\\-скидки каждый день

Используйте меню ниже или откройте Mini App 👇`,

  en: `🏙 *Welcome to AllCity Nha Trang\\!*

The best of Nha Trang — restaurants, spas, tours, stays — all in one place\\.

✅ Cashback on every order
✅ Points for check\\-ins and reviews
✅ Referral program
✅ Daily flash deals

Use the menu below or open the Mini App 👇`,

  vi: `🏙 *Chào mừng đến AllCity Nha Trang\\!*

Tất cả tinh hoa Nha Trang — nhà hàng, spa, tour, chỗ ở — trong một ứng dụng\\.

✅ Hoàn tiền cho mỗi đơn hàng
✅ Tích điểm khi check\\-in và đánh giá
✅ Chương trình giới thiệu
✅ Flash sale mỗi ngày

Dùng menu bên dưới hoặc mở Mini App 👇`,
}

export function registerStartHandler(bot) {
  bot.start(async (ctx) => {
    const lang = ctx.lang ?? 'ru'

    // Handle deep link referral: /start ref_XXXXXXXX
    const payload = ctx.startPayload
    if (payload?.startsWith('ref_') && ctx.dbUser) {
      const refCode = payload.slice(4)
      // Apply referral via backend (non-blocking)
      try {
        const { api } = await import('../utils/api.js')
        await api.post('/api/v1/auth/apply-referral', { referralCode: refCode })
      } catch { /* ignore — may already have referrer */ }
    }

    const text = WELCOME[lang] ?? WELCOME.ru
    const appLabel = lang === 'ru' ? '🏙 Открыть AllCity' : lang === 'vi' ? '🏙 Mở AllCity' : '🏙 Open AllCity'

    await ctx.replyWithMarkdownV2(text, {
      ...mainMenuKeyboard(lang),
    })

    await ctx.reply(appLabel, openAppButton(MINI_APP_URL, appLabel))
  })
}
