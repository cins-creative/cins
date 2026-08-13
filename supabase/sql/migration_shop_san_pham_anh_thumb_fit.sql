-- Kiểu ảnh ô vuông từng mẫu: contain = vừa khung, cover = lấp khung.
-- Idempotent. Mặc định cover = hành vi cũ.

ALTER TABLE public.shop_san_pham
  ADD COLUMN IF NOT EXISTS anh_thumb_fit text NOT NULL DEFAULT 'cover';

ALTER TABLE public.shop_san_pham
  DROP CONSTRAINT IF EXISTS shop_san_pham_anh_thumb_fit_chk;

ALTER TABLE public.shop_san_pham
  ADD CONSTRAINT shop_san_pham_anh_thumb_fit_chk
  CHECK (anh_thumb_fit IN ('contain', 'cover'));

COMMENT ON COLUMN public.shop_san_pham.anh_thumb_fit IS
  'Kiểu ảnh ô vuông trên kho / kiosk / giỏ: contain = vừa khung, cover = lấp khung.';
