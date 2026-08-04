-- Cho phép lớp chưa chốt ngày khai giảng (form tùy chọn).
-- Idempotent.

ALTER TABLE public.org_lop_hoc
  ALTER COLUMN ngay_khai_giang DROP NOT NULL;

COMMENT ON COLUMN public.org_lop_hoc.ngay_khai_giang IS
  'Ngày khai giảng lớp — NULL khi chưa chốt (không hiện mốc timeline).';
