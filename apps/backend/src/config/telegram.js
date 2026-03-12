function requireEnv(key) {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env: ${key}`)
  return val
}

export const telegramConfig = {
  botToken:           requireEnv('BOT_TOKEN'),
  adminTelegramId:    parseInt(requireEnv('ADMIN_TELEGRAM_ID'), 10),
  webhookSecret:      requireEnv('WEBHOOK_SECRET_TOKEN'),
  miniAppUrl:         process.env.MINI_APP_URL ?? 'https://allcity.vn',
  webhookPath:        '/webhook/telegram',
}
