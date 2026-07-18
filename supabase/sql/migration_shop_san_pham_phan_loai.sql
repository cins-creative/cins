-- L33 follow-up: phân loại sản phẩm (tag nhóm) trên shop_san_pham
ALTER TABLE public.shop_san_pham
  ADD COLUMN IF NOT EXISTS phan_loai text;

COMMENT ON COLUMN public.shop_san_pham.phan_loai IS
  'L33: nhãn phân loại / nhóm sản phẩm do seller tự đặt (VD: keychain, acrylic).';

CREATE INDEX IF NOT EXISTS idx_shop_san_pham_phan_loai
  ON public.shop_san_pham (id_nguoi_dung, phan_loai)
  WHERE da_xoa = false AND phan_loai IS NOT NULL;
