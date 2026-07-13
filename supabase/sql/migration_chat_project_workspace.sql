-- =====================================================================
-- migration_chat_project_workspace.sql
-- Phòng project con (id_phong_cha) · ẩn/lịch sử (trang_thai)
-- · thẻ tài nguyên theo phòng · mốc timeline phòng
-- Idempotent — chạy lại an toàn.
-- =====================================================================

-- --- chat_phong: phòng con + trạng thái hiện diện -------------------------

ALTER TABLE public.chat_phong
  ADD COLUMN IF NOT EXISTS id_phong_cha uuid
    REFERENCES public.chat_phong(id) ON DELETE CASCADE;

ALTER TABLE public.chat_phong
  ADD COLUMN IF NOT EXISTS trang_thai text NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_phong_trang_thai_check'
  ) THEN
    ALTER TABLE public.chat_phong
      ADD CONSTRAINT chat_phong_trang_thai_check
      CHECK (trang_thai IN ('active', 'an'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS chat_phong_id_phong_cha_idx
  ON public.chat_phong (id_phong_cha)
  WHERE id_phong_cha IS NOT NULL;

CREATE INDEX IF NOT EXISTS chat_phong_trang_thai_idx
  ON public.chat_phong (trang_thai);

COMMENT ON COLUMN public.chat_phong.id_phong_cha IS
  'Phòng project con thuộc nhóm cha (loai_phong=nhom). NULL = phòng gốc.';
COMMENT ON COLUMN public.chat_phong.trang_thai IS
  'active = hiện danh sách/FAB; an = ẩn, còn trong lịch sử nhóm cha.';

-- Không cho phòng con có cha cũng là phòng con (1 cấp).
CREATE OR REPLACE FUNCTION public.chat_phong_assert_parent_depth()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_cha uuid;
BEGIN
  IF NEW.id_phong_cha IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.id_phong_cha = NEW.id THEN
    RAISE EXCEPTION 'id_phong_cha không được tự trỏ.';
  END IF;
  SELECT id_phong_cha INTO parent_cha
  FROM public.chat_phong
  WHERE id = NEW.id_phong_cha;
  IF parent_cha IS NOT NULL THEN
    RAISE EXCEPTION 'Chỉ cho phép 1 cấp phòng con dưới nhóm cha.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_phong_parent_depth_trg ON public.chat_phong;
CREATE TRIGGER chat_phong_parent_depth_trg
  BEFORE INSERT OR UPDATE OF id_phong_cha
  ON public.chat_phong
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_phong_assert_parent_depth();

-- --- Thẻ tài nguyên (scope = 1 phòng) ------------------------------------

CREATE TABLE IF NOT EXISTS public.chat_the_tai_nguyen (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_phong uuid NOT NULL REFERENCES public.chat_phong(id) ON DELETE CASCADE,
  ten text NOT NULL,
  slug text NOT NULL,
  mau text,
  thu_tu integer NOT NULL DEFAULT 0,
  id_nguoi_tao uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_phong, slug)
);

CREATE INDEX IF NOT EXISTS chat_the_tai_nguyen_id_phong_idx
  ON public.chat_the_tai_nguyen (id_phong, thu_tu);

CREATE TABLE IF NOT EXISTS public.chat_the_gan (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_the uuid NOT NULL REFERENCES public.chat_the_tai_nguyen(id) ON DELETE CASCADE,
  id_tin_nhan uuid NOT NULL REFERENCES public.chat_tin_nhan(id) ON DELETE CASCADE,
  id_nguoi_gan uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_the, id_tin_nhan)
);

CREATE INDEX IF NOT EXISTS chat_the_gan_id_tin_nhan_idx
  ON public.chat_the_gan (id_tin_nhan);

COMMENT ON TABLE public.chat_the_tai_nguyen IS
  'Nhãn cục bộ trong 1 phòng chat — quản lý file/URL (không dùng filter_nhan Journey).';
COMMENT ON TABLE public.chat_the_gan IS
  'Gắn thẻ tài nguyên lên tin nhắn (media hoặc có URL).';

ALTER TABLE public.chat_the_tai_nguyen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_the_gan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_the_tai_nguyen_select_member ON public.chat_the_tai_nguyen;
CREATE POLICY chat_the_tai_nguyen_select_member ON public.chat_the_tai_nguyen
  FOR SELECT TO authenticated
  USING (public.is_chat_room_member(id_phong, public.current_profile_id()));

DROP POLICY IF EXISTS chat_the_gan_select_member ON public.chat_the_gan;
CREATE POLICY chat_the_gan_select_member ON public.chat_the_gan
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_the_tai_nguyen t
      WHERE t.id = id_the
        AND public.is_chat_room_member(t.id_phong, public.current_profile_id())
    )
  );

-- --- Mốc timeline phòng --------------------------------------------------

CREATE TABLE IF NOT EXISTS public.chat_moc (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_phong uuid NOT NULL REFERENCES public.chat_phong(id) ON DELETE CASCADE,
  ten text NOT NULL,
  mo_ta text,
  thoi_diem date NOT NULL,
  url text,
  nhac_truoc_ngay integer NOT NULL DEFAULT 1,
  id_nguoi_tao uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_moc_id_phong_thoi_diem_idx
  ON public.chat_moc (id_phong, thoi_diem);

COMMENT ON TABLE public.chat_moc IS
  'Mốc làm việc của phòng chat (deadline/sync) — timeline + link + nhắc trước N ngày.';
COMMENT ON COLUMN public.chat_moc.nhac_truoc_ngay IS
  'Số ngày trước thoi_diem để nhắc (0 = đúng ngày).';

ALTER TABLE public.chat_moc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_moc_select_member ON public.chat_moc;
CREATE POLICY chat_moc_select_member ON public.chat_moc
  FOR SELECT TO authenticated
  USING (public.is_chat_room_member(id_phong, public.current_profile_id()));
