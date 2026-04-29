-- Cột tham chiếu cha trên lv_linh_vuc (nhóm sidebar /nghe-nghiep).
-- Chạy nếu bảng chưa có: nghề con gán linh_vuc_id = id dòng cha.

ALTER TABLE public.lv_linh_vuc
  ADD COLUMN IF NOT EXISTS linh_vuc_id uuid NULL REFERENCES public.lv_linh_vuc (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lv_linh_vuc_parent ON public.lv_linh_vuc (linh_vuc_id);
