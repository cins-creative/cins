-- Bình luận góp ý trên bản đóng góp canonical (tab Đóng góp).
-- Tách biệt social_binh_luan / Journey. Chạy scripts/run-article-dong-gop-comments-migration.mjs.
-- Project: ospzzzxcomrmhqrnkoiw

CREATE TABLE IF NOT EXISTS public.article_dong_gop_binh_luan (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_dong_gop       uuid NOT NULL REFERENCES public.article_dong_gop(id) ON DELETE CASCADE,
  id_nguoi_binh_luan uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_cha            uuid REFERENCES public.article_dong_gop_binh_luan(id) ON DELETE CASCADE,
  noi_dung          text NOT NULL,
  tao_luc           timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc      timestamptz NOT NULL DEFAULT now(),
  da_xoa            boolean NOT NULL DEFAULT false,
  CONSTRAINT article_dong_gop_binh_luan_noi_dung_nonempty CHECK (char_length(trim(noi_dung)) > 0)
);

COMMENT ON TABLE public.article_dong_gop_binh_luan IS
  'Góp ý constructive trên bản đóng góp entity — thread per draft.';

CREATE INDEX IF NOT EXISTS idx_article_dong_gop_binh_luan_dong_gop
  ON public.article_dong_gop_binh_luan (id_dong_gop, tao_luc ASC)
  WHERE da_xoa = false;

CREATE INDEX IF NOT EXISTS idx_article_dong_gop_binh_luan_cha
  ON public.article_dong_gop_binh_luan (id_cha)
  WHERE id_cha IS NOT NULL AND da_xoa = false;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.article_dong_gop_binh_luan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS article_dong_gop_binh_luan_select ON public.article_dong_gop_binh_luan;
CREATE POLICY article_dong_gop_binh_luan_select ON public.article_dong_gop_binh_luan
  FOR SELECT
  TO anon, authenticated
  USING (
    da_xoa = false
    AND EXISTS (
      SELECT 1
      FROM public.article_dong_gop dg
      WHERE dg.id = article_dong_gop_binh_luan.id_dong_gop
        AND dg.da_xoa = false
        AND dg.hien_thi = true
        AND (
          dg.trang_thai <> 'nhap'
          OR dg.id_nguoi_dong_gop = public.current_profile_id()
        )
    )
  );

DROP POLICY IF EXISTS article_dong_gop_binh_luan_insert ON public.article_dong_gop_binh_luan;
CREATE POLICY article_dong_gop_binh_luan_insert ON public.article_dong_gop_binh_luan
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id_nguoi_binh_luan = public.current_profile_id()
    AND EXISTS (
      SELECT 1
      FROM public.article_dong_gop dg
      WHERE dg.id = article_dong_gop_binh_luan.id_dong_gop
        AND dg.da_xoa = false
        AND dg.hien_thi = true
        AND dg.trang_thai <> 'nhap'
    )
  );

DROP POLICY IF EXISTS article_dong_gop_binh_luan_update_own ON public.article_dong_gop_binh_luan;
CREATE POLICY article_dong_gop_binh_luan_update_own ON public.article_dong_gop_binh_luan
  FOR UPDATE
  TO authenticated
  USING (id_nguoi_binh_luan = public.current_profile_id())
  WITH CHECK (id_nguoi_binh_luan = public.current_profile_id());
