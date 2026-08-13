-- =====================================================================
-- migration_shop_don_yeu_cau_huy.sql — Shop nhờ khách hủy đơn (da_nhan_tien).
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- Chạy: node scripts/run-shop-don-yeu-cau-huy-migration.mjs
--        (npm run migrate:shop-don-yeu-cau-huy)
--
-- Additive, nullable. Không đổi enum trang_thai. Buyer tự hủy cho_xac_nhan
-- không cần cột mới; 3 cột này chỉ giữ yêu cầu shop→buyer khi đã nhận tiền.
-- =====================================================================

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS yeu_cau_huy_luc   timestamptz,
  ADD COLUMN IF NOT EXISTS yeu_cau_huy_ly_do text,
  ADD COLUMN IF NOT EXISTS yeu_cau_huy_boi   uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.shop_don_hang.yeu_cau_huy_luc IS
  'Lúc shop gửi yêu cầu hủy đơn da_nhan_tien. NULL = không có yêu cầu.';
COMMENT ON COLUMN public.shop_don_hang.yeu_cau_huy_ly_do IS
  'Lý do shop nêu khi nhờ khách hủy (≤ 300 ký tự).';
COMMENT ON COLUMN public.shop_don_hang.yeu_cau_huy_boi IS
  'Người gửi yêu cầu hủy (thường = id_nguoi_ban).';
