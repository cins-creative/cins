-- =====================================================================
-- migration_shop_don_giam_gia.sql — ALTER shop_don_hang: cột giảm giá
-- User duyệt 2026-08-07 (PLAN_shop_combo_voucher §8 Q5).
-- Giữ nghĩa tong_tien = số tiền buyer thực trả (sau giảm).
-- Idempotent. CINs ospzzzxcomrmhqrnkoiw.
-- =====================================================================

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS tong_hang numeric(18, 2);

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS tien_giam_combo numeric(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS tien_giam_voucher numeric(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS id_voucher uuid
    REFERENCES public.shop_voucher(id) ON DELETE SET NULL;

ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS giam_snapshot jsonb;

-- Backfill đơn cũ: tong_hang = tong_tien (không có giảm)
UPDATE public.shop_don_hang
SET tong_hang = tong_tien
WHERE tong_hang IS NULL;

ALTER TABLE public.shop_don_hang
  ALTER COLUMN tong_hang SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.shop_don_hang
    ADD CONSTRAINT shop_don_hang_tong_hang_chk CHECK (tong_hang >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.shop_don_hang
    ADD CONSTRAINT shop_don_hang_tien_giam_combo_chk CHECK (tien_giam_combo >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.shop_don_hang
    ADD CONSTRAINT shop_don_hang_tien_giam_voucher_chk CHECK (tien_giam_voucher >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_shop_don_hang_id_voucher
  ON public.shop_don_hang (id_voucher)
  WHERE id_voucher IS NOT NULL;

COMMENT ON COLUMN public.shop_don_hang.tong_hang IS
  'Tiền hàng trước giảm combo/voucher. tong_tien = số buyer thực trả.';
COMMENT ON COLUMN public.shop_don_hang.tien_giam_combo IS
  'Số tiền giảm từ combo (đã làm tròn đồng).';
COMMENT ON COLUMN public.shop_don_hang.tien_giam_voucher IS
  'Số tiền giảm từ voucher (đã làm tròn đồng).';
COMMENT ON COLUMN public.shop_don_hang.id_voucher IS
  'FK voucher đã áp (nullable). Chi tiết trong giam_snapshot + shop_voucher_su_dung.';
COMMENT ON COLUMN public.shop_don_hang.giam_snapshot IS
  'Snapshot: combo áp dụng, mã voucher, công thức — hiển thị lại đơn cũ.';
