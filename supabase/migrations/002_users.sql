-- ─────────────────────────────────────────────────────────────────────────────
-- 002  Users, sessions, referrals, bans
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id       BIGINT UNIQUE NOT NULL,
  username          TEXT,
  first_name        TEXT NOT NULL,
  last_name         TEXT,
  -- Encrypted PII
  phone_encrypted   TEXT,
  email_encrypted   TEXT,
  -- Gamification
  level             user_level    NOT NULL DEFAULT 'novice',
  lifetime_points   INTEGER       NOT NULL DEFAULT 0,
  balance_points    INTEGER       NOT NULL DEFAULT 0,
  -- Referral
  referral_code     TEXT          UNIQUE NOT NULL,
  referred_by       UUID          REFERENCES users(id) ON DELETE SET NULL,
  -- Subscription
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  -- Flags
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_admin          BOOLEAN NOT NULL DEFAULT false,
  is_blogger        BOOLEAN NOT NULL DEFAULT false,
  -- Settings
  language          TEXT    NOT NULL DEFAULT 'ru',
  timezone          TEXT    NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  -- Telegram profile snapshot
  avatar_url        TEXT,
  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_telegram_id    ON users(telegram_id);
CREATE INDEX idx_users_referral_code  ON users(referral_code);
CREATE INDEX idx_users_referred_by    ON users(referred_by);
CREATE INDEX idx_users_level          ON users(level);

-- ── Sessions ──────────────────────────────────────────────────────────────────
CREATE TABLE user_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token   TEXT NOT NULL UNIQUE,
  fingerprint     TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id       ON user_sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at    ON user_sessions(expires_at);

-- ── Points log ────────────────────────────────────────────────────────────────
CREATE TABLE points_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      points_action NOT NULL,
  amount      INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_points_log_user_id    ON points_log(user_id);
CREATE INDEX idx_points_log_created_at ON points_log(created_at);

-- ── Referral payouts ──────────────────────────────────────────────────────────
CREATE TABLE referral_payouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID,  -- FK added in 006_orders
  referrer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level           SMALLINT NOT NULL CHECK (level IN (1,2,3)),
  amount_vnd      BIGINT NOT NULL,
  vertical_slug   TEXT NOT NULL,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_payouts_referrer ON referral_payouts(referrer_id);
CREATE INDEX idx_referral_payouts_order    ON referral_payouts(order_id);

-- ── Bans ──────────────────────────────────────────────────────────────────────
CREATE TABLE user_bans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  banned_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ,  -- NULL = permanent
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bans_user_id ON user_bans(user_id);

-- ── Honeypot hits ─────────────────────────────────────────────────────────────
CREATE TABLE honeypot_hits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address  TEXT NOT NULL,
  path        TEXT NOT NULL,
  headers     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Auto-update updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
