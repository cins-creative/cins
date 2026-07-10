-- Đóng góp nội dung canonical (entity article) — bản thảo song song + curator promote.
-- Tách biệt Journey/content_cot_moc. Chạy Supabase SQL Editor hoặc scripts/run-article-dong-gop-migration.mjs (idempotent).
-- Project: ospzzzxcomrmhqrnkoiw

-- ---------------------------------------------------------------------------
-- Cache attribution trên bài entity chính
-- ---------------------------------------------------------------------------
ALTER TABLE public.article_bai_viet
  ADD COLUMN IF NOT EXISTS id_tac_gia_chinh uuid
    REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL;

ALTER TABLE public.article_bai_viet
  ADD COLUMN IF NOT EXISTS so_nguoi_dong_gop integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.article_bai_viet.id_tac_gia_chinh IS
  'Tác giả chính canonical hiện tại (cache — nguồn: article_tac_gia.la_hien_tai).';
COMMENT ON COLUMN public.article_bai_viet.so_nguoi_dong_gop IS
  'Số contributor từng có bản được duyệt (cache).';

-- ---------------------------------------------------------------------------
-- Bản đóng góp (1 row = 1 user × 1 entity)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.article_dong_gop (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_bai_viet       uuid NOT NULL REFERENCES public.article_bai_viet(id) ON DELETE CASCADE,
  id_nguoi_dong_gop uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  noi_dung          text,
  trang_thai        text NOT NULL DEFAULT 'nhap'
    CHECK (trang_thai IN ('nhap', 'cho_duyet', 'duoc_duyet', 'tu_choi', 'can_sua')),
  ghi_chu_duyet     text,
  id_nguoi_duyet    uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  tao_luc           timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc      timestamptz NOT NULL DEFAULT now(),
  duyet_luc         timestamptz,
  da_xoa            boolean NOT NULL DEFAULT false,
  hien_thi          boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.article_dong_gop IS
  'Bản thảo đóng góp canonical per entity — mỗi user một bài riêng, curator promote.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_article_dong_gop_one_per_user_entity
  ON public.article_dong_gop (id_bai_viet, id_nguoi_dong_gop)
  WHERE da_xoa = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_article_dong_gop_one_pending_per_user
  ON public.article_dong_gop (id_bai_viet, id_nguoi_dong_gop)
  WHERE trang_thai = 'cho_duyet' AND da_xoa = false;

CREATE INDEX IF NOT EXISTS idx_article_dong_gop_bai_viet_list
  ON public.article_dong_gop (id_bai_viet, trang_thai, cap_nhat_luc DESC)
  WHERE da_xoa = false;

CREATE INDEX IF NOT EXISTS idx_article_dong_gop_cho_duyet
  ON public.article_dong_gop (trang_thai, cap_nhat_luc DESC)
  WHERE trang_thai = 'cho_duyet' AND da_xoa = false;

-- ---------------------------------------------------------------------------
-- Attribution lịch sử
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.article_tac_gia (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_bai_viet   uuid NOT NULL REFERENCES public.article_bai_viet(id) ON DELETE CASCADE,
  id_nguoi_dung uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_dong_gop   uuid REFERENCES public.article_dong_gop(id) ON DELETE SET NULL,
  vai_tro       text NOT NULL DEFAULT 'dong_gop'
    CHECK (vai_tro IN ('tac_gia_chinh', 'dong_gop')),
  la_hien_tai   boolean NOT NULL DEFAULT false,
  tao_luc       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.article_tac_gia IS
  'Lịch sử tác giả/đóng góp canonical per entity.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_article_tac_gia_one_current
  ON public.article_tac_gia (id_bai_viet)
  WHERE la_hien_tai = true;

CREATE INDEX IF NOT EXISTS idx_article_tac_gia_bai_viet
  ON public.article_tac_gia (id_bai_viet, tao_luc DESC);

-- ---------------------------------------------------------------------------
-- Curator theo phạm vi (bổ sung user_quyen_he_thong.curator toàn cục)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.article_quyen_tham_dinh (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_dung uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  pham_vi       text NOT NULL
    CHECK (pham_vi IN ('toan_cuc', 'linh_vuc', 'bai_viet')),
  id_linh_vuc   uuid REFERENCES public.linh_vuc(id) ON DELETE CASCADE,
  id_bai_viet   uuid REFERENCES public.article_bai_viet(id) ON DELETE CASCADE,
  cap_boi       uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  da_xoa        boolean NOT NULL DEFAULT false,
  CONSTRAINT article_quyen_tham_dinh_pham_vi_fk CHECK (
    (pham_vi = 'toan_cuc' AND id_linh_vuc IS NULL AND id_bai_viet IS NULL)
    OR (pham_vi = 'linh_vuc' AND id_linh_vuc IS NOT NULL AND id_bai_viet IS NULL)
    OR (pham_vi = 'bai_viet' AND id_bai_viet IS NOT NULL)
  )
);

COMMENT ON TABLE public.article_quyen_tham_dinh IS
  'Curator thẩm định đóng góp canonical — phạm vi toàn cục / lĩnh vực / một entity.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_article_quyen_tham_dinh_toan_cuc
  ON public.article_quyen_tham_dinh (id_nguoi_dung)
  WHERE pham_vi = 'toan_cuc' AND da_xoa = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_article_quyen_tham_dinh_linh_vuc
  ON public.article_quyen_tham_dinh (id_nguoi_dung, id_linh_vuc)
  WHERE pham_vi = 'linh_vuc' AND da_xoa = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_article_quyen_tham_dinh_bai_viet
  ON public.article_quyen_tham_dinh (id_nguoi_dung, id_bai_viet)
  WHERE pham_vi = 'bai_viet' AND da_xoa = false;

-- ---------------------------------------------------------------------------
-- Helper: curator cho một entity
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_article_curator_for_bai_viet(
  p_user uuid,
  p_bai_viet uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.article_quyen_tham_dinh q
    WHERE q.id_nguoi_dung = p_user
      AND q.da_xoa = false
      AND (
        q.pham_vi = 'toan_cuc'
        OR (
          q.pham_vi = 'bai_viet'
          AND q.id_bai_viet = p_bai_viet
        )
        OR (
          q.pham_vi = 'linh_vuc'
          AND q.id_linh_vuc = (
            SELECT abv.id_linh_vuc
            FROM public.article_bai_viet abv
            WHERE abv.id = p_bai_viet
          )
        )
      )
  );
$$;

COMMENT ON FUNCTION public.is_article_curator_for_bai_viet IS
  'User có quyền thẩm định đóng góp cho entity article (scoped curator).';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.article_dong_gop ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tac_gia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_quyen_tham_dinh ENABLE ROW LEVEL SECURITY;

-- article_dong_gop: đọc bản public
DROP POLICY IF EXISTS article_dong_gop_select_public ON public.article_dong_gop;
CREATE POLICY article_dong_gop_select_public ON public.article_dong_gop
  FOR SELECT
  TO anon, authenticated
  USING (hien_thi = true AND da_xoa = false);

-- article_dong_gop: chủ bản luôn đọc được bản của mình
DROP POLICY IF EXISTS article_dong_gop_select_own ON public.article_dong_gop;
CREATE POLICY article_dong_gop_select_own ON public.article_dong_gop
  FOR SELECT
  TO authenticated
  USING (id_nguoi_dong_gop = public.current_profile_id());

-- article_dong_gop: tạo bản của mình
DROP POLICY IF EXISTS article_dong_gop_insert_own ON public.article_dong_gop;
CREATE POLICY article_dong_gop_insert_own ON public.article_dong_gop
  FOR INSERT
  TO authenticated
  WITH CHECK (id_nguoi_dong_gop = public.current_profile_id());

-- article_dong_gop: sửa bản của mình (không cho sửa sau khi đã duoc_duyet)
DROP POLICY IF EXISTS article_dong_gop_update_own ON public.article_dong_gop;
CREATE POLICY article_dong_gop_update_own ON public.article_dong_gop
  FOR UPDATE
  TO authenticated
  USING (
    id_nguoi_dong_gop = public.current_profile_id()
    AND da_xoa = false
    AND trang_thai <> 'duoc_duyet'
  )
  WITH CHECK (id_nguoi_dong_gop = public.current_profile_id());

-- article_tac_gia: đọc công khai
DROP POLICY IF EXISTS article_tac_gia_select_public ON public.article_tac_gia;
CREATE POLICY article_tac_gia_select_public ON public.article_tac_gia
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- article_quyen_tham_dinh + mutation curator/promote: chỉ service role (không policy client)
