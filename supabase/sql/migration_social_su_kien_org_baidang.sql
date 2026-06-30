-- =====================================================================
-- migration_social_su_kien_org_baidang.sql
-- Mở rộng analytics tiếp cận cho BÀI ĐĂNG TỔ CHỨC (`org_bai_dang`).
--
-- Thêm 1 giá trị vào enum đối tượng social để log/rollup/RPC dùng chung
-- cơ chế đã có (social_luot_xem + social_insight_*).
--
-- An toàn chạy lại nhiều lần (idempotent).
-- =====================================================================

ALTER TYPE loai_doi_tuong_social_enum ADD VALUE IF NOT EXISTS 'org_bai_dang';
