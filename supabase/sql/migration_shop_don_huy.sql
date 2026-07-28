-- =====================================================================
-- migration_shop_don_huy.sql — L33 Shop: seller hủy đơn cho_xac_nhan.
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- Chạy: node scripts/run-shop-don-huy-migration.mjs
--
-- Bối cảnh: nền tảng KHÔNG tự hủy đơn (chỉ nhắc qua aging UI). Seller tự
-- quyết định hủy đơn treo — hủy sẽ hoàn kho. Enum `huy` và cột `huy_luc`
-- đã có sẵn từ migration_shop_ban_hang.sql; chỉ bổ sung lý do + người hủy.
-- =====================================================================

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS ly_do_huy text,
  ADD COLUMN IF NOT EXISTS huy_boi   uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.shop_don_hang.ly_do_huy IS
  'L33: lý do hủy đơn (bắt buộc khi seller hủy).';
COMMENT ON COLUMN public.shop_don_hang.huy_boi IS
  'L33: người thực hiện hủy (seller).';
