-- =====================================================================
-- migration_social_luu_org_tuyen_dung.sql
-- Cho phép "Lưu về Journey" một tin tuyển dụng (org_tuyen_dung).
-- Thêm giá trị 'org_tuyen_dung' vào enum đối tượng social dùng chung
-- (social_luu / social_luot_xem / social_thong_ke_*).
--
-- An toàn chạy lại nhiều lần (idempotent).
-- =====================================================================

ALTER TYPE public.loai_doi_tuong_social_enum
  ADD VALUE IF NOT EXISTS 'org_tuyen_dung';
