-- =====================================================================
-- migration_shop_don_van_chuyen_ma.sql — ĐVVC + mã vận đơn
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- Chạy: npm run migrate:shop-don-van-chuyen-ma
--
-- Thêm: van_chuyen_ma, van_chuyen_dvvc
-- Giữ: van_chuyen_link (URL suy từ ĐVVC+mã khi lưu — buyer theo dõi)
-- Backfill ĐVVC từ link URL cũ nếu có.
-- =====================================================================

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS van_chuyen_ma TEXT,
  ADD COLUMN IF NOT EXISTS van_chuyen_dvvc TEXT;

COMMENT ON COLUMN public.shop_don_hang.van_chuyen_ma IS
  'Mã vận đơn do shop nhập (CINs không liên kết ĐVVC).';
COMMENT ON COLUMN public.shop_don_hang.van_chuyen_dvvc IS
  'Tên ĐVVC shop chọn (ViettelPost, GHN, …).';
COMMENT ON COLUMN public.shop_don_hang.van_chuyen_link IS
  'URL tra cứu suy từ ĐVVC+mã (hoặc link legacy shop đã dán).';

-- Backfill ĐVVC từ link cũ (chỉ khi chưa có dvvc).
UPDATE public.shop_don_hang
SET van_chuyen_dvvc = CASE
  WHEN van_chuyen_link ILIKE '%viettel%' THEN 'ViettelPost'
  WHEN van_chuyen_link ILIKE '%ghn%' OR van_chuyen_link ILIKE '%giaohangnhanh%' THEN 'GHN'
  WHEN van_chuyen_link ILIKE '%ghtk%' OR van_chuyen_link ILIKE '%giaohangtietkiem%' THEN 'GHTK'
  WHEN van_chuyen_link ILIKE '%jtexpress%' OR van_chuyen_link ILIKE '%j&t%' THEN 'J&T'
  WHEN van_chuyen_link ILIKE '%spx%' OR van_chuyen_link ILIKE '%shopee%' THEN 'SPX'
  WHEN van_chuyen_link ILIKE '%ninjavan%' THEN 'Ninja Van'
  WHEN van_chuyen_link ILIKE '%ahamove%' THEN 'Ahamove'
  WHEN van_chuyen_link ILIKE '%grab%' THEN 'Grab'
  WHEN van_chuyen_link IS NOT NULL AND btrim(van_chuyen_link) <> '' THEN 'Khác'
  ELSE van_chuyen_dvvc
END
WHERE van_chuyen_dvvc IS NULL
  AND van_chuyen_link IS NOT NULL
  AND btrim(van_chuyen_link) <> '';
