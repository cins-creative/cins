-- =====================================================================
-- phase1_content_tac_pham_linh_vuc.sql
-- Phương án B — bảng nối đa lĩnh vực + la_chinh
-- Project: ospzzzxcomrmhqrnkoiw · BRANCH trước merge
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.content_tac_pham_linh_vuc (
  id_tac_pham uuid NOT NULL REFERENCES public.content_tac_pham(id) ON DELETE CASCADE,
  id_linh_vuc uuid NOT NULL REFERENCES public.linh_vuc(id) ON DELETE CASCADE,
  la_chinh boolean NOT NULL DEFAULT false,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_tac_pham, id_linh_vuc)
);

CREATE UNIQUE INDEX IF NOT EXISTS content_tac_pham_linh_vuc_one_primary
  ON public.content_tac_pham_linh_vuc (id_tac_pham)
  WHERE la_chinh = true;

CREATE INDEX IF NOT EXISTS content_tac_pham_linh_vuc_linh_vuc_idx
  ON public.content_tac_pham_linh_vuc (id_linh_vuc);

ALTER TABLE public.content_tac_pham_linh_vuc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tplv_select ON public.content_tac_pham_linh_vuc;
CREATE POLICY tplv_select ON public.content_tac_pham_linh_vuc
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.content_tac_pham t
      WHERE t.id = content_tac_pham_linh_vuc.id_tac_pham
        AND (
          t.che_do_hien_thi IN ('public', 'feature')
          OR t.id_nguoi_dung = public.current_profile_id()
        )
    )
  );

DROP POLICY IF EXISTS tplv_owner ON public.content_tac_pham_linh_vuc;
CREATE POLICY tplv_owner ON public.content_tac_pham_linh_vuc
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.content_tac_pham t
      WHERE t.id = content_tac_pham_linh_vuc.id_tac_pham
        AND t.id_nguoi_dung = public.current_profile_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.content_tac_pham t
      WHERE t.id = content_tac_pham_linh_vuc.id_tac_pham
        AND t.id_nguoi_dung = public.current_profile_id()
    )
  );

COMMENT ON TABLE public.content_tac_pham_linh_vuc IS
  'Portfolio Phase 1 — đa lĩnh vực per tác phẩm; tối đa 1 la_chinh (unique partial).';
