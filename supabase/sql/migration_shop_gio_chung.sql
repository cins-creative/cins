-- =====================================================================
-- migration_shop_gio_chung.sql — L33+ giỏ chung (giỏ chờ mua) toàn buyer
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
--
-- Bối cảnh: trước đây giỏ tách theo post-kiosk (id_cot_moc) hoặc theo
-- cửa hàng (id_cua_hang). User có thể bỏ hàng của NHIỀU cửa hàng vào một
-- "giỏ chờ mua" chung — không gắn sự kiện, không gắn bài. Thêm scope thứ
-- ba: cả id_cot_moc lẫn id_cua_hang đều NULL = giỏ chung (một giỏ / buyer).
-- Checkout vẫn tách theo seller (mỗi seller = một shop_don_hang).
-- =====================================================================

-- Nới CHECK: cho phép giỏ chung (cả hai scope null).
ALTER TABLE public.shop_gio
  DROP CONSTRAINT IF EXISTS shop_gio_scope_chk;

ALTER TABLE public.shop_gio
  ADD CONSTRAINT shop_gio_scope_chk CHECK (
    (id_cot_moc IS NOT NULL AND id_cua_hang IS NULL)      -- giỏ post-kiosk
    OR (id_cot_moc IS NULL AND id_cua_hang IS NOT NULL)   -- giỏ cửa hàng
    OR (id_cot_moc IS NULL AND id_cua_hang IS NULL)        -- giỏ chung (chờ mua)
  );

-- Một giỏ chung / buyer.
CREATE UNIQUE INDEX IF NOT EXISTS shop_gio_buyer_chung_uidx
  ON public.shop_gio (id_nguoi_mua)
  WHERE id_cot_moc IS NULL AND id_cua_hang IS NULL;

COMMENT ON CONSTRAINT shop_gio_scope_chk ON public.shop_gio IS
  'L33+: giỏ post-kiosk | giỏ cửa hàng | giỏ chung (cả hai null).';
