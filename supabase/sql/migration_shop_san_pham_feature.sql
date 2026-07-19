-- L33 follow-up: đánh dấu sản phẩm Feature (nổi bật) trên shop_san_pham
ALTER TABLE public.shop_san_pham
  ADD COLUMN IF NOT EXISTS noi_bat boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.shop_san_pham.noi_bat IS
  'L33: seller đánh dấu Feature — ưu tiên hiện trên mặt tiền cửa hàng.';

CREATE INDEX IF NOT EXISTS idx_shop_san_pham_noi_bat
  ON public.shop_san_pham (id_nguoi_dung, noi_bat)
  WHERE da_xoa = false AND noi_bat = true;
