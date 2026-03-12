-- ─────────────────────────────────────────────────────────────────────────────
-- 003  Providers (businesses) and related tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE providers (
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

CREATE INDEX idx_providers_owner         ON providers(owner_id);
CREATE INDEX idx_providers_vertical      ON providers(vertical_slug);
CREATE INDEX idx_providers_status        ON providers(status);
CREATE INDEX idx_providers_slug          ON providers(slug);
CREATE INDEX idx_providers_coords        ON providers(lat, lng) WHERE lat IS NOT NULL;
-- GIN index for JSON name search
CREATE INDEX idx_providers_name_gin      ON providers USING gin(name);
CREATE INDEX idx_providers_tags_gin      ON providers USING gin(tags);

CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Provider media ────────────────────────────────────────────────────────────
CREATE TABLE provider_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  tg_file_id  TEXT,
  source      TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'parser' | 'ai'
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provider_photos_provider ON provider_photos(provider_id);

-- ── Provider staff / team members ─────────────────────────────────────────────
CREATE TABLE provider_staff (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'staff',  -- 'owner' | 'manager' | 'staff'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, user_id)
);

-- ── Moderation log ────────────────────────────────────────────────────────────
CREATE TABLE moderation_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type   TEXT NOT NULL,   -- 'provider' | 'review' | 'order'
  entity_id     UUID NOT NULL,
  action        TEXT NOT NULL,   -- 'approve' | 'reject' | 'flag' | 'unflag'
  moderator_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modlog_entity ON moderation_log(entity_type, entity_id);
