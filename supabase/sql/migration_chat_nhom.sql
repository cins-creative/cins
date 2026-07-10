-- =====================================================================
-- migration_chat_nhom.sql
-- Nhóm chat bạn bè: loai_phong = 'nhom', tên nhóm tùy chọn trên chat_phong.
-- An toàn chạy lại nhiều lần (idempotent).
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'loai_phong_chat_enum'
      AND e.enumlabel = 'nhom'
  ) THEN
    ALTER TYPE public.loai_phong_chat_enum ADD VALUE 'nhom';
  END IF;
END
$$;

ALTER TABLE public.chat_phong
  ADD COLUMN IF NOT EXISTS ten_phong text;

COMMENT ON COLUMN public.chat_phong.ten_phong IS
  'Tên hiển thị nhóm chat (loai_phong = nhom). NULL = tự sinh từ tên thành viên.';
