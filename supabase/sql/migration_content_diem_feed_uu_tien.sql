-- Điểm ưu tiên admin (cộng đẩy / trừ dìm) — không bị reset khi tắt đẩy L29.
-- Idempotent. Chạy: node scripts/run-content-diem-feed-uu-tien-migration.mjs

ALTER TABLE public.content_diem_feed
  ADD COLUMN IF NOT EXISTS diem_uu_tien smallint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.content_diem_feed.diem_uu_tien IS
  'Điểm ưu tiên admin chỉnh tay (±5 / ±10/lần, dải -200..+200). Cộng vào tong_goc khi tính diem_hien_tai. Dương = đẩy lên, âm = dìm nội dung không phù hợp. Không đụng khi ON/OFF đẩy.';

ALTER TABLE public.content_diem_feed
  DROP CONSTRAINT IF EXISTS chk_diem_feed_uu_tien;

ALTER TABLE public.content_diem_feed
  ADD CONSTRAINT chk_diem_feed_uu_tien
  CHECK (diem_uu_tien >= -200 AND diem_uu_tien <= 200);
