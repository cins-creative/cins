/*
  CINs — Mở quyền đọc public.article_lien_quan (trang ngành: môn DUNG_TRONG_NGANH)

  Chiều quan hệ DUNG_TRONG_NGANH:
    id_bai_viet_a = môn học (mon_hoc)
    id_bai_viet_b = ngành đào tạo (nganh_dao_tao)

  Query frontend: WHERE id_bai_viet_b = [id_nganh] AND loai_quan_he = 'DUNG_TRONG_NGANH'

  Chạy trong Supabase → SQL Editor. An toàn chạy lại (DROP POLICY IF EXISTS).
*/

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.article_lien_quan TO anon, authenticated;
GRANT SELECT ON TABLE public.article_lien_quan TO service_role;

ALTER TABLE public.article_lien_quan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "article_lien_quan_public_select" ON public.article_lien_quan;

CREATE POLICY "article_lien_quan_public_select"
  ON public.article_lien_quan
  FOR SELECT
  TO anon, authenticated
  USING (true);
