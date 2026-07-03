-- org_tuyen_dung — phúc lợi có cấu trúc (tick + ghi chú tự nhập theo từng mục).
-- Idempotent — chạy sau migration_org_tuyen_dung_v2_distribution.sql.
--
-- Cấu trúc phuc_loi: jsonb array [{ "key": "bao_hiem", "note": "BHXH full lương" }, ...]
-- `key` khớp catalog trong lib/to-chuc/studio-phuc-loi.ts. `note` optional.
-- Cột quyen_loi (text) giữ lại làm ghi chú/legacy fallback khi phuc_loi rỗng.

ALTER TABLE public.org_tuyen_dung
  ADD COLUMN IF NOT EXISTS phuc_loi jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.org_tuyen_dung.phuc_loi IS
  'Phúc lợi có cấu trúc: array [{key, note}]. key khớp catalog studio-phuc-loi.ts.';
