-- ─────────────────────────────────────────────────────────────────────────────
-- 004  Check-ins and reviews
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Check-ins ─────────────────────────────────────────────────────────────────
CREATE TABLE checkins (
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

CREATE INDEX idx_checkins_user_id      ON checkins(user_id);
CREATE INDEX idx_checkins_provider_id  ON checkins(provider_id);
CREATE INDEX idx_checkins_created_at   ON checkins(created_at);
CREATE INDEX idx_checkins_fraud        ON checkins(is_fraud) WHERE is_fraud = true;

-- One checkin per user per provider per day (enforced in app layer + this partial unique)
CREATE UNIQUE INDEX idx_checkins_daily_unique
  ON checkins(user_id, provider_id, DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh'))
  WHERE is_fraud = false;

-- ── Reviews ───────────────────────────────────────────────────────────────────
CREATE TABLE reviews (
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

CREATE INDEX idx_reviews_user_id     ON reviews(user_id);
CREATE INDEX idx_reviews_provider_id ON reviews(provider_id);
CREATE INDEX idx_reviews_rating      ON reviews(provider_id, rating) WHERE is_published = true;

-- One published review per user per provider (for non-order reviews)
CREATE UNIQUE INDEX idx_reviews_one_per_user
  ON reviews(user_id, provider_id)
  WHERE order_id IS NULL AND is_fraud = false;

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

CREATE TRIGGER reviews_update_rating
  AFTER INSERT OR UPDATE OF is_published, rating ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_provider_rating();

-- ── Streak tracking ───────────────────────────────────────────────────────────
CREATE TABLE user_streaks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  current_streak  INTEGER NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,
  last_checkin_at TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
