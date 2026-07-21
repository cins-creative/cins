-- L33 follow-up: lý do nghỉ tạm shop.
-- Idempotent.

ALTER TABLE public.shop_cua_hang
  ADD COLUMN IF NOT EXISTS tam_dong_ly_do text;

COMMENT ON COLUMN public.shop_cua_hang.tam_dong_ly_do IS
  'Lý do nghỉ tạm (tuỳ chọn). Hiện trên storefront khi shop đang đóng.';
