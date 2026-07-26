-- URL công khai `/su-kien/{slug}` — slug ổn định, unique toàn cục.
ALTER TABLE public.org_su_kien
  ADD COLUMN IF NOT EXISTS slug text;

COMMENT ON COLUMN public.org_su_kien.slug IS
  'Slug URL công khai /su-kien/{slug}; unique; sinh từ tên (+ hậu tố nếu trùng).';

-- Backfill tạm từ id (đảm bảo NOT NULL trước unique) — app sẽ đổi sang slugify(ten).
UPDATE public.org_su_kien
SET slug = 'sk-' || replace(id::text, '-', '')
WHERE slug IS NULL OR btrim(slug) = '';

ALTER TABLE public.org_su_kien
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS org_su_kien_slug_uidx
  ON public.org_su_kien (slug);
