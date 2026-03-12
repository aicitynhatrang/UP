-- ---------------------------------------------------------------------------------------------------------
-- 013  Monetization — subscription payments, discount codes, Telegram Stars invoices
-- ---------------------------------------------------------------------------------------------------------

-- ── Provider subscription columns -----------------------------------------------------------------------
ALTER TABLE providers ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS auto_renew              BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS parser_enabled          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS ai_bot_enabled          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS website_enabled         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS social_enabled          BOOLEAN NOT NULL DEFAULT false;

-- ── Subscription payments -------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  tier            TEXT NOT NULL,
  amount_usd      NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_id      TEXT,                          -- Stripe payment_intent id
  payment_method  TEXT NOT NULL DEFAULT 'stripe', -- 'stripe' | 'stars' | 'manual'
  stripe_session_id TEXT,
  period_start    TIMESTAMPTZ NOT NULL,
  period_end      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_provider ON subscription_payments(provider_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_created  ON subscription_payments(created_at);

-- ── Discount codes --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discount_codes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code              TEXT UNIQUE NOT NULL,
  discount_pct      NUMERIC(5,2),                 -- percentage discount (e.g. 10.00 = 10%)
  discount_fixed_vnd BIGINT,                      -- fixed VND discount
  max_uses          INTEGER,                       -- NULL = unlimited
  used_count        INTEGER NOT NULL DEFAULT 0,
  min_order_vnd     BIGINT NOT NULL DEFAULT 0,
  expires_at        TIMESTAMPTZ,
  provider_id       UUID REFERENCES providers(id) ON DELETE SET NULL,   -- restrict to provider
  vertical_slug     TEXT,                                                -- restrict to vertical
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code   ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active) WHERE is_active = true;

CREATE TRIGGER discount_codes_updated_at
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Discount code usage tracking ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discount_code_uses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_id     UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_discount_uses_code ON discount_code_uses(code_id);
CREATE INDEX IF NOT EXISTS idx_discount_uses_user ON discount_code_uses(user_id);

-- ── Telegram Stars invoices -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stars_invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product             TEXT NOT NULL,                 -- 'subscription_pro', 'boost_7d', etc.
  star_amount         INTEGER NOT NULL,
  description         TEXT,
  status              TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'cancelled'
  telegram_charge_id  TEXT,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stars_invoices_user   ON stars_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_stars_invoices_status ON stars_invoices(status);
