-- =====================================================================
-- migration_shop_ship_reverse.sql — Gỡ liên kết ĐVVC / kho API
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- Chạy: npm run migrate:shop-ship-reverse
--
-- Phạm vi (đã chốt reverse shop tự ship):
--   DROP TABLE: shop_van_don_log, shop_van_chuyen_ket_noi, shop_dia_chi_lay
--   DROP COLUMN trên shop_don_hang: dvvc, ma_van_don, phi_ship, can_nang,
--     van_chuyen_trang_thai, van_chuyen_dong_y_*
--   GIỮ: mua_ho_ten / mua_so_dien_thoai / mua_dia_chi / mua_phuong_xa*
--         / mua_tinh_thanh / hinh_thuc_giao
--   GIỮ: shop_phi_* · shop_khieu_nai* · shop_bien_the.can_nang ·
--         shop_dia_chi_nhan · enum shop_hinh_thuc_giao_enum (value online lịch sử)
-- Lịch sử: migration_shop_ship_ghn.sql giữ trong repo (audit) — không xóa.
-- =====================================================================

-- ── Đếm trước DROP (script runner in log; optional) ───────────────
-- SELECT 'shop_van_chuyen_ket_noi' AS t, count(*) FROM public.shop_van_chuyen_ket_noi
-- UNION ALL SELECT 'shop_dia_chi_lay', count(*) FROM public.shop_dia_chi_lay
-- UNION ALL SELECT 'shop_van_don_log', count(*) FROM public.shop_van_don_log;

-- ── Indexes gắn cột ship ─────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_shop_don_ma_van_don;

-- ── Bảng chỉ phục vụ ĐVVC / kho lấy / tracking ───────────────────
DROP TABLE IF EXISTS public.shop_van_don_log CASCADE;
DROP TABLE IF EXISTS public.shop_van_chuyen_ket_noi CASCADE;
DROP TABLE IF EXISTS public.shop_dia_chi_lay CASCADE;

-- ── Cột ship trên đơn (không đụng snapshot địa chỉ người mua) ─────
ALTER TABLE public.shop_don_hang
  DROP COLUMN IF EXISTS dvvc,
  DROP COLUMN IF EXISTS ma_van_don,
  DROP COLUMN IF EXISTS phi_ship,
  DROP COLUMN IF EXISTS can_nang,
  DROP COLUMN IF EXISTS van_chuyen_trang_thai,
  DROP COLUMN IF EXISTS van_chuyen_dong_y_luc,
  DROP COLUMN IF EXISTS van_chuyen_dong_y_van_ban,
  DROP COLUMN IF EXISTS van_chuyen_dong_y_phien_ban;

COMMENT ON COLUMN public.shop_don_hang.hinh_thuc_giao IS
  'Hình thức nhận: truc_tiep | tai_su_kien | online (lịch sử — CINs không còn liên kết ĐVVC).';
COMMENT ON COLUMN public.shop_don_hang.mua_phuong_xa IS
  'Snapshot phường/xã lúc đặt đơn — shop tự ship ngoài CINs.';
COMMENT ON COLUMN public.shop_don_hang.mua_phuong_xa_code IS
  'Snapshot mã GSO phường/xã lúc đặt đơn.';
COMMENT ON COLUMN public.shop_don_hang.mua_tinh_thanh IS
  'Snapshot tỉnh/thành lúc đặt đơn.';

-- Enum shop_van_chuyen_trang_thai_enum có thể còn — DROP TYPE nếu không còn phụ thuộc.
DO $$ BEGIN
  DROP TYPE IF EXISTS public.shop_van_chuyen_trang_thai_enum;
EXCEPTION WHEN dependent_objects_still_exist THEN
  RAISE NOTICE 'shop_van_chuyen_trang_thai_enum still referenced — skip DROP TYPE';
END $$;
