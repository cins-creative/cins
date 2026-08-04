-- =====================================================================
-- migration_chat_moc_nguon.sql
-- Nguồn mốc: thủ công | theo lịch lớp (nhắc buổi học).
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'chat_moc_nguon_enum'
  ) THEN
    CREATE TYPE public.chat_moc_nguon_enum AS ENUM (
      'thu_cong',
      'lich_lop'
    );
  END IF;
END
$$;

ALTER TABLE public.chat_moc
  ADD COLUMN IF NOT EXISTS nguon public.chat_moc_nguon_enum NOT NULL DEFAULT 'thu_cong';

CREATE UNIQUE INDEX IF NOT EXISTS chat_moc_lich_lop_one_per_room
  ON public.chat_moc (id_phong)
  WHERE nguon = 'lich_lop';

COMMENT ON COLUMN public.chat_moc.nguon IS
  'thu_cong = mốc tay; lich_lop = nhắc buổi học từ org_lop_hoc.lich_hoc (1 / phòng).';
