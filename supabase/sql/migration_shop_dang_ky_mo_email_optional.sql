-- Email lead /mo-shop optional (liên hệ qua kênh khác không bắt buộc email riêng).
-- Idempotent. Chạy: npm run migrate:shop-dang-ky-mo-email-optional

ALTER TABLE public.shop_dang_ky_mo
  ALTER COLUMN email DROP NOT NULL;
