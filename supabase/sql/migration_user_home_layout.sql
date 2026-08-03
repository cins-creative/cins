-- Trang chủ: preference module sidebar (2026-08-03)
-- user_nguoi_dung.home_layout (jsonb NOT NULL DEFAULT '{}')
--   {}          → chưa tuỳ chỉnh → dùng MODULE_LAYOUT[persona]
--   { v, left, right, hidden, feed?, at? } → layout tuyệt đối theo user
--
-- Idempotent: ADD COLUMN IF NOT EXISTS.

ALTER TABLE public.user_nguoi_dung
  ADD COLUMN IF NOT EXISTS home_layout jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_nguoi_dung.home_layout IS
  'Bố cục module trang chủ: {v,left,right,hidden,feed?,at?}. {} = mặc định theo persona.';
