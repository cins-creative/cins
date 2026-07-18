-- Mã đơn hiển thị (shop name + số ngẫu nhiên) — seller tra cứu nhanh.
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS ma_don text;

COMMENT ON COLUMN public.shop_don_hang.ma_don IS
  'Mã đơn công khai dạng TENNGUOIMUA-12345 (tên người mua + số ngẫu nhiên).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_don_ma_don
  ON public.shop_don_hang (ma_don)
  WHERE ma_don IS NOT NULL;
