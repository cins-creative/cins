-- Chat message actions: sửa tin, ghim, reaction trên tin nhắn.
-- Chạy Supabase SQL Editor sau migration_chat_rls.sql (idempotent).

ALTER TABLE public.chat_tin_nhan
  ADD COLUMN IF NOT EXISTS sua_luc timestamptz,
  ADD COLUMN IF NOT EXISTS da_sua boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.chat_ghim (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_phong uuid NOT NULL REFERENCES public.chat_phong(id) ON DELETE CASCADE,
  id_tin_nhan uuid NOT NULL REFERENCES public.chat_tin_nhan(id) ON DELETE CASCADE,
  id_nguoi_ghim uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  ghim_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_phong, id_tin_nhan)
);

CREATE INDEX IF NOT EXISTS chat_ghim_id_phong_idx ON public.chat_ghim (id_phong);

ALTER TYPE public.loai_doi_tuong_social_enum ADD VALUE IF NOT EXISTS 'chat_tin_nhan';

ALTER TABLE public.chat_ghim ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_ghim_select_member ON public.chat_ghim;
CREATE POLICY chat_ghim_select_member ON public.chat_ghim
  FOR SELECT
  TO authenticated
  USING (public.is_chat_room_member(id_phong, public.current_profile_id()));

DROP POLICY IF EXISTS chat_tin_nhan_update_own ON public.chat_tin_nhan;
CREATE POLICY chat_tin_nhan_update_own ON public.chat_tin_nhan
  FOR UPDATE
  TO authenticated
  USING (
    id_nguoi_gui = public.current_profile_id()
    AND public.is_chat_room_member(id_phong, public.current_profile_id())
  )
  WITH CHECK (
    id_nguoi_gui = public.current_profile_id()
    AND public.is_chat_room_member(id_phong, public.current_profile_id())
  );

COMMENT ON TABLE public.chat_ghim IS 'Tin nhắn ghim trong phòng chat (mọi thành viên thấy)';
