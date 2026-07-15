-- Thứ tự tùy chỉnh "Nội dung nổi bật" trên cột aside Journey (chỉ chủ trang sắp xếp).
-- Phạm vi: cột featured aside — không đổi sort Gallery chính.
-- Chạy: node scripts/run-user-gallery-noi-bat-migration.mjs
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.user_gallery_noi_bat (
  id_nguoi_dung uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  id_cot_moc    uuid NOT NULL REFERENCES public.content_cot_moc(id) ON DELETE CASCADE,
  thu_tu        integer NOT NULL DEFAULT 0,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_nguoi_dung, id_cot_moc)
);

CREATE INDEX IF NOT EXISTS idx_user_gallery_noi_bat_owner_thu_tu
  ON public.user_gallery_noi_bat (id_nguoi_dung, thu_tu);

COMMENT ON TABLE public.user_gallery_noi_bat IS
  'Thứ tự hiển thị Nội dung nổi bật trên cột aside Journey — chủ trang tự kéo sắp; mọi viewer đọc cùng thứ tự.';

ALTER TABLE public.user_gallery_noi_bat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_gallery_noi_bat_select ON public.user_gallery_noi_bat;
CREATE POLICY user_gallery_noi_bat_select ON public.user_gallery_noi_bat
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS user_gallery_noi_bat_insert ON public.user_gallery_noi_bat;
CREATE POLICY user_gallery_noi_bat_insert ON public.user_gallery_noi_bat
  FOR INSERT
  TO authenticated
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS user_gallery_noi_bat_update ON public.user_gallery_noi_bat;
CREATE POLICY user_gallery_noi_bat_update ON public.user_gallery_noi_bat
  FOR UPDATE
  TO authenticated
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS user_gallery_noi_bat_delete ON public.user_gallery_noi_bat;
CREATE POLICY user_gallery_noi_bat_delete ON public.user_gallery_noi_bat
  FOR DELETE
  TO authenticated
  USING (id_nguoi_dung = public.current_profile_id());
