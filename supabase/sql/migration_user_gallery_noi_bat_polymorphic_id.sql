-- Cho phép thứ tự nổi bật gồm cả bài org (`org_bai_dang`) lẫn `content_cot_moc`.
-- Trước đây FK chỉ trỏ content_cot_moc → PATCH reorder fail khi feature có bài org (vd. cộng sự).
-- id_cot_moc = polymorphic UUID (cot mốc user HOẶC id org_bai_dang).
-- Chạy: node scripts/run-sql-file.mjs supabase/sql/migration_user_gallery_noi_bat_polymorphic_id.sql
-- Idempotent.

ALTER TABLE public.user_gallery_noi_bat
  DROP CONSTRAINT IF EXISTS user_gallery_noi_bat_id_cot_moc_fkey;

COMMENT ON COLUMN public.user_gallery_noi_bat.id_cot_moc IS
  'Polymorphic: content_cot_moc.id hoặc org_bai_dang.id (bài feature trên Journey).';
