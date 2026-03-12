-- ─────────────────────────────────────────────────────────────────────────────
-- 005  Catalog: verticals, services, favorites, search
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Vertical metadata (mirrors JS constants, for DB joins) ────────────────────
CREATE TABLE verticals (
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
CREATE TABLE provider_services (
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

CREATE INDEX idx_services_provider ON provider_services(provider_id);

CREATE TRIGGER provider_services_updated_at
  BEFORE UPDATE ON provider_services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── User favorites ────────────────────────────────────────────────────────────
CREATE TABLE favorites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

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

CREATE TRIGGER providers_fts_trigger
  BEFORE INSERT OR UPDATE OF name, address, tags ON providers
  FOR EACH ROW EXECUTE FUNCTION providers_fts_update();

CREATE INDEX idx_providers_fts ON providers USING GIN(fts);

-- ── Tags autocomplete ─────────────────────────────────────────────────────────
CREATE TABLE tags (
  slug       TEXT PRIMARY KEY,
  name       JSONB NOT NULL DEFAULT '{}',
  use_count  INTEGER NOT NULL DEFAULT 0
);
