-- =====================================================================
-- migration_chat_moc_loai_lap.sql
-- Loại lặp mốc chat: một lần | ngày | tuần | tháng | năm.
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'chat_moc_loai_lap_enum'
  ) THEN
    CREATE TYPE public.chat_moc_loai_lap_enum AS ENUM (
      'mot_lan',
      'ngay',
      'tuan',
      'thang',
      'nam'
    );
  END IF;
END
$$;

ALTER TABLE public.chat_moc
  ADD COLUMN IF NOT EXISTS loai_lap public.chat_moc_loai_lap_enum NOT NULL DEFAULT 'mot_lan';

COMMENT ON COLUMN public.chat_moc.loai_lap IS
  'Chu kỳ nhắc: mot_lan | ngay | tuan | thang | nam. Sau đến hạn, mốc lặp nhảy thoi_diem kỳ kế tiếp.';
