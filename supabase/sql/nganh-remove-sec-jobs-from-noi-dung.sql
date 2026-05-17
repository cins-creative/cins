/*
  Gỡ section jobs hardcode trong noi_dung ngành (đã render từ article_lien_quan DUNG_TRONG_NGHE).

  Chạy trong Supabase → SQL Editor sau khi đã gắn nghề qua article_lien_quan.
*/

UPDATE public.article_bai_viet
SET noi_dung = regexp_replace(
  noi_dung,
  '<section\s+class=["'']sec-jobs["''][^>]*>[\s\S]*?</section>\s*',
  '',
  'gi'
)
WHERE loai_bai_viet = 'nganh_dao_tao'
  AND noi_dung IS NOT NULL
  AND noi_dung ~* 'sec-jobs';
