-- Mô hình seed dùng chung (page). Thêm cột org_to_chuc.trang_thai_seed.
-- Nick reuse auto_tai_khoan (loai/trang_thai_xin_phep/trang_thai_ban_giao) —
-- không thêm cột. Idempotent. Chạy: npm run migrate:trang-thai-seed
-- Plan: docs/PLAN_mo_hinh_seed.md · DECISIONS 2026-08-01

-- ── 1. Cột trang_thai_seed (text + CHECK, NULL = không seed) ──────────

ALTER TABLE public.org_to_chuc
  ADD COLUMN IF NOT EXISTS trang_thai_seed text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'org_to_chuc_trang_thai_seed_chk'
  ) THEN
    ALTER TABLE public.org_to_chuc
      ADD CONSTRAINT org_to_chuc_trang_thai_seed_chk
      CHECK (
        trang_thai_seed IS NULL
        OR trang_thai_seed IN ('clone', 'duoc_duyet', 'ban_giao')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_org_to_chuc_trang_thai_seed
  ON public.org_to_chuc (trang_thai_seed)
  WHERE trang_thai_seed IS NOT NULL;

COMMENT ON COLUMN public.org_to_chuc.trang_thai_seed IS
  'Trạng thái seed page (NULL=org thật). clone=CINs vận hành (hiện disclaimer); '
  'duoc_duyet=chủ thể đồng ý, CINs vẫn vận hành (ẩn disclaimer, chưa tick); '
  'ban_giao=chủ thể tự điều hành (tick xanh + set verified_official).';

-- ── 2. Backfill: page tạo từ tài khoản seeding = clone ───────────────

UPDATE public.org_to_chuc o
SET trang_thai_seed = 'clone'
WHERE o.trang_thai_seed IS NULL
  AND EXISTS (
    SELECT 1 FROM public.auto_tai_khoan a
    WHERE a.id_nguoi_dung = o.nguoi_tao
      AND a.trang_thai_ban_giao <> 'da_ban_giao'
  );
