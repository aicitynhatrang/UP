-- ─────────────────────────────────────────────────────────────────────────────
-- 012  Row-Level Security policies + seed data
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════════════
-- Helper: current user's telegram_id from JWT
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auth_user_id() RETURNS UUID AS $$
  SELECT id FROM users WHERE telegram_id = (current_setting('request.jwt.claims', true)::jsonb->>'telegram_id')::BIGINT LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_is_admin() RETURNS BOOLEAN AS $$
  SELECT is_admin FROM users WHERE id = auth_user_id() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS: users
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: read own row"
  ON users FOR SELECT
  USING (id = auth_user_id() OR auth_is_admin());

CREATE POLICY "users: update own row"
  ON users FOR UPDATE
  USING (id = auth_user_id())
  WITH CHECK (id = auth_user_id());

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS: providers
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers: public read active"
  ON providers FOR SELECT
  USING (status = 'active' OR owner_id = auth_user_id() OR auth_is_admin());

CREATE POLICY "providers: owner update"
  ON providers FOR UPDATE
  USING (owner_id = auth_user_id() OR auth_is_admin());

CREATE POLICY "providers: owner insert"
  ON providers FOR INSERT
  WITH CHECK (owner_id = auth_user_id());

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS: orders
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders: user or provider sees own"
  ON orders FOR SELECT
  USING (
    user_id = auth_user_id()
    OR provider_id IN (SELECT id FROM providers WHERE owner_id = auth_user_id())
    OR auth_is_admin()
  );

CREATE POLICY "orders: user insert"
  ON orders FOR INSERT
  WITH CHECK (user_id = auth_user_id());

CREATE POLICY "orders: user or provider update"
  ON orders FOR UPDATE
  USING (
    user_id = auth_user_id()
    OR provider_id IN (SELECT id FROM providers WHERE owner_id = auth_user_id())
    OR auth_is_admin()
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS: reviews
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews: public read published"
  ON reviews FOR SELECT
  USING (is_published = true OR user_id = auth_user_id() OR auth_is_admin());

CREATE POLICY "reviews: user insert own"
  ON reviews FOR INSERT
  WITH CHECK (user_id = auth_user_id());

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS: parsed_posts
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE parsed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parsed_posts: provider owner read"
  ON parsed_posts FOR SELECT
  USING (
    provider_id IN (SELECT id FROM providers WHERE owner_id = auth_user_id())
    OR auth_is_admin()
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS: points_log, transactions — read own only
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "points_log: read own" ON points_log FOR SELECT USING (user_id = auth_user_id() OR auth_is_admin());

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions: read own" ON transactions FOR SELECT
  USING (user_id = auth_user_id() OR provider_id IN (SELECT id FROM providers WHERE owner_id = auth_user_id()) OR auth_is_admin());

-- ══════════════════════════════════════════════════════════════════════════════
-- Seed: verticals
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO verticals (slug, emoji, name, commission_pct, user_discount_pct, avg_check_vnd, sort_order) VALUES
  ('restaurants',       '🍜', '{"ru":"Рестораны","en":"Restaurants","vi":"Nhà hàng"}',       5, 3, 300000, 1),
  ('cafes',             '☕', '{"ru":"Кофейни","en":"Cafes","vi":"Quán cà phê"}',            6, 3, 80000,  2),
  ('bars',              '🍸', '{"ru":"Бары","en":"Bars","vi":"Quán bar"}',                   5, 3, 200000, 3),
  ('street-food',       '🌮', '{"ru":"Стрит фуд","en":"Street Food","vi":"Ẩm thực đường phố"}',7, 4, 50000, 4),
  ('hotels',            '🏨', '{"ru":"Отели","en":"Hotels","vi":"Khách sạn"}',               3, 2, 1500000,5),
  ('hostels',           '🛏️', '{"ru":"Хостелы","en":"Hostels","vi":"Nhà nghỉ"}',             5, 3, 200000, 6),
  ('villas',            '🏡', '{"ru":"Виллы","en":"Villas","vi":"Biệt thự"}',                3, 2, 3000000,7),
  ('beauty',            '💅', '{"ru":"Красота","en":"Beauty","vi":"Làm đẹp"}',               7, 5, 200000, 8),
  ('spa',               '🧖', '{"ru":"Спа","en":"Spa","vi":"Spa"}',                          5, 3, 500000, 9),
  ('fitness',           '💪', '{"ru":"Фитнес","en":"Fitness","vi":"Thể dục"}',               6, 4, 300000, 10),
  ('tours',             '🏍️', '{"ru":"Туры","en":"Tours","vi":"Du lịch"}',                   5, 3, 800000, 11),
  ('water-sports',      '🏄', '{"ru":"Водный спорт","en":"Water Sports","vi":"Thể thao nước"}',5, 3, 400000,12),
  ('diving',            '🤿', '{"ru":"Дайвинг","en":"Diving","vi":"Lặn"}',                   4, 2, 1200000,13),
  ('transport',         '🚕', '{"ru":"Транспорт","en":"Transport","vi":"Vận chuyển"}',        7, 4, 100000, 14),
  ('medical',           '🏥', '{"ru":"Медицина","en":"Medical","vi":"Y tế"}',                 3, 2, 500000, 15),
  ('education',         '📚', '{"ru":"Образование","en":"Education","vi":"Giáo dục"}',        6, 4, 400000, 16),
  ('real-estate',       '🏠', '{"ru":"Недвижимость","en":"Real Estate","vi":"Bất động sản"}', 2, 1, 10000000,17),
  ('shopping',          '🛍️', '{"ru":"Шопинг","en":"Shopping","vi":"Mua sắm"}',              5, 3, 300000, 18),
  ('entertainment',     '🎭', '{"ru":"Развлечения","en":"Entertainment","vi":"Giải trí"}',    6, 4, 200000, 19),
  ('kids',              '👶', '{"ru":"Детям","en":"Kids","vi":"Trẻ em"}',                     6, 5, 150000, 20),
  ('pets',              '🐾', '{"ru":"Питомцы","en":"Pets","vi":"Thú cưng"}',                 7, 5, 200000, 21),
  ('freelance',         '💻', '{"ru":"Фриланс","en":"Freelance","vi":"Tự do"}',              7, 5, 500000, 22)
ON CONFLICT (slug) DO NOTHING;
