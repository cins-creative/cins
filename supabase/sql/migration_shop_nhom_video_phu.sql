-- =============================================================================
-- migration_shop_nhom_video_phu.sql
-- Tối đa 1 video phụ (Bunny Stream guid) trên loại hàng.
-- =============================================================================

ALTER TABLE public.shop_nhom
  ADD COLUMN IF NOT EXISTS video_phu_id text;

COMMENT ON COLUMN public.shop_nhom.video_phu_id IS
  'Video phụ (Bunny Stream video guid), tối đa 1 — hiển thị trên trang loại.';
