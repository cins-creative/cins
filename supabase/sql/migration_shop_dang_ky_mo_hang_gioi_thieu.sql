-- Mặt hàng giới thiệu (mô tả + link ảnh/PSD) cho lead /mo-shop bước 3.
-- Idempotent. Chạy: npm run migrate:shop-dang-ky-mo-hang-gioi-thieu

ALTER TABLE public.shop_dang_ky_mo
  ADD COLUMN IF NOT EXISTS hang_gioi_thieu jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.shop_dang_ky_mo.hang_gioi_thieu IS
  'Mặt hàng giới thiệu: [{ "mo_ta": "...", "link": "https://..." }].';

COMMENT ON COLUMN public.shop_dang_ky_mo.nen_tang_mxh IS
  'Link nền tảng MXH / marketplace shop đang bán (URL).';
