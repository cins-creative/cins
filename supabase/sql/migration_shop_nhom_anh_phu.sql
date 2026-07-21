-- =============================================================================
-- migration_shop_nhom_anh_phu.sql
-- Ảnh thật / media phụ trên loại hàng (shop_nhom truc=1) — Cloudflare image ids.
-- =============================================================================

ALTER TABLE public.shop_nhom
  ADD COLUMN IF NOT EXISTS anh_phu_ids text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shop_nhom_anh_phu_ids_len'
  ) THEN
    ALTER TABLE public.shop_nhom
      ADD CONSTRAINT shop_nhom_anh_phu_ids_len
      CHECK (cardinality(anh_phu_ids) <= 8);
  END IF;
END $$;

COMMENT ON COLUMN public.shop_nhom.anh_phu_ids IS
  'Ảnh thật sản phẩm phụ (Cloudflare image ids), tối đa 8 — hiển thị trên trang loại.';
