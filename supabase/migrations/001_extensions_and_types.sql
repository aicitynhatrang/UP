-- ─────────────────────────────────────────────────────────────────────────────
-- 001  Extensions & custom enum types
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "unaccent";     -- accent-insensitive search
CREATE EXTENSION IF NOT EXISTS "postgis";      -- geospatial (optional, for future)

-- ── User / auth ───────────────────────────────────────────────────────────────
CREATE TYPE user_level AS ENUM (
  'novice', 'explorer', 'local', 'expert',
  'ambassador', 'influencer', 'creator', 'architect'
);

CREATE TYPE subscription_tier AS ENUM (
  'free', 'business', 'professional', 'enterprise'
);

-- ── Provider ──────────────────────────────────────────────────────────────────
CREATE TYPE provider_status AS ENUM (
  'pending', 'active', 'suspended', 'banned'
);

CREATE TYPE moderation_status AS ENUM (
  'pending', 'approved', 'rejected', 'flagged'
);

-- ── Order lifecycle ───────────────────────────────────────────────────────────
CREATE TYPE order_status AS ENUM (
  'pending', 'accepted', 'in_progress',
  'completed', 'cancelled', 'disputed'
);

-- ── Parser ────────────────────────────────────────────────────────────────────
CREATE TYPE parser_post_type AS ENUM (
  'menu', 'price', 'hours', 'promo',
  'photo', 'news', 'description'
);

-- ── Commerce ──────────────────────────────────────────────────────────────────
CREATE TYPE transaction_type AS ENUM (
  'order_commission', 'referral_payout', 'cashback',
  'group_buy', 'co_invest', 'skill_swap',
  'subscription', 'withdrawal', 'refund', 'bonus'
);

CREATE TYPE points_action AS ENUM (
  'checkin', 'order_complete', 'review_left',
  'referral_l1', 'referral_l2', 'referral_l3',
  'streak_bonus', 'mystery_shopper', 'early_bird',
  'flash_deal', 'season_bonus', 'signup_bonus',
  'profile_complete', 'first_order', 'promo_post'
);

-- ── Group buy / co-invest ─────────────────────────────────────────────────────
CREATE TYPE group_buy_status AS ENUM (
  'open', 'funded', 'completed', 'cancelled'
);

CREATE TYPE co_invest_status AS ENUM (
  'open', 'funded', 'active', 'matured', 'cancelled'
);

-- ── Flash deals ───────────────────────────────────────────────────────────────
CREATE TYPE flash_deal_status AS ENUM (
  'scheduled', 'active', 'sold_out', 'expired', 'cancelled'
);
