-- =====================================================================
-- migration_shop_nhom_gia_mac_dinh.sql
-- L33: giá gốc mặc định trên loại hàng (shop_nhom) — mẫu kế thừa; giá giảm từng mẫu.
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- =====================================================================

ALTER TABLE public.shop_nhom
  ADD COLUMN IF NOT EXISTS gia_mac_dinh numeric;

ALTER TABLE public.shop_nhom
  DROP CONSTRAINT IF EXISTS shop_nhom_gia_mac_dinh_chk;

ALTER TABLE public.shop_nhom
  ADD CONSTRAINT shop_nhom_gia_mac_dinh_chk
  CHECK (gia_mac_dinh IS NULL OR gia_mac_dinh >= 0);

COMMENT ON COLUMN public.shop_nhom.gia_mac_dinh IS
  'Giá gốc mặc định của loại (truc=1). Đồng bộ xuống shop_bang_gia_dong.gia của mọi mẫu; mẫu chỉ chỉnh gia_giam.';
