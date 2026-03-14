-- ─────────────────────────────────────────────────────────────────────────────
-- 001  Extensions & custom enum types (SAFE — idempotent)
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
-- CREATE EXTENSION IF NOT EXISTS "postgis";  -- skip if not available on Supabase free tier

-- Enum types — wrapped in DO blocks for idempotency
DO $$ BEGIN CREATE TYPE user_level AS ENUM ('novice','explorer','local','expert','ambassador','influencer','creator','architect'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE subscription_tier AS ENUM ('free','business','professional','enterprise'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE provider_status AS ENUM ('pending','active','suspended','banned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE moderation_status AS ENUM ('pending','approved','rejected','flagged'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('pending','accepted','in_progress','completed','cancelled','disputed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE parser_post_type AS ENUM ('menu','price','hours','promo','photo','news','description'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE transaction_type AS ENUM ('order_commission','referral_payout','cashback','group_buy','co_invest','skill_swap','subscription','withdrawal','refund','bonus'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE points_action AS ENUM ('checkin','order_complete','review_left','referral_l1','referral_l2','referral_l3','streak_bonus','mystery_shopper','early_bird','flash_deal','season_bonus','signup_bonus','profile_complete','first_order','promo_post'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE group_buy_status AS ENUM ('open','funded','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE co_invest_status AS ENUM ('open','funded','active','matured','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE flash_deal_status AS ENUM ('scheduled','active','sold_out','expired','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- 002  Users, sessions, referrals, bans
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
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

CREATE INDEX IF NOT EXISTS idx_users_telegram_id    ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code  ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by    ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_users_level          ON users(level);

-- ── Sessions ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
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

CREATE INDEX IF NOT EXISTS idx_sessions_user_id       ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at    ON user_sessions(expires_at);

-- ── Points log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS points_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      points_action NOT NULL,
  amount      INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_log_user_id    ON points_log(user_id);
CREATE INDEX IF NOT EXISTS idx_points_log_created_at ON points_log(created_at);

-- ── Referral payouts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_payouts (
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

CREATE INDEX IF NOT EXISTS idx_referral_payouts_referrer ON referral_payouts(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_payouts_order    ON referral_payouts(order_id);

-- ── Bans ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_bans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  banned_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ,  -- NULL = permanent
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bans_user_id ON user_bans(user_id);

-- ── Honeypot hits ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS honeypot_hits (
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

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- ─────────────────────────────────────────────────────────────────────────────
-- 003  Providers (businesses) and related tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS providers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  vertical_slug     TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,

  -- Localized name/description stored as JSONB keyed by ISO lang code
  name              JSONB NOT NULL DEFAULT '{}',  -- { ru: '...', en: '...', vi: '...' }
  description       JSONB NOT NULL DEFAULT '{}',
  short_description JSONB NOT NULL DEFAULT '{}',

  -- Contact
  phone_encrypted   TEXT,
  email_encrypted   TEXT,
  website           TEXT,
  telegram_channel  TEXT,

  -- Location
  address           TEXT,
  city              TEXT NOT NULL DEFAULT 'Nha Trang',
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,

  -- Media
  logo_url          TEXT,
  cover_url         TEXT,
  photos            TEXT[]  NOT NULL DEFAULT '{}',

  -- Business data (updated by parser or manually)
  working_hours     JSONB   NOT NULL DEFAULT '{}',
  pricing           JSONB   NOT NULL DEFAULT '{}',
  menu              JSONB   NOT NULL DEFAULT '{}',
  amenities         TEXT[]  NOT NULL DEFAULT '{}',
  tags              TEXT[]  NOT NULL DEFAULT '{}',

  -- Ratings
  rating            NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count      INTEGER      NOT NULL DEFAULT 0,
  checkin_count     INTEGER      NOT NULL DEFAULT 0,

  -- Moderation & status
  status            provider_status   NOT NULL DEFAULT 'pending',
  moderation_status moderation_status NOT NULL DEFAULT 'pending',
  moderation_note   TEXT,

  -- Subscription link
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',

  -- Flags
  is_verified       BOOLEAN NOT NULL DEFAULT false,
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  is_parser_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_owner         ON providers(owner_id);
CREATE INDEX IF NOT EXISTS idx_providers_vertical      ON providers(vertical_slug);
CREATE INDEX IF NOT EXISTS idx_providers_status        ON providers(status);
CREATE INDEX IF NOT EXISTS idx_providers_slug          ON providers(slug);
CREATE INDEX IF NOT EXISTS idx_providers_coords        ON providers(lat, lng) WHERE lat IS NOT NULL;
-- GIN index for JSON name search
CREATE INDEX IF NOT EXISTS idx_providers_name_gin      ON providers USING gin(name);
CREATE INDEX IF NOT EXISTS idx_providers_tags_gin      ON providers USING gin(tags);

DROP TRIGGER IF EXISTS providers_updated_at ON providers;
CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Provider media ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  tg_file_id  TEXT,
  source      TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'parser' | 'ai'
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_photos_provider ON provider_photos(provider_id);

-- ── Provider staff / team members ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_staff (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'staff',  -- 'owner' | 'manager' | 'staff'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, user_id)
);

-- ── Moderation log ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moderation_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type   TEXT NOT NULL,   -- 'provider' | 'review' | 'order'
  entity_id     UUID NOT NULL,
  action        TEXT NOT NULL,   -- 'approve' | 'reject' | 'flag' | 'unflag'
  moderator_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modlog_entity ON moderation_log(entity_type, entity_id);
-- ─────────────────────────────────────────────────────────────────────────────
-- 004  Check-ins and reviews
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Check-ins ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkins (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  distance_m      INTEGER NOT NULL,          -- computed at checkin time
  points_awarded  INTEGER NOT NULL DEFAULT 0,
  is_fraud        BOOLEAN NOT NULL DEFAULT false,
  fraud_reason    TEXT,
  -- Receipt fraud fields
  receipt_amount_vnd BIGINT,
  receipt_photo_url  TEXT,
  receipt_hash       TEXT,                  -- SHA-256 of receipt image
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_id      ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_provider_id  ON checkins(provider_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at   ON checkins(created_at);
CREATE INDEX IF NOT EXISTS idx_checkins_fraud        ON checkins(is_fraud) WHERE is_fraud = true;

-- One checkin per user per provider per day (enforced in app layer + this partial unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_daily_unique
  ON checkins(user_id, provider_id, DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh'))
  WHERE is_fraud = false;

-- ── Reviews ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  order_id        UUID,   -- FK added in 006_orders
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text            TEXT,
  photos          TEXT[] NOT NULL DEFAULT '{}',
  -- Mystery shopper
  is_mystery      BOOLEAN NOT NULL DEFAULT false,
  mystery_score   SMALLINT,
  -- Moderation
  moderation_status moderation_status NOT NULL DEFAULT 'pending',
  is_published    BOOLEAN NOT NULL DEFAULT false,
  -- Flags
  is_fraud        BOOLEAN NOT NULL DEFAULT false,
  fraud_reason    TEXT,
  points_awarded  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id     ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating      ON reviews(provider_id, rating) WHERE is_published = true;

-- One published review per user per provider (for non-order reviews)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_per_user
  ON reviews(user_id, provider_id)
  WHERE order_id IS NULL AND is_fraud = false;

DROP TRIGGER IF EXISTS reviews_updated_at ON reviews;
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Rating recalculation function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE providers SET
    rating       = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE provider_id = NEW.provider_id AND is_published = true),
    review_count = (SELECT COUNT(*) FROM reviews WHERE provider_id = NEW.provider_id AND is_published = true),
    updated_at   = NOW()
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_update_rating ON reviews;
CREATE TRIGGER reviews_update_rating
  AFTER INSERT OR UPDATE OF is_published, rating ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_provider_rating();

-- ── Streak tracking ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_streaks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  current_streak  INTEGER NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,
  last_checkin_at TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ─────────────────────────────────────────────────────────────────────────────
-- 005  Catalog: verticals, services, favorites, search
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Vertical metadata (mirrors JS constants, for DB joins) ────────────────────
CREATE TABLE IF NOT EXISTS verticals (
  slug              TEXT PRIMARY KEY,
  emoji             TEXT NOT NULL,
  name              JSONB NOT NULL DEFAULT '{}',  -- { ru, en, vi, ... }
  commission_pct    NUMERIC(4,2) NOT NULL,
  user_discount_pct NUMERIC(4,2) NOT NULL DEFAULT 0,
  avg_check_vnd     BIGINT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true
);

-- ── Provider services / menu items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_services (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name        JSONB NOT NULL DEFAULT '{}',
  description JSONB NOT NULL DEFAULT '{}',
  price_vnd   BIGINT,
  price_max_vnd BIGINT,
  duration_min  INTEGER,              -- for appointments
  photos      TEXT[] NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_provider ON provider_services(provider_id);

DROP TRIGGER IF EXISTS provider_services_updated_at ON provider_services;
CREATE TRIGGER provider_services_updated_at
  BEFORE UPDATE ON provider_services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── User favorites ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

-- ── Search index helper view ──────────────────────────────────────────────────
-- Full-text search vector updated via trigger
ALTER TABLE providers ADD COLUMN IF NOT EXISTS fts tsvector;

CREATE OR REPLACE FUNCTION providers_fts_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.fts := to_tsvector('simple',
    unaccent(COALESCE(NEW.name->>'ru', ''))    || ' ' ||
    unaccent(COALESCE(NEW.name->>'en', ''))    || ' ' ||
    unaccent(COALESCE(NEW.name->>'vi', ''))    || ' ' ||
    unaccent(COALESCE(NEW.address, ''))        || ' ' ||
    unaccent(array_to_string(NEW.tags, ' '))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS providers_fts_trigger ON providers;
CREATE TRIGGER providers_fts_trigger
  BEFORE INSERT OR UPDATE OF name, address, tags ON providers
  FOR EACH ROW EXECUTE FUNCTION providers_fts_update();

CREATE INDEX IF NOT EXISTS idx_providers_fts ON providers USING GIN(fts);

-- ── Tags autocomplete ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  slug       TEXT PRIMARY KEY,
  name       JSONB NOT NULL DEFAULT '{}',
  use_count  INTEGER NOT NULL DEFAULT 0
);
-- ─────────────────────────────────────────────────────────────────────────────
-- 006  Orders, commissions, transactions
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Orders ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider_id         UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  service_id          UUID REFERENCES provider_services(id) ON DELETE SET NULL,
  vertical_slug       TEXT NOT NULL,

  -- Amounts
  amount_vnd          BIGINT NOT NULL,
  discount_vnd        BIGINT NOT NULL DEFAULT 0,
  final_amount_vnd    BIGINT NOT NULL,
  commission_vnd      BIGINT,

  -- Status
  status              order_status NOT NULL DEFAULT 'pending',
  status_history      JSONB NOT NULL DEFAULT '[]',  -- [{status, at, by}]

  -- Details
  notes               TEXT,
  scheduled_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancel_reason       TEXT,

  -- Commission tracking
  commission_processed BOOLEAN NOT NULL DEFAULT false,
  points_awarded       INTEGER NOT NULL DEFAULT 0,

  -- Chat
  chat_thread_id      TEXT,    -- Supabase Realtime channel id

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id     ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_provider_id ON orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at  ON orders(created_at);

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add FK from reviews and referral_payouts
DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT fk_reviews_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE referral_payouts ADD CONSTRAINT fk_payouts_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Order messages (Realtime chat) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT,
  media_url   TEXT,
  type        TEXT NOT NULL DEFAULT 'text',   -- 'text' | 'image' | 'voice' | 'system'
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_order   ON order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender  ON order_messages(sender_id);

-- ── Financial transactions ledger ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  provider_id     UUID REFERENCES providers(id) ON DELETE SET NULL,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  type            transaction_type NOT NULL,
  amount_vnd      BIGINT NOT NULL,
  description     TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  -- Platform split
  platform_vnd        BIGINT,
  business_ref_vnd    BIGINT,
  user_ref_vnd        BIGINT,
  gamification_vnd    BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user     ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order    ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type     ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created  ON transactions(created_at);

-- ── Withdrawal requests ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount_vnd      BIGINT NOT NULL,
  method          TEXT NOT NULL,   -- 'bank_transfer' | 'momo' | 'zalopay' | 'crypto'
  account_details JSONB NOT NULL DEFAULT '{}',  -- encrypted externally
  status          TEXT NOT NULL DEFAULT 'pending',
  processed_at    TIMESTAMPTZ,
  processed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ─────────────────────────────────────────────────────────────────────────────
-- 007  Telegram Channel Parser
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Channel → Provider registry ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parser_channels (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  tg_channel_id   TEXT NOT NULL UNIQUE,   -- Telegram chat id (negative number as string)
  tg_channel_name TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_parsed_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, tg_channel_id)
);

CREATE INDEX IF NOT EXISTS idx_parser_channels_provider ON parser_channels(provider_id);
CREATE INDEX IF NOT EXISTS idx_parser_channels_tg_id    ON parser_channels(tg_channel_id);

-- ── Parsed posts archive ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parsed_posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  channel_id      TEXT NOT NULL,
  message_id      BIGINT NOT NULL,
  -- Extracted content
  extracted_type  parser_post_type NOT NULL,
  raw_text        TEXT NOT NULL DEFAULT '',
  extracted_data  JSONB NOT NULL DEFAULT '{}',   -- typed payload (hours / menu / pricing / etc)
  hashtags        TEXT[] NOT NULL DEFAULT '{}',
  photos          TEXT[] NOT NULL DEFAULT '{}',  -- Telegram file_ids
  contact_phone   TEXT,
  -- Deduplication
  hash            TEXT NOT NULL UNIQUE,          -- SHA-256 of (channelId + messageId + text + date)
  -- AI enrichment
  ai_processed    BOOLEAN NOT NULL DEFAULT false,
  ai_processed_at TIMESTAMPTZ,
  ai_model        TEXT,
  -- Moderation
  moderation_status moderation_status NOT NULL DEFAULT 'pending',
  applied_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parsed_posts_provider    ON parsed_posts(provider_id);
CREATE INDEX IF NOT EXISTS idx_parsed_posts_channel     ON parsed_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_parsed_posts_hash        ON parsed_posts(hash);
CREATE INDEX IF NOT EXISTS idx_parsed_posts_type        ON parsed_posts(extracted_type);
CREATE INDEX IF NOT EXISTS idx_parsed_posts_created_at  ON parsed_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_parsed_posts_ai          ON parsed_posts(ai_processed, created_at)
  WHERE ai_processed = false;

-- ── AI daily usage counter ────────────────────────────────────────────────────
-- Tracked in Redis; this table stores end-of-day snapshots for audit
CREATE TABLE IF NOT EXISTS parser_ai_usage_log (
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (provider_id, date)
);
-- ─────────────────────────────────────────────────────────────────────────────
-- 008  Gamification: seasons, leaderboard, flash deals, mystery shoppers,
--       early bird, group buy, Club 77
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Seasons ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seasons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT false,
  prize_pool_vnd  BIGINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS season_rankings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id   UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points      INTEGER NOT NULL DEFAULT 0,
  rank        INTEGER,
  prize_vnd   BIGINT NOT NULL DEFAULT 0,
  paid_at     TIMESTAMPTZ,
  UNIQUE(season_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_season_rankings_season ON season_rankings(season_id, points DESC);

-- ── Flash deals ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flash_deals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_id      UUID REFERENCES provider_services(id) ON DELETE SET NULL,
  title           JSONB NOT NULL DEFAULT '{}',
  description     JSONB NOT NULL DEFAULT '{}',
  original_price_vnd BIGINT NOT NULL,
  deal_price_vnd     BIGINT NOT NULL,
  discount_pct       NUMERIC(5,2) NOT NULL,
  total_slots        INTEGER NOT NULL,
  remaining_slots    INTEGER NOT NULL,
  starts_at          TIMESTAMPTZ NOT NULL,
  ends_at            TIMESTAMPTZ NOT NULL,
  status             flash_deal_status NOT NULL DEFAULT 'scheduled',
  early_bird_slots   INTEGER NOT NULL DEFAULT 0,
  early_bird_pct     NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flash_deals_provider  ON flash_deals(provider_id);
CREATE INDEX IF NOT EXISTS idx_flash_deals_status    ON flash_deals(status, ends_at);

CREATE TABLE IF NOT EXISTS flash_deal_purchases (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id         UUID NOT NULL REFERENCES flash_deals(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  is_early_bird   BOOLEAN NOT NULL DEFAULT false,
  price_paid_vnd  BIGINT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(deal_id, user_id)
);

-- ── Mystery Shopper ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mystery_shopper_tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  checklist       JSONB NOT NULL DEFAULT '[]',  -- [{item, required}]
  reward_points   INTEGER NOT NULL,
  reward_vnd      BIGINT NOT NULL DEFAULT 0,
  deadline        TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open',  -- 'open'|'assigned'|'submitted'|'approved'|'rejected'
  submission      JSONB,   -- {scores, photos, notes}
  submitted_at    TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mystery_tasks_provider   ON mystery_shopper_tasks(provider_id);
CREATE INDEX IF NOT EXISTS idx_mystery_tasks_status     ON mystery_shopper_tasks(status);
CREATE INDEX IF NOT EXISTS idx_mystery_tasks_assigned   ON mystery_shopper_tasks(assigned_to);

-- ── Group Buy ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_buys (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id         UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_id          UUID REFERENCES provider_services(id) ON DELETE SET NULL,
  title               JSONB NOT NULL DEFAULT '{}',
  base_price_vnd      BIGINT NOT NULL,
  tiers               JSONB NOT NULL DEFAULT '[]',  -- [{minParticipants, discountPct}]
  current_participants INTEGER NOT NULL DEFAULT 0,
  max_participants     INTEGER NOT NULL,
  deadline            TIMESTAMPTZ NOT NULL,
  status              group_buy_status NOT NULL DEFAULT 'open',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_buy_participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_buy_id    UUID NOT NULL REFERENCES group_buys(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  price_paid_vnd  BIGINT,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_buy_id, user_id)
);

-- ── Club 77 ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS club_77_memberships (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  tier        TEXT NOT NULL,   -- 'RESIDENT' | 'INVESTOR' | 'ARCHITECT'
  slot_number INTEGER,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  metadata    JSONB NOT NULL DEFAULT '{}'
);

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB NOT NULL DEFAULT '{}',
  is_read     BOOLEAN NOT NULL DEFAULT false,
  sent_via    TEXT[],   -- ['telegram', 'push']
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id, is_read, created_at DESC);
-- ─────────────────────────────────────────────────────────────────────────────
-- 009  Creator economy: co-invest, skill swap, creator marketplace,
--       blogger referrals
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Co-invest rounds ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS co_invest_rounds (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id         UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  creator_id          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title               JSONB NOT NULL DEFAULT '{}',
  description         JSONB NOT NULL DEFAULT '{}',
  target_amount_vnd   BIGINT NOT NULL,
  raised_amount_vnd   BIGINT NOT NULL DEFAULT 0,
  min_investment_vnd  BIGINT NOT NULL,
  max_investment_vnd  BIGINT,
  expected_roi_pct    NUMERIC(5,2) NOT NULL,
  lockup_months       INTEGER NOT NULL DEFAULT 3,
  status              co_invest_status NOT NULL DEFAULT 'open',
  deadline            TIMESTAMPTZ NOT NULL,
  funded_at           TIMESTAMPTZ,
  matured_at          TIMESTAMPTZ,
  platform_fee_pct    NUMERIC(4,2) NOT NULL DEFAULT 8,
  insurance_fund_pct  NUMERIC(4,2) NOT NULL DEFAULT 2,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_invest_provider ON co_invest_rounds(provider_id);
CREATE INDEX IF NOT EXISTS idx_co_invest_status   ON co_invest_rounds(status);

CREATE TABLE IF NOT EXISTS co_invest_stakes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id        UUID NOT NULL REFERENCES co_invest_rounds(id) ON DELETE RESTRICT,
  investor_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount_vnd      BIGINT NOT NULL,
  stake_pct       NUMERIC(8,4),   -- calculated at funding time
  payout_vnd      BIGINT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(round_id, investor_id)
);

CREATE TABLE IF NOT EXISTS co_invest_votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id    UUID NOT NULL REFERENCES co_invest_rounds(id) ON DELETE CASCADE,
  voter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote        TEXT NOT NULL CHECK (vote IN ('approve', 'reject')),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(round_id, voter_id)
);

-- ── Skill Swap ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skill_listings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           JSONB NOT NULL DEFAULT '{}',
  description     JSONB NOT NULL DEFAULT '{}',
  offer_type      TEXT NOT NULL,   -- 'offer' | 'request'
  skill_tags      TEXT[] NOT NULL DEFAULT '{}',
  price_vnd       BIGINT,   -- NULL = pure swap, no cash
  swap_for        JSONB NOT NULL DEFAULT '{}',  -- { description, skills }
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_listings_user ON skill_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_listings_tags ON skill_listings USING gin(skill_tags);

CREATE TABLE IF NOT EXISTS skill_swap_deals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_a_id    UUID NOT NULL REFERENCES skill_listings(id) ON DELETE RESTRICT,
  listing_b_id    UUID NOT NULL REFERENCES skill_listings(id) ON DELETE RESTRICT,
  user_a_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  user_b_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  cash_vnd        BIGINT NOT NULL DEFAULT 0,
  fee_vnd         BIGINT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'proposed',
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Creator Marketplace ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           JSONB NOT NULL DEFAULT '{}',
  description     JSONB NOT NULL DEFAULT '{}',
  type            TEXT NOT NULL,   -- 'course' | 'template' | 'guide' | 'consultation'
  price_vnd       BIGINT NOT NULL,
  download_url    TEXT,
  preview_url     TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  sales_count     INTEGER NOT NULL DEFAULT 0,
  rating          NUMERIC(3,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  moderation_status moderation_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_products_creator ON creator_products(creator_id);

CREATE TABLE IF NOT EXISTS creator_product_purchases (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES creator_products(id) ON DELETE RESTRICT,
  buyer_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  price_paid_vnd BIGINT NOT NULL,
  platform_fee_vnd BIGINT NOT NULL,
  creator_payout_vnd BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, buyer_id)
);

-- ── Blogger referral links ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blogger_referral_links (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blogger_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  code            TEXT NOT NULL UNIQUE,
  click_count     INTEGER NOT NULL DEFAULT 0,
  conversion_count INTEGER NOT NULL DEFAULT 0,
  total_earned_vnd BIGINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blogger_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_blogger_links_blogger  ON blogger_referral_links(blogger_id);
CREATE INDEX IF NOT EXISTS idx_blogger_links_provider ON blogger_referral_links(provider_id);
CREATE INDEX IF NOT EXISTS idx_blogger_links_code     ON blogger_referral_links(code);

-- ── User referrals (3-level chain) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activated       BOOLEAN NOT NULL DEFAULT false,
  activated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- ── Business referrals (blogger brought a business) ─────────────────────────
CREATE TABLE IF NOT EXISTS business_referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_biz_refs_referrer ON business_referrals(referrer_id);

-- ── Creator payouts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_payouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount_vnd      BIGINT NOT NULL,
  method          TEXT NOT NULL CHECK (method IN ('bank', 'crypto', 'wallet')),
  details         JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  tx_reference    TEXT,
  reject_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator ON creator_payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_status  ON creator_payouts(status);

-- ── Creator earnings (monthly aggregation by cron job) ──────────────────────
CREATE TABLE IF NOT EXISTS creator_earnings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start          DATE NOT NULL,
  period_end            DATE NOT NULL,
  business_earned_vnd   BIGINT NOT NULL DEFAULT 0,
  user_earned_vnd       BIGINT NOT NULL DEFAULT 0,
  marketplace_earned_vnd BIGINT NOT NULL DEFAULT 0,
  total_vnd             BIGINT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(creator_id, period_start)
);

-- ── Creator NFTs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_nfts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  address     TEXT,
  network     TEXT NOT NULL DEFAULT 'testnet',
  metadata    JSONB NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'minted', 'failed')),
  minted_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ─────────────────────────────────────────────────────────────────────────────
-- 010  AI features and voice calls
-- ─────────────────────────────────────────────────────────────────────────────

-- ── AI recommendations log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query           TEXT,
  context         JSONB NOT NULL DEFAULT '{}',   -- mood, location, history
  recommendations JSONB NOT NULL DEFAULT '[]',   -- [{provider_id, score, reason}]
  model           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_recs_user    ON ai_recommendations(user_id, created_at DESC);

-- ── AI content moderation log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_moderation_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  content         TEXT,
  result          JSONB NOT NULL DEFAULT '{}',  -- { safe, categories, score }
  model           TEXT NOT NULL,
  overridden_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  overridden_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Translation cache ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS translation_cache (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_hash TEXT NOT NULL,          -- SHA-256 of (text + sourceLang)
  target_lang TEXT NOT NULL,
  translated  TEXT NOT NULL,
  model       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_hash, target_lang)
);

CREATE INDEX IF NOT EXISTS idx_translation_hash ON translation_cache(source_hash);

-- ── Voice calls ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_calls (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id     UUID REFERENCES providers(id) ON DELETE SET NULL,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  twilio_call_sid TEXT UNIQUE,
  direction       TEXT NOT NULL DEFAULT 'outbound',  -- 'outbound' | 'inbound'
  status          TEXT NOT NULL DEFAULT 'initiated',
  duration_sec    INTEGER,
  recording_url   TEXT,
  transcript      TEXT,
  sentiment       JSONB,   -- { score, label }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_voice_calls_user     ON voice_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_provider ON voice_calls(provider_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_order    ON voice_calls(order_id);

-- ── AI chatbot sessions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context     JSONB NOT NULL DEFAULT '{}',   -- conversation state
  messages    JSONB NOT NULL DEFAULT '[]',   -- [{role, content, at}]
  model       TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_msg_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, last_msg_at DESC);

-- ── Vision receipt validation log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipt_validations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checkin_id      UUID REFERENCES checkins(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  image_url       TEXT NOT NULL,
  image_hash      TEXT NOT NULL,
  vision_result   JSONB NOT NULL DEFAULT '{}',
  amount_detected BIGINT,
  is_valid        BOOLEAN NOT NULL DEFAULT false,
  fraud_signals   JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_user     ON receipt_validations(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_provider ON receipt_validations(provider_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_hash ON receipt_validations(image_hash);
-- ─────────────────────────────────────────────────────────────────────────────
-- 011  External integrations: weather cache, events, NFT badges,
--       push subscriptions, webhooks
-- ─────────────────────────────────────────────────────────────────────────────

-- ── City events / calendar ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS city_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id     UUID REFERENCES providers(id) ON DELETE SET NULL,
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           JSONB NOT NULL DEFAULT '{}',
  description     JSONB NOT NULL DEFAULT '{}',
  category        TEXT NOT NULL DEFAULT 'other',
  location_name   TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  is_free         BOOLEAN NOT NULL DEFAULT true,
  price_vnd       BIGINT,
  max_attendees   INTEGER,
  attendee_count  INTEGER NOT NULL DEFAULT 0,
  cover_url       TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  external_url    TEXT,
  google_event_id TEXT,
  status          TEXT NOT NULL DEFAULT 'published',
  moderation_status moderation_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_starts_at   ON city_events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_provider    ON city_events(provider_id);
CREATE INDEX IF NOT EXISTS idx_events_status      ON city_events(status, starts_at);

CREATE TABLE IF NOT EXISTS event_attendees (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES city_events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rsvp_status TEXT NOT NULL DEFAULT 'going',   -- 'going' | 'maybe' | 'not_going'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ── NFT / SBT badges ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nft_badges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type      TEXT NOT NULL,   -- 'level_up' | 'season_winner' | 'milestone' | 'special'
  metadata        JSONB NOT NULL DEFAULT '{}',  -- name, image, attributes
  ton_address     TEXT,
  ton_tx_hash     TEXT,
  nft_address     TEXT UNIQUE,
  minted_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nft_badges_user ON nft_badges(user_id);

-- ── Push notification subscriptions (Web Push) ────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  device_info JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- ── Webhook log (outbound) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  target_url      TEXT NOT NULL,
  response_status INTEGER,
  response_body   TEXT,
  attempt_count   INTEGER NOT NULL DEFAULT 1,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_event     ON webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_created   ON webhook_deliveries(created_at);

-- ── Zalo / Instagram sync log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_sync_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,   -- 'zalo' | 'instagram'
  action          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  payload         JSONB NOT NULL DEFAULT '{}',
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── API key management (for SaaS white-label) ────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id     UUID REFERENCES providers(id) ON DELETE CASCADE,
  key_hash        TEXT NOT NULL UNIQUE,   -- SHA-256 of actual key
  name            TEXT NOT NULL,
  scopes          TEXT[] NOT NULL DEFAULT '{}',
  rate_limit_rpm  INTEGER NOT NULL DEFAULT 60,
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
-- ─────────────────────────────────────────────────────────────────────────────
-- 012  Row-Level Security policies + seed data
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════════════
-- Helper: current user's telegram_id from JWT
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auth_user_id() RETURNS UUID AS $$
  SELECT id FROM users WHERE telegram_id = (current_setting('request.jwt.claims', true)::jsonb->>'telegram_id')::BIGINT LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_is_admin() RETURNS BOOLEAN AS $$
  SELECT is_admin FROM users WHERE id = auth_user_id() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS: users
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users: read own row" ON users;
CREATE POLICY "users: read own row" ON users FOR SELECT USING (id = auth_user_id() OR auth_is_admin());
DROP POLICY IF EXISTS "users: update own row" ON users;
CREATE POLICY "users: update own row" ON users FOR UPDATE USING (id = auth_user_id()) WITH CHECK (id = auth_user_id());

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS: providers
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "providers: public read active" ON providers;
CREATE POLICY "providers: public read active" ON providers FOR SELECT USING (status = 'active' OR owner_id = auth_user_id() OR auth_is_admin());
DROP POLICY IF EXISTS "providers: owner update" ON providers;
CREATE POLICY "providers: owner update" ON providers FOR UPDATE USING (owner_id = auth_user_id() OR auth_is_admin());
DROP POLICY IF EXISTS "providers: owner insert" ON providers;
CREATE POLICY "providers: owner insert" ON providers FOR INSERT WITH CHECK (owner_id = auth_user_id());

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS: orders
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders: user or provider sees own" ON orders;
CREATE POLICY "orders: user or provider sees own" ON orders FOR SELECT USING (user_id = auth_user_id() OR provider_id IN (SELECT id FROM providers WHERE owner_id = auth_user_id()) OR auth_is_admin());
DROP POLICY IF EXISTS "orders: user insert" ON orders;
CREATE POLICY "orders: user insert" ON orders FOR INSERT WITH CHECK (user_id = auth_user_id());
DROP POLICY IF EXISTS "orders: user or provider update" ON orders;
CREATE POLICY "orders: user or provider update" ON orders FOR UPDATE USING (user_id = auth_user_id() OR provider_id IN (SELECT id FROM providers WHERE owner_id = auth_user_id()) OR auth_is_admin());

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS: reviews
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews: public read published" ON reviews;
CREATE POLICY "reviews: public read published" ON reviews FOR SELECT USING (is_published = true OR user_id = auth_user_id() OR auth_is_admin());
DROP POLICY IF EXISTS "reviews: user insert own" ON reviews;
CREATE POLICY "reviews: user insert own" ON reviews FOR INSERT WITH CHECK (user_id = auth_user_id());

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS: parsed_posts
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE parsed_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parsed_posts: provider owner read" ON parsed_posts;
CREATE POLICY "parsed_posts: provider owner read" ON parsed_posts FOR SELECT USING (provider_id IN (SELECT id FROM providers WHERE owner_id = auth_user_id()) OR auth_is_admin());

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS: points_log, transactions — read own only
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "points_log: read own" ON points_log;
CREATE POLICY "points_log: read own" ON points_log FOR SELECT USING (user_id = auth_user_id() OR auth_is_admin());

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transactions: read own" ON transactions;
CREATE POLICY "transactions: read own" ON transactions FOR SELECT USING (user_id = auth_user_id() OR provider_id IN (SELECT id FROM providers WHERE owner_id = auth_user_id()) OR auth_is_admin());

-- ══════════════════════════════════════════════════════════════════════════════
-- Seed: verticals
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO verticals (slug, emoji, name, commission_pct, user_discount_pct, avg_check_vnd, sort_order) VALUES
  ('restaurants',       '🍜', '{"ru":"Рестораны","en":"Restaurants","vi":"Nhà hàng"}',       5, 3, 300000, 1),
  ('cafes',             '☕', '{"ru":"Кофейни","en":"Cafes","vi":"Quán cà phê"}',            6, 3, 80000,  2),
  ('bars',              '🍸', '{"ru":"Бары","en":"Bars","vi":"Quán bar"}',                   5, 3, 200000, 3),
  ('street-food',       '🌮', '{"ru":"Стрит фуд","en":"Street Food","vi":"Ẩm thực đường phố"}',7, 4, 50000, 4),
  ('hotels',            '🏨', '{"ru":"Отели","en":"Hotels","vi":"Khách sạn"}',               3, 2, 1500000,5),
  ('hostels',           '🛏️', '{"ru":"Хостелы","en":"Hostels","vi":"Nhà nghỉ"}',             5, 3, 200000, 6),
  ('villas',            '🏡', '{"ru":"Виллы","en":"Villas","vi":"Biệt thự"}',                3, 2, 3000000,7),
  ('beauty',            '💅', '{"ru":"Красота","en":"Beauty","vi":"Làm đẹp"}',               7, 5, 200000, 8),
  ('spa',               '🧖', '{"ru":"Спа","en":"Spa","vi":"Spa"}',                          5, 3, 500000, 9),
  ('fitness',           '💪', '{"ru":"Фитнес","en":"Fitness","vi":"Thể dục"}',               6, 4, 300000, 10),
  ('tours',             '🏍️', '{"ru":"Туры","en":"Tours","vi":"Du lịch"}',                   5, 3, 800000, 11),
  ('water-sports',      '🏄', '{"ru":"Водный спорт","en":"Water Sports","vi":"Thể thao nước"}',5, 3, 400000,12),
  ('diving',            '🤿', '{"ru":"Дайвинг","en":"Diving","vi":"Lặn"}',                   4, 2, 1200000,13),
  ('transport',         '🚕', '{"ru":"Транспорт","en":"Transport","vi":"Vận chuyển"}',        7, 4, 100000, 14),
  ('medical',           '🏥', '{"ru":"Медицина","en":"Medical","vi":"Y tế"}',                 3, 2, 500000, 15),
  ('education',         '📚', '{"ru":"Образование","en":"Education","vi":"Giáo dục"}',        6, 4, 400000, 16),
  ('real-estate',       '🏠', '{"ru":"Недвижимость","en":"Real Estate","vi":"Bất động sản"}', 2, 1, 10000000,17),
  ('shopping',          '🛍️', '{"ru":"Шопинг","en":"Shopping","vi":"Mua sắm"}',              5, 3, 300000, 18),
  ('entertainment',     '🎭', '{"ru":"Развлечения","en":"Entertainment","vi":"Giải trí"}',    6, 4, 200000, 19),
  ('kids',              '👶', '{"ru":"Детям","en":"Kids","vi":"Trẻ em"}',                     6, 5, 150000, 20),
  ('pets',              '🐾', '{"ru":"Питомцы","en":"Pets","vi":"Thú cưng"}',                 7, 5, 200000, 21),
  ('freelance',         '💻', '{"ru":"Фриланс","en":"Freelance","vi":"Tự do"}',              7, 5, 500000, 22)
ON CONFLICT (slug) DO NOTHING;
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

DROP TRIGGER IF EXISTS discount_codes_updated_at ON discount_codes;
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
