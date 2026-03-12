-- ─────────────────────────────────────────────────────────────────────────────
-- 009  Creator economy: co-invest, skill swap, creator marketplace,
--       blogger referrals
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Co-invest rounds ─────────────────────────────────────────────────────────
CREATE TABLE co_invest_rounds (
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

CREATE INDEX idx_co_invest_provider ON co_invest_rounds(provider_id);
CREATE INDEX idx_co_invest_status   ON co_invest_rounds(status);

CREATE TABLE co_invest_stakes (
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

CREATE TABLE co_invest_votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id    UUID NOT NULL REFERENCES co_invest_rounds(id) ON DELETE CASCADE,
  voter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote        TEXT NOT NULL CHECK (vote IN ('approve', 'reject')),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(round_id, voter_id)
);

-- ── Skill Swap ────────────────────────────────────────────────────────────────
CREATE TABLE skill_listings (
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

CREATE INDEX idx_skill_listings_user ON skill_listings(user_id);
CREATE INDEX idx_skill_listings_tags ON skill_listings USING gin(skill_tags);

CREATE TABLE skill_swap_deals (
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
CREATE TABLE creator_products (
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

CREATE INDEX idx_creator_products_creator ON creator_products(creator_id);

CREATE TABLE creator_product_purchases (
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
CREATE TABLE blogger_referral_links (
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

CREATE INDEX idx_blogger_links_blogger  ON blogger_referral_links(blogger_id);
CREATE INDEX idx_blogger_links_provider ON blogger_referral_links(provider_id);
CREATE INDEX idx_blogger_links_code     ON blogger_referral_links(code);

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
