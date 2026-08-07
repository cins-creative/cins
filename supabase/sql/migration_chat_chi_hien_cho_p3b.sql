-- P3b #8: tin chat một phía — chỉ thành viên trong mảng thấy tin.
-- NULL = mọi thành viên phòng (hành vi cũ).
ALTER TABLE public.chat_tin_nhan
  ADD COLUMN IF NOT EXISTS chi_hien_cho uuid[] NULL;

COMMENT ON COLUMN public.chat_tin_nhan.chi_hien_cho IS
  'P3b: nếu không NULL, chỉ các user_id trong mảng được SELECT / hiện tin. NULL = cả phòng.';

CREATE INDEX IF NOT EXISTS chat_tin_nhan_chi_hien_cho_gin
  ON public.chat_tin_nhan USING gin (chi_hien_cho)
  WHERE chi_hien_cho IS NOT NULL;

-- RLS: thành viên phòng + (không giới hạn OR viewer ∈ chi_hien_cho)
DROP POLICY IF EXISTS chat_tin_nhan_select_member ON public.chat_tin_nhan;
CREATE POLICY chat_tin_nhan_select_member ON public.chat_tin_nhan
  FOR SELECT
  TO authenticated
  USING (
    public.is_chat_room_member(id_phong, public.current_profile_id())
    AND (
      chi_hien_cho IS NULL
      OR public.current_profile_id() = ANY (chi_hien_cho)
    )
  );
