-- =====================================================================
-- migration_shop_nhom_overlay.sql
-- L33: ảnh overlay trên loại hàng — chồng lên hình mẫu sản phẩm (storefront).
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- =====================================================================

ALTER TABLE public.shop_nhom
  ADD COLUMN IF NOT EXISTS overlay_anh_id text;

COMMENT ON COLUMN public.shop_nhom.overlay_anh_id IS
  'Cloudflare Images id — lớp chồng trực tiếp lên ảnh mẫu sản phẩm của loại (truc=1).';
