/*
  CINs — Mở quyền đọc public.article_nhom (hub /nghe-nghiep nhóm theo ten / mo_ta)

  Chạy trong Supabase → SQL Editor. An toàn chạy lại (DROP POLICY IF EXISTS).
*/

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.article_nhom TO anon, authenticated;
GRANT SELECT ON TABLE public.article_nhom TO service_role;

ALTER TABLE public.article_nhom ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "article_nhom_public_select" ON public.article_nhom;

CREATE POLICY "article_nhom_public_select"
  ON public.article_nhom
  FOR SELECT
  TO anon, authenticated
  USING (true);
