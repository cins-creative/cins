-- Tick xanh (xác minh danh tính công khai) cho user_nguoi_dung.
-- Khác với verify cột mốc (verify_xac_nhan) và bảo mật 2 lớp (bao_mat_2_lop):
-- đây là badge hiển thị cạnh tên, do admin CINs cấp thủ công.
-- Chạy trên Supabase SQL Editor hoặc scripts/run-user-da-xac-minh-migration.mjs (idempotent).

ALTER TABLE public.user_nguoi_dung
  ADD COLUMN IF NOT EXISTS da_xac_minh   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS xac_minh_luc  timestamptz,
  ADD COLUMN IF NOT EXISTS xac_minh_boi  uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.user_nguoi_dung.da_xac_minh IS
  'Tick xanh — tài khoản đã được admin CINs xác minh (hiển thị badge cạnh tên).';
COMMENT ON COLUMN public.user_nguoi_dung.xac_minh_luc IS
  'Thời điểm được cấp tick xanh gần nhất.';
COMMENT ON COLUMN public.user_nguoi_dung.xac_minh_boi IS
  'Admin (user_nguoi_dung.id) đã cấp tick xanh.';

-- Chỉ index các tài khoản đã xác minh (số ít) — tra danh sách nhanh.
CREATE INDEX IF NOT EXISTS idx_user_nguoi_dung_da_xac_minh
  ON public.user_nguoi_dung (da_xac_minh)
  WHERE da_xac_minh;

-- Tự động tick tài khoản chính chủ CINs_Official.
UPDATE public.user_nguoi_dung
   SET da_xac_minh = true,
       xac_minh_luc = COALESCE(xac_minh_luc, now())
 WHERE slug = 'cins_official'
   AND da_xac_minh = false;
