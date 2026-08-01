-- article_gan_linh_vuc: M:N bài viết (nghe) ↔ lĩnh vực
-- Idempotent — chạy: node scripts/run-article-gan-linh-vuc-migration.mjs
--
-- Giữ article_bai_viet.id_linh_vuc = lĩnh vực chính (la_chinh), dual-write.
-- Không ALTER / drop cột cũ.

CREATE TABLE IF NOT EXISTS public.article_gan_linh_vuc (
  id_bai_viet uuid NOT NULL REFERENCES public.article_bai_viet(id) ON DELETE CASCADE,
  id_linh_vuc uuid NOT NULL REFERENCES public.linh_vuc(id) ON DELETE CASCADE,
  la_chinh    boolean NOT NULL DEFAULT false,
  thu_tu      integer NOT NULL DEFAULT 0,
  tao_luc     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_bai_viet, id_linh_vuc)
);

COMMENT ON TABLE public.article_gan_linh_vuc IS
  'Gắn bài entity (chủ yếu nghe) ↔ nhiều lĩnh vực. la_chinh sync với article_bai_viet.id_linh_vuc.';

COMMENT ON COLUMN public.article_gan_linh_vuc.la_chinh IS
  'Lĩnh vực chính — dual-write sang article_bai_viet.id_linh_vuc.';

CREATE INDEX IF NOT EXISTS idx_article_gan_linh_vuc_linh_vuc
  ON public.article_gan_linh_vuc (id_linh_vuc);

CREATE UNIQUE INDEX IF NOT EXISTS uq_article_gan_linh_vuc_chinh
  ON public.article_gan_linh_vuc (id_bai_viet)
  WHERE la_chinh = true;

-- Backfill từ id_linh_vuc hiện có (mọi loai; nghe bắt buộc có FK)
INSERT INTO public.article_gan_linh_vuc (id_bai_viet, id_linh_vuc, la_chinh, thu_tu)
SELECT a.id, a.id_linh_vuc, true, 0
FROM public.article_bai_viet a
WHERE a.id_linh_vuc IS NOT NULL
ON CONFLICT (id_bai_viet, id_linh_vuc) DO NOTHING;

-- Đảm bảo mỗi bài đã gắn có đúng 1 la_chinh
UPDATE public.article_gan_linh_vuc g
SET la_chinh = true
WHERE g.la_chinh = false
  AND NOT EXISTS (
    SELECT 1
    FROM public.article_gan_linh_vuc x
    WHERE x.id_bai_viet = g.id_bai_viet
      AND x.la_chinh = true
  )
  AND g.ctid = (
    SELECT g2.ctid
    FROM public.article_gan_linh_vuc g2
    WHERE g2.id_bai_viet = g.id_bai_viet
    ORDER BY g2.thu_tu, g2.id_linh_vuc
    LIMIT 1
  );

ALTER TABLE public.article_gan_linh_vuc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS article_gan_linh_vuc_public_select ON public.article_gan_linh_vuc;
CREATE POLICY article_gan_linh_vuc_public_select
  ON public.article_gan_linh_vuc
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.article_gan_linh_vuc TO anon, authenticated, service_role;
GRANT ALL ON public.article_gan_linh_vuc TO service_role;
