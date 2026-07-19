-- L33+: giỏ theo cửa hàng (mua từ /{slug}/shop) song song giỏ theo post-kiosk.
-- id_cot_moc nullable; thêm id_cua_hang; đúng một trong hai scope.

ALTER TABLE public.shop_gio
  ADD COLUMN IF NOT EXISTS id_cua_hang uuid
    REFERENCES public.shop_cua_hang(id) ON DELETE CASCADE;

ALTER TABLE public.shop_gio
  ALTER COLUMN id_cot_moc DROP NOT NULL;

ALTER TABLE public.shop_gio
  DROP CONSTRAINT IF EXISTS shop_gio_id_nguoi_mua_id_cot_moc_key;

ALTER TABLE public.shop_gio
  DROP CONSTRAINT IF EXISTS shop_gio_scope_chk;

ALTER TABLE public.shop_gio
  ADD CONSTRAINT shop_gio_scope_chk CHECK (
    (id_cot_moc IS NOT NULL AND id_cua_hang IS NULL)
    OR (id_cot_moc IS NULL AND id_cua_hang IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS shop_gio_buyer_moc_uidx
  ON public.shop_gio (id_nguoi_mua, id_cot_moc)
  WHERE id_cot_moc IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS shop_gio_buyer_ch_uidx
  ON public.shop_gio (id_nguoi_mua, id_cua_hang)
  WHERE id_cua_hang IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_gio_cua_hang
  ON public.shop_gio (id_cua_hang)
  WHERE id_cua_hang IS NOT NULL;

COMMENT ON COLUMN public.shop_gio.id_cua_hang IS
  'Giỏ storefront (mua từ trang shop); null khi giỏ theo post-kiosk.';
COMMENT ON COLUMN public.shop_gio.id_cot_moc IS
  'Giỏ post-kiosk; null khi giỏ theo cửa hàng.';
