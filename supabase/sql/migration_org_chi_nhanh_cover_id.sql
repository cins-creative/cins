-- A25 — org_chi_nhanh.cover_id (SoT ảnh bìa chi nhánh CSĐT)
-- Backfill JSON → bảng chạy trong runner (không DROP cau_hinh.chi_nhanh).

ALTER TABLE public.org_chi_nhanh
  ADD COLUMN IF NOT EXISTS cover_id text;

COMMENT ON COLUMN public.org_chi_nhanh.cover_id IS
  'Cloudflare Images id — SoT ảnh bìa chi nhánh (A25). Không đọc cau_hinh.chi_nhanh[].cover_id.';
