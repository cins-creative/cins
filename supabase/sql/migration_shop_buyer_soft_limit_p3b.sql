-- P3b: Soft-limit spam đơn buyer (tham số admin).
ALTER TABLE public.cins_cau_hinh_tai_chinh
  ADD COLUMN IF NOT EXISTS buyer_toi_da_don_cho_xac_nhan int
    CHECK (
      buyer_toi_da_don_cho_xac_nhan IS NULL
      OR buyer_toi_da_don_cho_xac_nhan >= 0
    ),
  ADD COLUMN IF NOT EXISTS buyer_toi_da_don_moi_ngay int
    CHECK (
      buyer_toi_da_don_moi_ngay IS NULL OR buyer_toi_da_don_moi_ngay >= 0
    ),
  ADD COLUMN IF NOT EXISTS buyer_toi_da_don_cho_xac_nhan_moi_shop int
    CHECK (
      buyer_toi_da_don_cho_xac_nhan_moi_shop IS NULL
      OR buyer_toi_da_don_cho_xac_nhan_moi_shop >= 0
    );

COMMENT ON COLUMN public.cins_cau_hinh_tai_chinh.buyer_toi_da_don_cho_xac_nhan IS
  'P3b: tối đa đơn cho_xac_nhan đang mở / buyer (toàn hệ). 0 = tắt.';
COMMENT ON COLUMN public.cins_cau_hinh_tai_chinh.buyer_toi_da_don_moi_ngay IS
  'P3b: tối đa đơn mới / buyer / ngày VN. 0 = tắt.';
COMMENT ON COLUMN public.cins_cau_hinh_tai_chinh.buyer_toi_da_don_cho_xac_nhan_moi_shop IS
  'P3b: tối đa cho_xac_nhan mở / buyer / shop. 0 = tắt.';
