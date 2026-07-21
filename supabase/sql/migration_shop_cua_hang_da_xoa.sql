-- Soft-delete cửa hàng UGC (`da_xoa`) — không hard-delete row.
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.

ALTER TABLE public.shop_cua_hang
  ADD COLUMN IF NOT EXISTS da_xoa boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.shop_cua_hang.da_xoa IS
  'Soft-delete mặt tiền cửa hàng. True = ẩn / không dùng; giữ row + STK + lịch sử.';

CREATE INDEX IF NOT EXISTS idx_shop_cua_hang_owner_active
  ON public.shop_cua_hang (id_nguoi_dung)
  WHERE da_xoa = false;

-- Public SELECT: chỉ cửa hàng chưa soft-delete.
DROP POLICY IF EXISTS shop_cua_hang_doc_cong_khai ON public.shop_cua_hang;
CREATE POLICY shop_cua_hang_doc_cong_khai ON public.shop_cua_hang
  FOR SELECT
  USING (
    da_xoa = false
    AND EXISTS (
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
        AND c.da_xoa = false
        AND u.ban_hang_bat = true
        AND u.shop_hien_thi = true
    )
  );
