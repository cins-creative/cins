-- org_tuyen_dung v2 — nội dung chi tiết + phân phối theo giai_doan (module co_hoi).
-- Idempotent — chạy sau migration_org_tuyen_dung.sql.

ALTER TABLE public.org_tuyen_dung
  ADD COLUMN IF NOT EXISTS yeu_cau text,
  ADD COLUMN IF NOT EXISTS quyen_loi text,
  ADD COLUMN IF NOT EXISTS mo_ta_ngan text,
  ADD COLUMN IF NOT EXISTS so_luong integer,
  ADD COLUMN IF NOT EXISTS hien_thi_co_hoi boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS giai_doan_muc_tieu text[] NOT NULL DEFAULT ARRAY['dang_lam', 'tim_viec', 'freelance']::text[];

COMMENT ON COLUMN public.org_tuyen_dung.yeu_cau IS 'Yêu cầu ứng viên — tách khỏi mô tả công việc.';
COMMENT ON COLUMN public.org_tuyen_dung.quyen_loi IS 'Quyền lợi / phúc lợi dành cho ứng viên.';
COMMENT ON COLUMN public.org_tuyen_dung.mo_ta_ngan IS 'Tóm tắt 1–2 dòng cho card list / module co_hoi.';
COMMENT ON COLUMN public.org_tuyen_dung.so_luong IS 'Số lượng tuyển (headcount).';
COMMENT ON COLUMN public.org_tuyen_dung.hien_thi_co_hoi IS 'Hiện trên module Cơ hội trang chủ (persona LÀM).';
COMMENT ON COLUMN public.org_tuyen_dung.giai_doan_muc_tieu IS
  'Nhóm giai_doan user nhìn thấy tin (values: moi_bat_dau, dang_hoc, dang_lam, tim_viec, freelance, dang_day).';

CREATE INDEX IF NOT EXISTS idx_tuyen_dung_co_hoi
  ON public.org_tuyen_dung (tao_luc DESC)
  WHERE da_xoa = false AND trang_thai = 'dang_mo' AND hien_thi_co_hoi = true;
