-- =====================================================================
-- migration_shop_don_bien_lai.sql — L33+ đính kèm biên lai chuyển khoản
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
--
-- Bối cảnh: checkout từ giỏ chung yêu cầu buyer đính kèm ảnh biên lai
-- chuyển khoản trước khi gửi đơn. Lưu URL + image id (Cloudflare) trên
-- đơn để cả buyer (card đã gửi) lẫn seller (chi tiết đơn) đều xem được.
-- =====================================================================

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS bien_lai_anh_url text,
  ADD COLUMN IF NOT EXISTS bien_lai_anh_id text;

COMMENT ON COLUMN public.shop_don_hang.bien_lai_anh_url IS
  'L33+: ảnh biên lai chuyển khoản buyer đính kèm lúc gửi đơn (giỏ chung).';
COMMENT ON COLUMN public.shop_don_hang.bien_lai_anh_id IS
  'L33+: Cloudflare image id của biên lai (dựng lại URL khi cần).';
