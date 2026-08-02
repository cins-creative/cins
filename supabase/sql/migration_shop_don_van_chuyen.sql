-- =====================================================================
-- migration_shop_don_van_chuyen.sql — Link tracking do shop tự dán
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- Chạy: npm run migrate:shop-don-van-chuyen
--
-- Phạm vi:
--   ADD COLUMN shop_don_hang.van_chuyen_link TEXT (nullable)
--   Không liên kết ĐVVC / webhook / API carrier.
-- =====================================================================

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS van_chuyen_link TEXT;

COMMENT ON COLUMN public.shop_don_hang.van_chuyen_link IS
  'Link tracking do shop tự dán (CINs không liên kết ĐVVC).';
