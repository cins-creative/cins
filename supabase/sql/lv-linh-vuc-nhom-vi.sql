-- Nhóm sidebar /nghe-nghiep: các dòng cùng nhom_vi hiển thị dưới một tiêu đề.

ALTER TABLE public.lv_linh_vuc
  ADD COLUMN IF NOT EXISTS nhom_vi text NULL;

COMMENT ON COLUMN public.lv_linh_vuc.nhom_vi IS 'Nhóm hiển thị sidebar (VD: Game, Hoạt hình); cùng giá trị = cùng cụm.';
