-- Toggle hiện banner sự kiện trên mặt tiền.
ALTER TABLE public.shop_cua_hang
  ADD COLUMN IF NOT EXISTS banner_su_kien_hien boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.shop_cua_hang.banner_su_kien_hien IS
  'true = hiện banner sự kiện trên mặt tiền (khi có ảnh); false = ẩn với khách.';
