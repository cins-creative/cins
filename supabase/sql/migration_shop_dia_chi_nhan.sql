-- =====================================================================
-- migration_shop_dia_chi_nhan.sql — Sổ địa chỉ nhận hàng (nhiều hồ sơ).
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
--
-- Người mua có thể lưu NHIỀU hồ sơ nhận hàng (họ tên + SĐT + địa chỉ) và
-- chọn khi thanh toán. Snapshot vẫn ghi vào shop_don_hang.mua_* lúc đặt đơn.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.shop_dia_chi_nhan (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_dung  uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  nhan           text,                     -- nhãn: "Nhà", "Công ty"…
  ho_ten         text NOT NULL,
  so_dien_thoai  text NOT NULL,
  dia_chi        text NOT NULL,            -- chi tiết (số nhà, đường…)
  phuong_xa      text,                     -- phường/xã sau sát nhập (tên trần)
  tinh_thanh     text,                     -- mã enum tinh_thanh_vn_enum (lưu text)
  la_mac_dinh    boolean NOT NULL DEFAULT false,
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc   timestamptz NOT NULL DEFAULT now()
);

-- Bổ sung cột phường/xã cho bảng đã tồn tại (idempotent).
ALTER TABLE public.shop_dia_chi_nhan
  ADD COLUMN IF NOT EXISTS phuong_xa text;

CREATE INDEX IF NOT EXISTS shop_dia_chi_nhan_nguoi_dung_idx
  ON public.shop_dia_chi_nhan (id_nguoi_dung, tao_luc DESC);

-- Tối đa một địa chỉ mặc định / người dùng.
CREATE UNIQUE INDEX IF NOT EXISTS shop_dia_chi_nhan_mac_dinh_uidx
  ON public.shop_dia_chi_nhan (id_nguoi_dung)
  WHERE la_mac_dinh;

ALTER TABLE public.shop_dia_chi_nhan ENABLE ROW LEVEL SECURITY;

-- Chủ sở hữu toàn quyền (đọc/ghi/xóa) trên hồ sơ nhận hàng của mình.
DROP POLICY IF EXISTS shop_dia_chi_nhan_owner ON public.shop_dia_chi_nhan;
CREATE POLICY shop_dia_chi_nhan_owner ON public.shop_dia_chi_nhan
  FOR ALL
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());
