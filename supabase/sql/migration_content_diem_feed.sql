-- Feed scoring (World Timeline) — điểm bài + decay 7 ngày.
-- Chỉ cot_moc / org_bai_dang (không org_su_kien).
-- Idempotent. Chạy: node scripts/run-content-diem-feed-migration.mjs
-- Chưa chạy cho đến khi được duyệt.

CREATE TABLE IF NOT EXISTS public.content_diem_feed (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic: bài user (cột mốc) hoặc bài org
  loai_doi_tuong  text NOT NULL,
  id_doi_tuong    uuid NOT NULL,

  -- Điểm thành phần (app layer tính; SMALLINT)
  diem_co_ban       smallint NOT NULL DEFAULT 40,
  diem_noi_dung     smallint NOT NULL DEFAULT 0,
  diem_verify       smallint NOT NULL DEFAULT 0,
  diem_engagement   smallint NOT NULL DEFAULT 0,
  engagement_can_tinh_lai boolean NOT NULL DEFAULT false,

  -- Gốc tính decay (lúc đăng / lúc admin đẩy)
  bat_dau_luc     timestamptz NOT NULL DEFAULT now(),

  -- Admin đẩy bài (audit nhẹ; TTL/audit đầy đủ vẫn ở content_world_boost)
  day_boi         uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  day_luc         timestamptz,

  tao_luc         timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_diem_feed_doi_tuong UNIQUE (loai_doi_tuong, id_doi_tuong),
  CONSTRAINT chk_diem_feed_loai CHECK (
    loai_doi_tuong IN ('cot_moc', 'org_bai_dang')
  )
);

COMMENT ON TABLE public.content_diem_feed IS
  'Điểm World Feed Timeline — thành phần + bat_dau_luc để tính diem_hien_tai realtime (decay 7 ngày). Không dùng cho Gallery / Journey / org_su_kien.';

COMMENT ON COLUMN public.content_diem_feed.diem_co_ban IS
  '40 mặc định; admin đẩy → 100 (FEED_SCORE.BOOST_RESET_SCORE).';
COMMENT ON COLUMN public.content_diem_feed.bat_dau_luc IS
  'Đồng hồ decay riêng từng bài; diem_hien_tai không lưu cột (tính lúc query).';
COMMENT ON COLUMN public.content_diem_feed.engagement_can_tinh_lai IS
  'TRUE khi có reaction/comment/lưu mới — batch hoặc lazy recalc diem_engagement.';

-- Lọc pool 7 ngày trước khi sort theo công thức decay
CREATE INDEX IF NOT EXISTS idx_diem_feed_bat_dau
  ON public.content_diem_feed (bat_dau_luc DESC);

CREATE INDEX IF NOT EXISTS idx_diem_feed_engagement_flag
  ON public.content_diem_feed (engagement_can_tinh_lai)
  WHERE engagement_can_tinh_lai = true;

CREATE INDEX IF NOT EXISTS idx_diem_feed_doi_tuong
  ON public.content_diem_feed (loai_doi_tuong, id_doi_tuong);

-- Ghi: service-role (bypass RLS). Client: chỉ SELECT (không có policy write = chặn ghi).
ALTER TABLE public.content_diem_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS diem_feed_select_all ON public.content_diem_feed;
CREATE POLICY diem_feed_select_all ON public.content_diem_feed
  FOR SELECT
  USING (true);
