-- ─────────────────────────────────────────────────────────────────────────────
-- 010  AI features and voice calls
-- ─────────────────────────────────────────────────────────────────────────────

-- ── AI recommendations log ────────────────────────────────────────────────────
CREATE TABLE ai_recommendations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query           TEXT,
  context         JSONB NOT NULL DEFAULT '{}',   -- mood, location, history
  recommendations JSONB NOT NULL DEFAULT '[]',   -- [{provider_id, score, reason}]
  model           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_recs_user    ON ai_recommendations(user_id, created_at DESC);

-- ── AI content moderation log ─────────────────────────────────────────────────
CREATE TABLE ai_moderation_log (
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
CREATE TABLE translation_cache (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_hash TEXT NOT NULL,          -- SHA-256 of (text + sourceLang)
  target_lang TEXT NOT NULL,
  translated  TEXT NOT NULL,
  model       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_hash, target_lang)
);

CREATE INDEX idx_translation_hash ON translation_cache(source_hash);

-- ── Voice calls ───────────────────────────────────────────────────────────────
CREATE TABLE voice_calls (
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

CREATE INDEX idx_voice_calls_user     ON voice_calls(user_id);
CREATE INDEX idx_voice_calls_provider ON voice_calls(provider_id);
CREATE INDEX idx_voice_calls_order    ON voice_calls(order_id);

-- ── AI chatbot sessions ───────────────────────────────────────────────────────
CREATE TABLE chat_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context     JSONB NOT NULL DEFAULT '{}',   -- conversation state
  messages    JSONB NOT NULL DEFAULT '[]',   -- [{role, content, at}]
  model       TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_msg_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, last_msg_at DESC);

-- ── Vision receipt validation log ─────────────────────────────────────────────
CREATE TABLE receipt_validations (
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

CREATE INDEX idx_receipts_user     ON receipt_validations(user_id);
CREATE INDEX idx_receipts_provider ON receipt_validations(provider_id);
CREATE UNIQUE INDEX idx_receipts_hash ON receipt_validations(image_hash);
