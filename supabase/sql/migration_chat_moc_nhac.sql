-- =====================================================================
-- migration_chat_moc_nhac.sql
-- Tin nhắc mốc trong phòng chat (loai_tin=system + ngu_canh.loai=moc).
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- =====================================================================

ALTER TABLE public.chat_moc
  ADD COLUMN IF NOT EXISTS id_tin_tao uuid REFERENCES public.chat_tin_nhan(id) ON DELETE SET NULL;

ALTER TABLE public.chat_moc
  ADD COLUMN IF NOT EXISTS id_tin_nhac_truoc uuid REFERENCES public.chat_tin_nhan(id) ON DELETE SET NULL;

ALTER TABLE public.chat_moc
  ADD COLUMN IF NOT EXISTS id_tin_den_han uuid REFERENCES public.chat_tin_nhan(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS chat_moc_due_nhac_idx
  ON public.chat_moc (thoi_diem)
  WHERE id_tin_nhac_truoc IS NULL OR id_tin_den_han IS NULL;

COMMENT ON COLUMN public.chat_moc.id_tin_tao IS
  'Tin system báo tạo mốc trong phòng.';
COMMENT ON COLUMN public.chat_moc.id_tin_nhac_truoc IS
  'Tin system khi tới lúc nhắc trước.';
COMMENT ON COLUMN public.chat_moc.id_tin_den_han IS
  'Tin system khi tới thời điểm mốc.';

-- Poll enum còn thiếu trên một số môi trường — bổ sung an toàn.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'loai_tin_nhan_enum'
      AND e.enumlabel = 'binh_chon'
  ) THEN
    ALTER TYPE public.loai_tin_nhan_enum ADD VALUE 'binh_chon';
  END IF;
END
$$;
