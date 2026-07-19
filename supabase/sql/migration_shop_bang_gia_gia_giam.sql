-- L33 add-on: giá giảm (khuyến mãi) trên dòng bảng giá.
-- gia = giá bán (niêm yết); gia_giam = giá khách trả khi giảm (nullable).

ALTER TABLE public.shop_bang_gia_dong
  ADD COLUMN IF NOT EXISTS gia_giam numeric(18, 2)
    CHECK (gia_giam IS NULL OR gia_giam >= 0);

COMMENT ON COLUMN public.shop_bang_gia_dong.gia IS
  'Giá bán (niêm yết) theo bảng giá.';
COMMENT ON COLUMN public.shop_bang_gia_dong.gia_giam IS
  'Giá giảm / khuyến mãi. Null = không giảm; khi có thì là giá khách trả.';
