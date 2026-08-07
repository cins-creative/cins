-- Nhóm A — giới hạn tự khai «Tôi đã chuyển rồi» (1 lần / hoá đơn).
-- Plan: docs/PLAN_va_lo_hong_thanh_toan.md §2.1

ALTER TABLE public.cins_hoa_don
  ADD COLUMN IF NOT EXISTS tu_khai_lan smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tu_khai_boi uuid REFERENCES public.user_nguoi_dung (id);

ALTER TABLE public.cins_hoa_don
  DROP CONSTRAINT IF EXISTS cins_hoa_don_tu_khai_lan_check;
ALTER TABLE public.cins_hoa_don
  ADD CONSTRAINT cins_hoa_don_tu_khai_lan_check
  CHECK (tu_khai_lan >= 0 AND tu_khai_lan <= 10);

CREATE INDEX IF NOT EXISTS idx_cins_hoa_don_tu_khai
  ON public.cins_hoa_don (tu_khai_da_tra_luc)
  WHERE tu_khai_lan > 0;

-- Backfill: đã tự khai trước bản vá = đã dùng 1 lượt (không hồi tố phạt / không tặng lượt mới).
UPDATE public.cins_hoa_don
SET tu_khai_lan = 1
WHERE tu_khai_da_tra_luc IS NOT NULL
  AND tu_khai_lan = 0;
