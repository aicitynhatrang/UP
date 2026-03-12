import { createClient } from '@supabase/supabase-js'

function requireEnv(key) {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env: ${key}`)
  return val
}

// Anon client — respects RLS, used for user-scoped queries
export const supabase = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_KEY'),
  {
    auth: { persistSession: false },
    db:   { schema: 'public' },
  }
)

// Service role client — bypasses RLS, used for admin/cron/migrations only
export const supabaseAdmin = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  {
    auth: { persistSession: false },
    db:   { schema: 'public' },
  }
)

export const dbConfig = {
  url:             requireEnv('SUPABASE_URL'),
  key:             requireEnv('SUPABASE_KEY'),
  serviceRoleKey:  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
}
