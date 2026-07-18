-- Snapshot chấp nhận rủi ro chuyển khoản của người mua (L33).
-- Bằng chứng khi complain "hồi đó tôi đâu thấy bảng này?".

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS nguoi_mua_chap_nhan_luc timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_mua_chap_nhan_van_ban text,
  ADD COLUMN IF NOT EXISTS nguoi_mua_chap_nhan_phien_ban text;

COMMENT ON COLUMN public.shop_don_hang.nguoi_mua_chap_nhan_luc IS
  'Thời điểm người mua tick chấp nhận rủi ro chuyển khoản (mua_ngay).';
COMMENT ON COLUMN public.shop_don_hang.nguoi_mua_chap_nhan_van_ban IS
  'Nguyên văn disclaimer đã chấp nhận (snapshot).';
COMMENT ON COLUMN public.shop_don_hang.nguoi_mua_chap_nhan_phien_ban IS
  'Phiên bản copy disclaimer (vd. 2026-07-18).';

CREATE INDEX IF NOT EXISTS idx_shop_don_chap_nhan
  ON public.shop_don_hang (nguoi_mua_chap_nhan_luc DESC NULLS LAST)
  WHERE nguoi_mua_chap_nhan_luc IS NOT NULL;
