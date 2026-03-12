export function registerInviteHandler(bot) {
  bot.hears([/🎁\s*Пригласить/i, /🎁\s*Invite/i, /🎁\s*Mời/i], handleInvite)
  bot.command('invite', handleInvite)
}

async function handleInvite(ctx) {
  const user = ctx.dbUser
  if (!user) return ctx.reply('Please /start first.')

  const lang = ctx.lang ?? 'ru'
  const link = `https://t.me/${ctx.botInfo.username}?start=ref_${user.referral_code}`

  const texts = {
    ru: [
      `🎁 *Пригласите друзей в AllCity\\!*`,
      ``,
      `Ваш реферальный код: \`${user.referral_code}\``,
      ``,
      `Ваша ссылка:`,
      escapeMarkdown(link),
      ``,
      `За каждого приглашённого друга вы получите бонусные баллы и % от его заказов\\.`,
    ],
    en: [
      `🎁 *Invite friends to AllCity\\!*`,
      ``,
      `Your referral code: \`${user.referral_code}\``,
      ``,
      `Your link:`,
      escapeMarkdown(link),
      ``,
      `Earn bonus points and a % from every order your friends make\\.`,
    ],
    vi: [
      `🎁 *Mời bạn bè đến AllCity\\!*`,
      ``,
      `Mã giới thiệu: \`${user.referral_code}\``,
      ``,
      `Link của bạn:`,
      escapeMarkdown(link),
      ``,
      `Nhận điểm thưởng và % từ mỗi đơn hàng của bạn bè\\.`,
    ],
  }

  await ctx.replyWithMarkdownV2((texts[lang] ?? texts.ru).join('\n'))
}

function escapeMarkdown(text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1')
}
