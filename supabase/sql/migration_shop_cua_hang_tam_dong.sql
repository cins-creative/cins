-- L33 follow-up: shop tạm đóng theo khoảng thời gian.
-- Idempotent.

ALTER TABLE public.shop_cua_hang
  ADD COLUMN IF NOT EXISTS tam_dong boolean NOT NULL DEFAULT false;

ALTER TABLE public.shop_cua_hang
  ADD COLUMN IF NOT EXISTS tam_dong_tu timestamptz;

ALTER TABLE public.shop_cua_hang
  ADD COLUMN IF NOT EXISTS tam_dong_den timestamptz;

COMMENT ON COLUMN public.shop_cua_hang.tam_dong IS
  'Seller bật chế độ nghỉ tạm. Chỉ đóng cửa khi now ∈ [tam_dong_tu, tam_dong_den).';

COMMENT ON COLUMN public.shop_cua_hang.tam_dong_tu IS
  'Bắt đầu nghỉ (timestamptz). Null = chưa lịch.';

COMMENT ON COLUMN public.shop_cua_hang.tam_dong_den IS
  'Mở lại (timestamptz). Null = chưa lịch.';
