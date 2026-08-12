-- Mô tả shop cho lead /mo-shop (bước 1).
-- Idempotent. Chạy: npm run migrate:shop-dang-ky-mo-mo-ta

ALTER TABLE public.shop_dang_ky_mo
  ADD COLUMN IF NOT EXISTS mo_ta text;

COMMENT ON COLUMN public.shop_dang_ky_mo.mo_ta IS
  'Mô tả ngắn shop — hiển thị / dùng khi dựng shop nháp.';
