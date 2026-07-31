-- =====================================================================
-- phase5_filter_tac_pham.sql
-- Mở rộng filter_doi_tuong_enum để gắn bộ sưu tập cá nhân lên tac_pham
-- Chạy trên BRANCH · gen types sau merge
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'filter_doi_tuong_enum'
      AND e.enumlabel = 'tac_pham'
  ) THEN
    ALTER TYPE public.filter_doi_tuong_enum ADD VALUE 'tac_pham';
  END IF;
END $$;
