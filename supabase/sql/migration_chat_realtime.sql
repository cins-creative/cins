-- Bật Supabase Realtime cho chat_tin_nhan (chạy SQL Editor, idempotent).
-- Phụ thuộc: migration_chat_rls.sql (RLS SELECT member).

ALTER TABLE public.chat_tin_nhan REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_tin_nhan'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_tin_nhan;
  END IF;
END $$;

COMMENT ON TABLE public.chat_tin_nhan IS 'Tin nhắn chat — Realtime INSERT cho thành viên phòng (RLS)';
