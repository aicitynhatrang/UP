-- ─────────────────────────────────────────────────────────────────────────────
-- 008  Gamification: seasons, leaderboard, flash deals, mystery shoppers,
--       early bird, group buy, Club 77
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Seasons ───────────────────────────────────────────────────────────────────
CREATE TABLE seasons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT false,
  prize_pool_vnd  BIGINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE season_rankings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id   UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points      INTEGER NOT NULL DEFAULT 0,
  rank        INTEGER,
  prize_vnd   BIGINT NOT NULL DEFAULT 0,
  paid_at     TIMESTAMPTZ,
  UNIQUE(season_id, user_id)
);

CREATE INDEX idx_season_rankings_season ON season_rankings(season_id, points DESC);

-- ── Flash deals ───────────────────────────────────────────────────────────────
CREATE TABLE flash_deals (
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

CREATE INDEX idx_flash_deals_provider  ON flash_deals(provider_id);
CREATE INDEX idx_flash_deals_status    ON flash_deals(status, ends_at);

CREATE TABLE flash_deal_purchases (
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
CREATE TABLE mystery_shopper_tasks (
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

CREATE INDEX idx_mystery_tasks_provider   ON mystery_shopper_tasks(provider_id);
CREATE INDEX idx_mystery_tasks_status     ON mystery_shopper_tasks(status);
CREATE INDEX idx_mystery_tasks_assigned   ON mystery_shopper_tasks(assigned_to);

-- ── Group Buy ─────────────────────────────────────────────────────────────────
CREATE TABLE group_buys (
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

CREATE TABLE group_buy_participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_buy_id    UUID NOT NULL REFERENCES group_buys(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  price_paid_vnd  BIGINT,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_buy_id, user_id)
);

-- ── Club 77 ───────────────────────────────────────────────────────────────────
CREATE TABLE club_77_memberships (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  tier        TEXT NOT NULL,   -- 'RESIDENT' | 'INVESTOR' | 'ARCHITECT'
  slot_number INTEGER,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  metadata    JSONB NOT NULL DEFAULT '{}'
);

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
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

CREATE INDEX idx_notifications_user   ON notifications(user_id, is_read, created_at DESC);
