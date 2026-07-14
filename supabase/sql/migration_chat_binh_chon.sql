-- =====================================================================
-- migration_chat_binh_chon.sql
-- Bình chọn trong phòng chat (tin loai_tin = binh_chon).
-- Idempotent.
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'loai_tin_nhan_enum'
      AND e.enumlabel = 'binh_chon'
  ) THEN
    ALTER TYPE public.loai_tin_nhan_enum ADD VALUE 'binh_chon';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.chat_binh_chon (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_phong uuid NOT NULL REFERENCES public.chat_phong(id) ON DELETE CASCADE,
  id_tin_nhan uuid NOT NULL UNIQUE REFERENCES public.chat_tin_nhan(id) ON DELETE CASCADE,
  cau_hoi text NOT NULL,
  cho_nhieu boolean NOT NULL DEFAULT false,
  id_nguoi_tao uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  tao_luc timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_binh_chon_id_phong_idx
  ON public.chat_binh_chon (id_phong);

CREATE TABLE IF NOT EXISTS public.chat_binh_chon_lua_chon (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_binh_chon uuid NOT NULL REFERENCES public.chat_binh_chon(id) ON DELETE CASCADE,
  noi_dung text NOT NULL,
  thu_tu integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS chat_binh_chon_lua_chon_poll_idx
  ON public.chat_binh_chon_lua_chon (id_binh_chon, thu_tu);

CREATE TABLE IF NOT EXISTS public.chat_binh_chon_phieu (
  id_binh_chon uuid NOT NULL REFERENCES public.chat_binh_chon(id) ON DELETE CASCADE,
  id_nguoi_dung uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_lua_chon uuid NOT NULL REFERENCES public.chat_binh_chon_lua_chon(id) ON DELETE CASCADE,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_binh_chon, id_nguoi_dung)
);

CREATE INDEX IF NOT EXISTS chat_binh_chon_phieu_lua_chon_idx
  ON public.chat_binh_chon_phieu (id_lua_chon);

COMMENT ON TABLE public.chat_binh_chon IS
  'Bình chọn gắn tin chat (loai_tin=binh_chon). MVP: mỗi người 1 phiếu.';
COMMENT ON TABLE public.chat_binh_chon_lua_chon IS
  'Các lựa chọn của một bình chọn.';
COMMENT ON TABLE public.chat_binh_chon_phieu IS
  'Phiếu bầu — 1 user / 1 bình chọn (single choice).';

ALTER TABLE public.chat_binh_chon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_binh_chon_lua_chon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_binh_chon_phieu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_binh_chon_select_member ON public.chat_binh_chon;
CREATE POLICY chat_binh_chon_select_member ON public.chat_binh_chon
  FOR SELECT TO authenticated
  USING (public.is_chat_room_member(id_phong, public.current_profile_id()));

DROP POLICY IF EXISTS chat_binh_chon_lua_chon_select_member ON public.chat_binh_chon_lua_chon;
CREATE POLICY chat_binh_chon_lua_chon_select_member ON public.chat_binh_chon_lua_chon
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_binh_chon b
      WHERE b.id = id_binh_chon
        AND public.is_chat_room_member(b.id_phong, public.current_profile_id())
    )
  );

DROP POLICY IF EXISTS chat_binh_chon_phieu_select_member ON public.chat_binh_chon_phieu;
CREATE POLICY chat_binh_chon_phieu_select_member ON public.chat_binh_chon_phieu
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_binh_chon b
      WHERE b.id = id_binh_chon
        AND public.is_chat_room_member(b.id_phong, public.current_profile_id())
    )
  );
