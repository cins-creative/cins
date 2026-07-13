-- =====================================================================
-- migration_chat_nhom_moi.sql
-- Mã mời nhóm chat + yêu cầu xin gia nhập.
-- Idempotent.
-- =====================================================================

ALTER TABLE public.chat_phong
  ADD COLUMN IF NOT EXISTS ma_moi text;

COMMENT ON COLUMN public.chat_phong.ma_moi IS
  'Mã mời nhóm (loai_phong = nhom). NULL = chưa tạo link. Không phải discovery công khai.';

CREATE UNIQUE INDEX IF NOT EXISTS chat_phong_ma_moi_uidx
  ON public.chat_phong (ma_moi)
  WHERE ma_moi IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.chat_yeu_cau_tham_gia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_phong uuid NOT NULL REFERENCES public.chat_phong(id) ON DELETE CASCADE,
  id_nguoi_dung uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  trang_thai text NOT NULL DEFAULT 'pending'
    CHECK (trang_thai IN ('pending', 'accepted', 'rejected')),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  xu_ly_luc timestamptz,
  CONSTRAINT chat_yeu_cau_tham_gia_phong_user_uidx UNIQUE (id_phong, id_nguoi_dung)
);

COMMENT ON TABLE public.chat_yeu_cau_tham_gia IS
  'Xin gia nhập nhóm chat qua link mã mời — admin duyệt.';

CREATE INDEX IF NOT EXISTS chat_yeu_cau_tham_gia_phong_pending_idx
  ON public.chat_yeu_cau_tham_gia (id_phong)
  WHERE trang_thai = 'pending';

ALTER TABLE public.chat_yeu_cau_tham_gia ENABLE ROW LEVEL SECURITY;
