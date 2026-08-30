-- Watermark per cột mốc (ảnh bài dài / album) — bật/tắt từ owner menu.
-- Config watermark (preset/custom/góc) nằm ở user_nguoi_dung.giao_dien.watermark (jsonb).
-- Idempotent.

ALTER TABLE public.content_cot_moc
  ADD COLUMN IF NOT EXISTS watermark_bat boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.content_cot_moc.watermark_bat IS
  'Owner bật gắn watermark overlay lên ảnh của cột mốc (album / bài dài). Config hình/góc ở giao_dien.watermark.';
