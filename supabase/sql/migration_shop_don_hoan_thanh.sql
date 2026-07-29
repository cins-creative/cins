-- =====================================================================
-- migration_shop_don_hoan_thanh.sql — L33 Shop: seller đánh dấu đơn
-- "hoàn thành" (trạng thái cuối sau khi đã nhận tiền / đã giao).
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- Chạy: node scripts/run-shop-don-hoan-thanh-migration.mjs
--
-- Bối cảnh: enum trạng thái đơn trước đây dừng ở `da_nhan_tien` (mua_ngay)
-- / `da_giao_tai_su_kien` (đặt trước). Thêm `hoan_thanh` để seller chốt đơn
-- đã giao xong (tách khỏi "vừa nhận tiền" — phục vụ tab quản lý + báo cáo).
-- `ALTER TYPE ... ADD VALUE` chỉ thêm nhãn (không dùng ngay trong migration
-- này) nên an toàn chạy chung một lần trên Postgres 12+.
-- =====================================================================

ALTER TYPE public.shop_trang_thai_don_enum ADD VALUE IF NOT EXISTS 'hoan_thanh';

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS hoan_thanh_luc timestamptz,
  ADD COLUMN IF NOT EXISTS hoan_thanh_boi uuid
    REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.shop_don_hang.hoan_thanh_luc IS
  'L33: thời điểm seller đánh dấu đơn hoàn thành.';
COMMENT ON COLUMN public.shop_don_hang.hoan_thanh_boi IS
  'L33: người đánh dấu hoàn thành (seller).';
