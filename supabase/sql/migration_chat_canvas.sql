-- =====================================================================
-- migration_chat_canvas.sql
-- Canvas ý tưởng theo phòng chat (L34):
--   chat_canvas       — board (1 hoặc nhiều / phòng; MVP dùng 1 mặc định)
--   chat_canvas_node  — block trên board (ảnh/link trỏ tin, sticky, frame, connector)
--   chat_canvas_tin_an— tin bị ẩn khỏi canvas (không xóa tin gốc)
-- Phụ thuộc: public.is_chat_room_member(), public.current_profile_id()
--   (migration_chat_rls.sql + migration_cong_dong.sql)
-- Idempotent — chạy lại an toàn. Chạy trên Supabase SQL Editor (CINS).
-- =====================================================================

-- --- Helper: thành viên phòng có vai trò quản trị (owner | admin) --------

CREATE OR REPLACE FUNCTION public.is_chat_room_admin(p_room uuid, p_user uuid)
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
      AND tv.vai_tro IN ('owner', 'admin')
  );
$$;

COMMENT ON FUNCTION public.is_chat_room_admin IS
  'Thành viên phòng chat còn active với vai trò owner/admin.';

-- --- Trigger dùng chung: bump cap_nhat_luc -------------------------------

CREATE OR REPLACE FUNCTION public.chat_canvas_touch_cap_nhat_luc()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.cap_nhat_luc := now();
  RETURN NEW;
END;
$$;

-- --- Bảng board ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.chat_canvas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_phong uuid NOT NULL REFERENCES public.chat_phong(id) ON DELETE CASCADE,
  ten text NOT NULL DEFAULT 'Bảng ý tưởng',
  mo_ta text,
  trang_thai text NOT NULL DEFAULT 'active',
  id_nguoi_tao uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_canvas_trang_thai_check'
  ) THEN
    ALTER TABLE public.chat_canvas
      ADD CONSTRAINT chat_canvas_trang_thai_check
      CHECK (trang_thai IN ('active', 'khoa', 'an'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS chat_canvas_id_phong_idx
  ON public.chat_canvas (id_phong, trang_thai);

COMMENT ON TABLE public.chat_canvas IS
  'Board ý tưởng của phòng chat — chứa các block trỏ về tin nhắn + node tự tạo.';
COMMENT ON COLUMN public.chat_canvas.trang_thai IS
  'active = đang dùng; khoa = khóa chỉnh (chỉ owner/admin sửa); an = ẩn/lưu trữ.';

DROP TRIGGER IF EXISTS chat_canvas_touch_trg ON public.chat_canvas;
CREATE TRIGGER chat_canvas_touch_trg
  BEFORE UPDATE ON public.chat_canvas
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_canvas_touch_cap_nhat_luc();

-- --- Bảng node -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.chat_canvas_node (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_canvas uuid NOT NULL REFERENCES public.chat_canvas(id) ON DELETE CASCADE,
  loai text NOT NULL,
  id_tin_nhan uuid REFERENCES public.chat_tin_nhan(id) ON DELETE CASCADE,
  url text,
  noi_dung text,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  id_nguoi_tao uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_canvas_node_loai_check'
  ) THEN
    ALTER TABLE public.chat_canvas_node
      ADD CONSTRAINT chat_canvas_node_loai_check
      CHECK (loai IN ('anh', 'link', 'sticky', 'frame', 'connector'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS chat_canvas_node_id_canvas_idx
  ON public.chat_canvas_node (id_canvas);

-- 1 tin nhắn ⇒ tối đa 1 node auto-import / board (đồng bộ idempotent).
-- Index UNIQUE thường (không partial) để supabase-js upsert onConflict target được.
-- Postgres mặc định NULLS DISTINCT ⇒ nhiều node tự tạo (id_tin_nhan NULL) vẫn hợp lệ.
DROP INDEX IF EXISTS public.chat_canvas_node_canvas_tin_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS chat_canvas_node_canvas_tin_uidx
  ON public.chat_canvas_node (id_canvas, id_tin_nhan);

CREATE INDEX IF NOT EXISTS chat_canvas_node_id_tin_nhan_idx
  ON public.chat_canvas_node (id_tin_nhan)
  WHERE id_tin_nhan IS NOT NULL;

COMMENT ON TABLE public.chat_canvas_node IS
  'Block trên canvas. anh/link trỏ chat_tin_nhan (id_tin_nhan); sticky/frame/connector tự tạo.';
COMMENT ON COLUMN public.chat_canvas_node.layout IS
  'jsonb: x,y,w,h,z,rotation,mau,groupId; connector thêm from/to (id node).';

DROP TRIGGER IF EXISTS chat_canvas_node_touch_trg ON public.chat_canvas_node;
CREATE TRIGGER chat_canvas_node_touch_trg
  BEFORE UPDATE ON public.chat_canvas_node
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_canvas_touch_cap_nhat_luc();

-- --- Bảng tin ẩn khỏi canvas --------------------------------------------

CREATE TABLE IF NOT EXISTS public.chat_canvas_tin_an (
  id_canvas uuid NOT NULL REFERENCES public.chat_canvas(id) ON DELETE CASCADE,
  id_tin_nhan uuid NOT NULL REFERENCES public.chat_tin_nhan(id) ON DELETE CASCADE,
  id_nguoi_an uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_canvas, id_tin_nhan)
);

COMMENT ON TABLE public.chat_canvas_tin_an IS
  'Tin bị ẩn khỏi auto-import canvas (không xóa tin gốc trong chat_tin_nhan).';

-- --- RLS: SELECT theo thành viên phòng (ghi qua service-role ở lib) -------

ALTER TABLE public.chat_canvas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_canvas_node ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_canvas_tin_an ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_canvas_select_member ON public.chat_canvas;
CREATE POLICY chat_canvas_select_member ON public.chat_canvas
  FOR SELECT TO authenticated
  USING (public.is_chat_room_member(id_phong, (SELECT public.current_profile_id())));

DROP POLICY IF EXISTS chat_canvas_node_select_member ON public.chat_canvas_node;
CREATE POLICY chat_canvas_node_select_member ON public.chat_canvas_node
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_canvas c
      WHERE c.id = id_canvas
        AND public.is_chat_room_member(c.id_phong, (SELECT public.current_profile_id()))
    )
  );

DROP POLICY IF EXISTS chat_canvas_tin_an_select_member ON public.chat_canvas_tin_an;
CREATE POLICY chat_canvas_tin_an_select_member ON public.chat_canvas_tin_an
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_canvas c
      WHERE c.id = id_canvas
        AND public.is_chat_room_member(c.id_phong, (SELECT public.current_profile_id()))
    )
  );
