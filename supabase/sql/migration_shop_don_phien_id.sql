-- =====================================================================
-- migration_shop_don_phien_id.sql
-- A23: gắn phiên (hash) vào đơn để đo xem→mua. Idempotent.
-- Đã apply trên Supabase CINs 2026-08-09 — chỉ chạy lại nếu thiếu cột.
-- =====================================================================

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS phien_id text;

COMMENT ON COLUMN public.shop_don_hang.phien_id IS
  'Hash phiên client (SHA-256 salt, 32 hex) — không lưu UUID thô.';

CREATE INDEX IF NOT EXISTS shop_don_hang_phien_idx
  ON public.shop_don_hang (phien_id)
  WHERE phien_id IS NOT NULL;
