-- Mã khóa học (ops) — nullable, unique trong cùng cơ sở khi có giá trị.
ALTER TABLE public.org_khoa_hoc
  ADD COLUMN IF NOT EXISTS ma_khoa_hoc text;

COMMENT ON COLUMN public.org_khoa_hoc.ma_khoa_hoc IS
  'Mã khóa nội bộ (VD: HH-ONLINE) — khác slug URL.';

CREATE UNIQUE INDEX IF NOT EXISTS org_khoa_hoc_org_ma_uidx
  ON public.org_khoa_hoc (id_to_chuc, lower(ma_khoa_hoc))
  WHERE ma_khoa_hoc IS NOT NULL AND btrim(ma_khoa_hoc) <> '';
