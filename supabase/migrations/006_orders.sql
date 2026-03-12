-- ─────────────────────────────────────────────────────────────────────────────
-- 006  Orders, commissions, transactions
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Orders ────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
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

CREATE INDEX idx_orders_user_id     ON orders(user_id);
CREATE INDEX idx_orders_provider_id ON orders(provider_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_orders_created_at  ON orders(created_at);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add FK from reviews and referral_payouts
ALTER TABLE reviews          ADD CONSTRAINT fk_reviews_order
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE referral_payouts ADD CONSTRAINT fk_payouts_order
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- ── Order messages (Realtime chat) ────────────────────────────────────────────
CREATE TABLE order_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT,
  media_url   TEXT,
  type        TEXT NOT NULL DEFAULT 'text',   -- 'text' | 'image' | 'voice' | 'system'
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_order   ON order_messages(order_id);
CREATE INDEX idx_messages_sender  ON order_messages(sender_id);

-- ── Financial transactions ledger ─────────────────────────────────────────────
CREATE TABLE transactions (
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

CREATE INDEX idx_transactions_user     ON transactions(user_id);
CREATE INDEX idx_transactions_provider ON transactions(provider_id);
CREATE INDEX idx_transactions_order    ON transactions(order_id);
CREATE INDEX idx_transactions_type     ON transactions(type);
CREATE INDEX idx_transactions_created  ON transactions(created_at);

-- ── Withdrawal requests ───────────────────────────────────────────────────────
CREATE TABLE withdrawal_requests (
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
