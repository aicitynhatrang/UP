import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

/**
 * Telegraf middleware: resolve or create user from Telegram context.
 * Attaches ctx.dbUser with the DB user record.
 */
export function userMiddleware() {
  return async (ctx, next) => {
    const from = ctx.from
    if (!from) return next()

    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', from.id)
      .maybeSingle()

    if (existing) {
      ctx.dbUser = existing
    } else {
      // Auto-register on first interaction
      const referralCode = 'AC' + Math.random().toString(36).slice(2, 10).toUpperCase()
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          telegram_id:   from.id,
          username:      from.username ?? null,
          first_name:    from.first_name ?? 'User',
          last_name:     from.last_name ?? null,
          referral_code: referralCode,
          language:      from.language_code ?? 'ru',
        })
        .select()
        .single()

      ctx.dbUser = newUser
    }

    ctx.lang = ctx.dbUser?.language ?? 'ru'
    return next()
  }
}
