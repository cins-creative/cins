/*
  CINs — Mở quyền đọc public.article_gan_nhom (hub /nghe-nghiep: bài nghe → article_nhom)

  Schema: PK (id_bai_viet, id_nhom), index idx_gan_nhom_bai / idx_gan_nhom_nhom.
  Chạy trong Supabase → SQL Editor. An toàn chạy lại (DROP POLICY IF EXISTS).
*/

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.article_gan_nhom TO anon, authenticated;
GRANT SELECT ON TABLE public.article_gan_nhom TO service_role;

ALTER TABLE public.article_gan_nhom ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "article_gan_nhom_public_select" ON public.article_gan_nhom;

CREATE POLICY "article_gan_nhom_public_select"
  ON public.article_gan_nhom
  FOR SELECT
  TO anon, authenticated
  USING (true);
