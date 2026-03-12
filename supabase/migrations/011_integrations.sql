-- ─────────────────────────────────────────────────────────────────────────────
-- 011  External integrations: weather cache, events, NFT badges,
--       push subscriptions, webhooks
-- ─────────────────────────────────────────────────────────────────────────────

-- ── City events / calendar ────────────────────────────────────────────────────
CREATE TABLE city_events (
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

CREATE INDEX idx_events_starts_at   ON city_events(starts_at);
CREATE INDEX idx_events_provider    ON city_events(provider_id);
CREATE INDEX idx_events_status      ON city_events(status, starts_at);

CREATE TABLE event_attendees (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES city_events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rsvp_status TEXT NOT NULL DEFAULT 'going',   -- 'going' | 'maybe' | 'not_going'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ── NFT / SBT badges ─────────────────────────────────────────────────────────
CREATE TABLE nft_badges (
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

CREATE INDEX idx_nft_badges_user ON nft_badges(user_id);

-- ── Push notification subscriptions (Web Push) ────────────────────────────────
CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  device_info JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);

-- ── Webhook log (outbound) ────────────────────────────────────────────────────
CREATE TABLE webhook_deliveries (
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

CREATE INDEX idx_webhooks_event     ON webhook_deliveries(event_type);
CREATE INDEX idx_webhooks_created   ON webhook_deliveries(created_at);

-- ── Zalo / Instagram sync log ─────────────────────────────────────────────────
CREATE TABLE social_sync_log (
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
CREATE TABLE api_keys (
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

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
