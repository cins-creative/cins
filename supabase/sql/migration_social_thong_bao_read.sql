-- social_thong_bao: trạng thái đọc + thời điểm xử lý (giữ lịch sử, không xóa row)
-- Chạy trên Supabase SQL Editor (idempotent).

ALTER TABLE public.social_thong_bao
  ADD COLUMN IF NOT EXISTS da_doc BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.social_thong_bao
  ADD COLUMN IF NOT EXISTS xu_ly_luc TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_social_thong_bao_nguoi_nhan_unread
  ON public.social_thong_bao (nguoi_nhan, da_doc, tao_luc DESC)
  WHERE da_doc = false;

CREATE INDEX IF NOT EXISTS idx_social_thong_bao_nguoi_nhan_pending_action
  ON public.social_thong_bao (nguoi_nhan, tao_luc DESC)
  WHERE xu_ly_luc IS NULL
    AND loai_doi_tuong IN ('tac_gia_owner_review');

COMMENT ON COLUMN public.social_thong_bao.da_doc IS 'true = user đã xem/dismiss thông báo thông tin';
COMMENT ON COLUMN public.social_thong_bao.xu_ly_luc IS 'NOT NULL = thông báo cần hành động đã được xử lý (duyệt/từ chối)';
