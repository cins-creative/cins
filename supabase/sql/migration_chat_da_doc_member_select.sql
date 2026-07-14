-- =====================================================================
-- migration_chat_da_doc_member_select.sql
-- Member phòng được SELECT cursor đã đọc của thành viên khác (watermark).
-- Ghi vẫn chỉ self (chat_da_doc_upsert_self). Idempotent.
-- =====================================================================

DROP POLICY IF EXISTS chat_da_doc_select_self ON public.chat_da_doc;
DROP POLICY IF EXISTS chat_da_doc_select_member ON public.chat_da_doc;

-- Member active được xem mọi cursor trong phòng (kể cả của mình).
CREATE POLICY chat_da_doc_select_member ON public.chat_da_doc
  FOR SELECT
  TO authenticated
  USING (
    public.is_chat_room_member(id_phong, public.current_profile_id())
  );

COMMENT ON POLICY chat_da_doc_select_member ON public.chat_da_doc IS
  'Thành viên phòng xem cursor đã đọc (Messenger watermark + realtime).';

-- Realtime watermark — thêm bảng nếu chưa nằm trong publication.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_da_doc'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_da_doc;
  END IF;
END
$$;
