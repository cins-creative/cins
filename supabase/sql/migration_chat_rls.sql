-- Chat 1-1 user ↔ user — RLS cơ bản (chạy Supabase SQL Editor, idempotent).
-- Phụ thuộc: public.current_profile_id() từ migration_cong_dong.sql

CREATE OR REPLACE FUNCTION public.is_chat_room_member(p_room uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_thanh_vien tv
    WHERE tv.id_phong = p_room
      AND tv.id_nguoi_dung = p_user
      AND tv.roi_luc IS NULL
  );
$$;

ALTER TABLE public.chat_phong ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thanh_vien ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_tin_nhan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_da_doc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_phong_select_member ON public.chat_phong;
CREATE POLICY chat_phong_select_member ON public.chat_phong
  FOR SELECT
  TO authenticated
  USING (
    public.is_chat_room_member(id, public.current_profile_id())
  );

DROP POLICY IF EXISTS chat_thanh_vien_select_member ON public.chat_thanh_vien;
CREATE POLICY chat_thanh_vien_select_member ON public.chat_thanh_vien
  FOR SELECT
  TO authenticated
  USING (
    public.is_chat_room_member(id_phong, public.current_profile_id())
  );

DROP POLICY IF EXISTS chat_tin_nhan_select_member ON public.chat_tin_nhan;
CREATE POLICY chat_tin_nhan_select_member ON public.chat_tin_nhan
  FOR SELECT
  TO authenticated
  USING (
    public.is_chat_room_member(id_phong, public.current_profile_id())
  );

DROP POLICY IF EXISTS chat_tin_nhan_insert_member ON public.chat_tin_nhan;
CREATE POLICY chat_tin_nhan_insert_member ON public.chat_tin_nhan
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id_nguoi_gui = public.current_profile_id()
    AND public.is_chat_room_member(id_phong, public.current_profile_id())
  );

DROP POLICY IF EXISTS chat_da_doc_select_self ON public.chat_da_doc;
CREATE POLICY chat_da_doc_select_self ON public.chat_da_doc
  FOR SELECT
  TO authenticated
  USING (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS chat_da_doc_upsert_self ON public.chat_da_doc;
CREATE POLICY chat_da_doc_upsert_self ON public.chat_da_doc
  FOR ALL
  TO authenticated
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (
    id_nguoi_dung = public.current_profile_id()
    AND public.is_chat_room_member(id_phong, public.current_profile_id())
  );

COMMENT ON FUNCTION public.is_chat_room_member IS 'Thành viên phòng chat còn active (roi_luc IS NULL)';
