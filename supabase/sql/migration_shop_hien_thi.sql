-- =====================================================================
-- migration_shop_hien_thi.sql — L33: công khai tab Shop trên Journey
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
--
-- ban_hang_bat  = bật module bán hàng (kho / quản lý / nhận đơn)
-- shop_hien_thi = hiện Shop + sản phẩm trên Journey (public)
-- =====================================================================

ALTER TABLE public.user_nguoi_dung
  ADD COLUMN IF NOT EXISTS shop_hien_thi boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_nguoi_dung.shop_hien_thi IS
  'L33: hiện tab Shop / sản phẩm trên Journey (mặc định false). Chỉ có ý nghĩa khi ban_hang_bat=true.';

-- Tắt bán hàng → tắt luôn hiển thị shop (an toàn khi backfill / drift).
UPDATE public.user_nguoi_dung
SET shop_hien_thi = false
WHERE ban_hang_bat = false
  AND shop_hien_thi = true;

-- Public SELECT cửa hàng / PTTT cần cả hai cờ.
DROP POLICY IF EXISTS shop_cua_hang_doc_cong_khai ON public.shop_cua_hang;
CREATE POLICY shop_cua_hang_doc_cong_khai ON public.shop_cua_hang
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_nguoi_dung u
      WHERE u.id = id_nguoi_dung
        AND u.ban_hang_bat = true
        AND u.shop_hien_thi = true
    )
  );

DROP POLICY IF EXISTS shop_pttt_doc_cong_khai ON public.shop_phuong_thuc_tt;
CREATE POLICY shop_pttt_doc_cong_khai ON public.shop_phuong_thuc_tt
  FOR SELECT
  USING (
    kich_hoat = true
    AND EXISTS (
      SELECT 1
      FROM public.shop_cua_hang c
      JOIN public.user_nguoi_dung u ON u.id = c.id_nguoi_dung
      WHERE c.id = id_cua_hang
        AND u.ban_hang_bat = true
        AND u.shop_hien_thi = true
    )
  );
