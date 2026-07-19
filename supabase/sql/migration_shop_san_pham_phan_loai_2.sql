-- L33 follow-up: phân loại 2 (tag nhóm thứ hai) trên shop_san_pham
ALTER TABLE public.shop_san_pham
  ADD COLUMN IF NOT EXISTS phan_loai_2 text;

COMMENT ON COLUMN public.shop_san_pham.phan_loai_2 IS
  'L33: nhãn phân loại / nhóm thứ hai do seller tự đặt (song song phan_loai).';

CREATE INDEX IF NOT EXISTS idx_shop_san_pham_phan_loai_2
  ON public.shop_san_pham (id_nguoi_dung, phan_loai_2)
  WHERE da_xoa = false AND phan_loai_2 IS NOT NULL;
