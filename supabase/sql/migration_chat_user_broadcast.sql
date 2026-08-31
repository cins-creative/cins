-- L35d Phase 2 — CHƯA CHẠY. Cần user duyệt trước khi apply.
-- Policy private broadcast: authenticated chỉ SELECT topic `cins-user:<profileId>` của mình.
-- Không ALTER bảng nghiệp vụ. `chat_tin_nhan` vẫn là SoT.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'realtime'
      AND tablename = 'messages'
      AND policyname = 'cins_user_broadcast_select'
  ) THEN
    CREATE POLICY cins_user_broadcast_select
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (
        realtime.topic() = ('cins-user:' || public.current_profile_id()::text)
      );
  END IF;
END $$;
