-- =====================================================================
-- phase1_portfolio_rls.sql
-- Portfolio RLS — content_tac_pham / content_media / user_nguoi_dung UPDATE
-- Project: ospzzzxcomrmhqrnkoiw · chạy trên BRANCH trước merge
-- Idempotent (DROP POLICY IF EXISTS + CREATE).
-- =====================================================================

-- ---- content_tac_pham -------------------------------------------------------
ALTER TABLE public.content_tac_pham ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tac_pham_select_public ON public.content_tac_pham;
CREATE POLICY tac_pham_select_public ON public.content_tac_pham
  FOR SELECT
  USING (
    che_do_hien_thi IN ('public', 'feature')
    OR id_nguoi_dung = public.current_profile_id()
  );

DROP POLICY IF EXISTS tac_pham_owner_all ON public.content_tac_pham;
CREATE POLICY tac_pham_owner_all ON public.content_tac_pham
  FOR ALL
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

-- ---- content_media ----------------------------------------------------------
ALTER TABLE public.content_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_select ON public.content_media;
CREATE POLICY media_select ON public.content_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.content_tac_pham t
      WHERE t.id = content_media.id_tac_pham
        AND (
          t.che_do_hien_thi IN ('public', 'feature')
          OR t.id_nguoi_dung = public.current_profile_id()
        )
    )
  );

DROP POLICY IF EXISTS media_owner_all ON public.content_media;
CREATE POLICY media_owner_all ON public.content_media
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.content_tac_pham t
      WHERE t.id = content_media.id_tac_pham
        AND t.id_nguoi_dung = public.current_profile_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.content_tac_pham t
      WHERE t.id = content_media.id_tac_pham
        AND t.id_nguoi_dung = public.current_profile_id()
    )
  );

-- ---- user_nguoi_dung — UPDATE chính mình ------------------------------------
ALTER TABLE public.user_nguoi_dung ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_sua_chinh_minh ON public.user_nguoi_dung;
CREATE POLICY profile_sua_chinh_minh ON public.user_nguoi_dung
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- SELECT public profile đã có (user_nguoi_dung_public_profile_select) — giữ nguyên.
