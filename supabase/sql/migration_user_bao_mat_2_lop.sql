-- Bảo mật 2 lớp (2FA) qua số điện thoại — enroll-only (2026-07-13)
-- Người dùng nhập + xác minh SĐT qua OTP để bật/tắt 2FA trong modal cài đặt.
-- CHƯA ép nhập mã lúc đăng nhập; phần gửi SMS thật còn stub (ráp provider sau).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE TABLE IF NOT EXISTS + guard.

-- 1) Cột trên hồ sơ người dùng ------------------------------------------------
ALTER TABLE public.user_nguoi_dung
  ADD COLUMN IF NOT EXISTS so_dien_thoai text;

ALTER TABLE public.user_nguoi_dung
  ADD COLUMN IF NOT EXISTS bao_mat_2_lop_bat boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_nguoi_dung
  ADD COLUMN IF NOT EXISTS so_dien_thoai_xac_minh_luc timestamptz;

COMMENT ON COLUMN public.user_nguoi_dung.so_dien_thoai IS
  'SĐT đã xác minh cho 2FA (E.164, vd +8490...). NULL = chưa xác minh.';
COMMENT ON COLUMN public.user_nguoi_dung.bao_mat_2_lop_bat IS
  'Bật/tắt bảo mật 2 lớp qua SĐT. true chỉ khi SĐT đã xác minh.';
COMMENT ON COLUMN public.user_nguoi_dung.so_dien_thoai_xac_minh_luc IS
  'Thời điểm xác minh SĐT thành công gần nhất.';

-- 2) Bảng thử-thách OTP qua SĐT -----------------------------------------------
-- Lưu ma_hash (SHA-256), KHÔNG lưu mã thô. Có hạn dùng + giới hạn số lần thử.
CREATE TABLE IF NOT EXISTS public.auth_otp_dien_thoai (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_nguoi_dung  uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  so_dien_thoai  text NOT NULL,
  ma_hash        text NOT NULL,
  het_han_luc    timestamptz NOT NULL,
  so_lan_thu     int NOT NULL DEFAULT 0,
  tao_luc        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.auth_otp_dien_thoai IS
  'Thử-thách OTP xác minh SĐT cho 2FA. Chỉ service role truy cập.';

CREATE INDEX IF NOT EXISTS idx_auth_otp_dien_thoai_nguoi_dung
  ON public.auth_otp_dien_thoai (id_nguoi_dung, tao_luc DESC);

-- 3) RLS: chỉ service role (API) đọc/ghi — không policy cho client -------------
ALTER TABLE public.auth_otp_dien_thoai ENABLE ROW LEVEL SECURITY;
-- Không policy: bảng chứa dữ liệu nhạy cảm (ma_hash, SĐT chưa public),
-- mọi truy cập đi qua API bằng service role + session check.
