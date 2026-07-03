-- =====================================================================
-- migration_social_luot_xem_su_kien.sql
-- Cho phép log impression/analytics cho đối tượng "sự kiện" (org_su_kien)
-- trên World Journey feed. Thêm giá trị enum 'su_kien' để card sự kiện
-- (OrgSuKienFeedMilestoneCard) bắn 'hien_thi' vào social_luot_xem, phục vụ
-- xếp hạng feed "ưu tiên nội dung chưa xem / xem ít".
--
-- An toàn chạy lại nhiều lần (idempotent).
-- =====================================================================

ALTER TYPE public.loai_doi_tuong_social_enum ADD VALUE IF NOT EXISTS 'su_kien';
