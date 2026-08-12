-- Thêm cột nền tảng MXH cho lead /mo-shop.
-- Idempotent. Chạy: npm run migrate:shop-dang-ky-mo-nen-tang

ALTER TABLE public.shop_dang_ky_mo
  ADD COLUMN IF NOT EXISTS nen_tang_mxh text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.shop_dang_ky_mo.nen_tang_mxh IS
  'Nền tảng MXH / marketplace lead đang dùng (facebook, instagram, …).';
