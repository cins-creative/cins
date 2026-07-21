-- Feature (nổi bật) cho loại hàng trên shop_nhom (truc=1).
ALTER TABLE public.shop_nhom
  ADD COLUMN IF NOT EXISTS noi_bat boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.shop_nhom.noi_bat IS
  'Seller đánh dấu Feature — ưu tiên hiện loại hàng trên mặt tiền cửa hàng.';

CREATE INDEX IF NOT EXISTS idx_shop_nhom_noi_bat
  ON public.shop_nhom (id_nguoi_dung, noi_bat)
  WHERE da_xoa = false AND noi_bat = true AND truc = 1;
