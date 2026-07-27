-- Autopilot: thêm nền tảng pixiv vào CHECK nen_tang.
-- Idempotent. Chạy: npm run migrate:autopilot-pixiv

ALTER TABLE public.auto_nguon
  DROP CONSTRAINT IF EXISTS auto_nguon_nen_tang_check;

ALTER TABLE public.auto_nguon
  ADD CONSTRAINT auto_nguon_nen_tang_check
  CHECK (nen_tang IN ('artstation', 'behance', 'pixiv'));

ALTER TABLE public.auto_muc
  DROP CONSTRAINT IF EXISTS auto_muc_nen_tang_check;

ALTER TABLE public.auto_muc
  ADD CONSTRAINT auto_muc_nen_tang_check
  CHECK (nen_tang IN ('artstation', 'behance', 'pixiv', 'khac'));

COMMENT ON TABLE public.auto_nguon IS
  'Autopilot: theo dõi artist ArtStation / Behance / Pixiv (allowlist).';
