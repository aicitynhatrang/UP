-- ─────────────────────────────────────────────────────────────────────────────
-- 007  Telegram Channel Parser
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Channel → Provider registry ───────────────────────────────────────────────
CREATE TABLE parser_channels (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  tg_channel_id   TEXT NOT NULL UNIQUE,   -- Telegram chat id (negative number as string)
  tg_channel_name TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_parsed_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, tg_channel_id)
);

CREATE INDEX idx_parser_channels_provider ON parser_channels(provider_id);
CREATE INDEX idx_parser_channels_tg_id    ON parser_channels(tg_channel_id);

-- ── Parsed posts archive ──────────────────────────────────────────────────────
CREATE TABLE parsed_posts (
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

CREATE INDEX idx_parsed_posts_provider    ON parsed_posts(provider_id);
CREATE INDEX idx_parsed_posts_channel     ON parsed_posts(channel_id);
CREATE INDEX idx_parsed_posts_hash        ON parsed_posts(hash);
CREATE INDEX idx_parsed_posts_type        ON parsed_posts(extracted_type);
CREATE INDEX idx_parsed_posts_created_at  ON parsed_posts(created_at);
CREATE INDEX idx_parsed_posts_ai          ON parsed_posts(ai_processed, created_at)
  WHERE ai_processed = false;

-- ── AI daily usage counter ────────────────────────────────────────────────────
-- Tracked in Redis; this table stores end-of-day snapshots for audit
CREATE TABLE parser_ai_usage_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (provider_id, date)
) WITHOUT OIDS;

-- Override PK definition
ALTER TABLE parser_ai_usage_log DROP CONSTRAINT IF EXISTS parser_ai_usage_log_pkey;
ALTER TABLE parser_ai_usage_log ADD PRIMARY KEY (provider_id, date);
