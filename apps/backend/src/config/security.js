function requireEnv(key) {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env: ${key}`)
  return val
}

export const securityConfig = {
  encryptionKey:       requireEnv('ENCRYPTION_KEY'),  // 32-byte hex for AES-256
  jwt: {
    secret:            requireEnv('JWT_SECRET'),
    refreshSecret:     requireEnv('JWT_REFRESH_SECRET'),
    accessExpiresIn:   '15m',
    refreshExpiresIn:  '7d',
  },
  session: {
    maxActiveSessions:    parseInt(process.env.MAX_ACTIVE_SESSIONS  ?? '3', 10),
    adminTimeoutHours:    parseInt(process.env.ADMIN_SESSION_TIMEOUT_HOURS ?? '2', 10),
  },
  honeypot: {
    alertChatId:  process.env.HONEYPOT_ALERT_CHAT_ID ?? '',
    // Endpoints that trigger instant IP ban + alert
    paths: ['/admin-panel', '/api/debug', '/api/v1/admin/raw', '/.env'],
  },
  cors: {
    // Allowed origins in production
    origins: [
      process.env.NEXT_PUBLIC_APP_URL ?? 'https://allcity.vn',
      process.env.MINI_APP_URL         ?? 'https://allcity.vn',
    ],
  },
}
