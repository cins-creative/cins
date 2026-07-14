-- =====================================================================
-- migration_chat_moc_datetime.sql
-- Mốc chat: thoi_diem date → timestamptz; nhắc trước theo phút.
-- Idempotent. Chạy thủ công trên Supabase SQL Editor (CINs).
-- =====================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_moc'
      AND column_name = 'thoi_diem'
      AND data_type = 'date'
  ) THEN
    ALTER TABLE public.chat_moc
      ALTER COLUMN thoi_diem TYPE timestamptz
      USING ((thoi_diem::text || ' 00:00:00')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh');
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_moc'
      AND column_name = 'nhac_truoc_ngay'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_moc'
      AND column_name = 'nhac_truoc_phut'
  ) THEN
    ALTER TABLE public.chat_moc
      ADD COLUMN nhac_truoc_phut integer;

    UPDATE public.chat_moc
    SET nhac_truoc_phut = GREATEST(0, nhac_truoc_ngay) * 1440;

    ALTER TABLE public.chat_moc
      ALTER COLUMN nhac_truoc_phut SET DEFAULT 1440;

    UPDATE public.chat_moc
    SET nhac_truoc_phut = 1440
    WHERE nhac_truoc_phut IS NULL;

    ALTER TABLE public.chat_moc
      ALTER COLUMN nhac_truoc_phut SET NOT NULL;

    ALTER TABLE public.chat_moc
      DROP COLUMN nhac_truoc_ngay;
  END IF;
END
$$;

COMMENT ON COLUMN public.chat_moc.thoi_diem IS
  'Thời điểm mốc (ngày + giờ tuỳ chọn).';
COMMENT ON COLUMN public.chat_moc.nhac_truoc_phut IS
  'Số phút trước thoi_diem để nhắc (0 = đúng lúc). UI chọn ngày/giờ/phút.';
