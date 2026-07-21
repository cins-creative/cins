-- Banner sự kiện trên mặt tiền cửa hàng (`shop_cua_hang`).
ALTER TABLE public.shop_cua_hang
  ADD COLUMN IF NOT EXISTS banner_su_kien_id text;

COMMENT ON COLUMN public.shop_cua_hang.banner_su_kien_id IS
  'Cloudflare Images id — banner sự kiện giữa các khối Feature trên mặt tiền.';
