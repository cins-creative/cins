-- Cách mua vé (hướng dẫn ngoài nền tảng) trên org_su_kien.
-- Chạy: node scripts/run-org-su-kien-cach-mua-ve-migration.mjs

ALTER TABLE public.org_su_kien
  ADD COLUMN IF NOT EXISTS cach_mua_ve text NULL;

COMMENT ON COLUMN public.org_su_kien.cach_mua_ve IS
  'Hướng dẫn cách mua vé (text) — hiển thị khi sự kiện tính phí; CINs không thu tiền.';
