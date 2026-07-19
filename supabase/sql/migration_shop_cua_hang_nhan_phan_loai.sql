-- L33 follow-up: seller đổi tên trục phân loại (header cột Kho / filter).
-- Idempotent.

ALTER TABLE public.shop_cua_hang
  ADD COLUMN IF NOT EXISTS nhan_phan_loai text;

ALTER TABLE public.shop_cua_hang
  ADD COLUMN IF NOT EXISTS nhan_phan_loai_2 text;

COMMENT ON COLUMN public.shop_cua_hang.nhan_phan_loai IS
  'Nhãn trục phân loại 1 do seller đặt (mặc định UI: Phân loại).';

COMMENT ON COLUMN public.shop_cua_hang.nhan_phan_loai_2 IS
  'Nhãn trục phân loại 2 do seller đặt (mặc định UI: Phân loại 2).';
