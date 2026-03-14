import { USER_LEVELS } from '@allcity/shared/constants/statuses'
import { Markup } from 'telegraf'

const MINI_APP_URL = process.env.MINI_APP_URL ?? 'https://allcity.vn'

const LABELS = {
  ru: { profile: '👤 Профиль', level: 'Уровень', points: 'Баллы', balance: 'Баланс', lifetime: 'Всего', referral: 'Реф. код', invite: 'Ваша ссылка', open: '🏙 Открыть профиль' },
  en: { profile: '👤 Profile', level: 'Level', points: 'Points', balance: 'Balance', lifetime: 'Lifetime', referral: 'Ref code', invite: 'Your link', open: '🏙 Open Profile' },
  vi: { profile: '👤 Hồ sơ', level: 'Cấp độ', points: 'Điểm', balance: 'Số dư', lifetime: 'Tổng', referral: 'Mã GT', invite: 'Link của bạn', open: '🏙 Mở hồ sơ' },
}

export function registerProfileHandler(bot) {
  // Text match for keyboard button
  bot.hears([/👤\s*Профиль/i, /👤\s*Profile/i, /👤\s*Hồ sơ/i], handleProfile)
  bot.command('profile', handleProfile)
}

async function handleProfile(ctx) {
  const user = ctx.dbUser
  if (!user) return ctx.reply('Please /start first.')

  const lang = ctx.lang ?? 'ru'
  const l = LABELS[lang] ?? LABELS.ru

  const levelConfig = USER_LEVELS.find(lv => lv.slug === user.level) ?? USER_LEVELS[0]
  const nextLevel   = USER_LEVELS.find(lv => lv.minPoints > user.lifetime_points)

  const lines = [
    `${l.profile}`,
    ``,
    `${l.level}: ${levelConfig.emoji} ${levelConfig.name}`,
    `${l.balance}: ${user.balance_points.toLocaleString()}`,
    `${l.lifetime}: ${user.lifetime_points.toLocaleString()}`,
    nextLevel ? `➡️ ${nextLevel.name}: ${nextLevel.minPoints - user.lifetime_points} pts` : '🏆 Max level!',
    ``,
    `${l.referral}: \`${user.referral_code}\``,
    `${l.invite}: https://t.me/${ctx.botInfo.username}?start=ref_${user.referral_code}`,
  ]

  await ctx.replyWithMarkdownV2(escapeMarkdown(lines.join('\n')), {
    ...Markup.inlineKeyboard([
      Markup.button.webApp(l.open, `${MINI_APP_URL}/profile`),
    ]),
  })
}

function escapeMarkdown(text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1')
}
