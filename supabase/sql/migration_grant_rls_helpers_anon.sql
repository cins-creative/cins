-- Fix: anon không EXECUTE được helper RLS → SELECT org_tuyen_dung fail 42501.
-- Policy `tuyen_dung_admin_org` FOR ALL gọi is_admin_to_chuc; khi thiếu EXECUTE,
-- Postgres lỗi cả query thay vì OR với policy công khai `tuyen_dung_doc_cong_khai`.
-- Helper đều SECURITY DEFINER — GRANT EXECUTE cho anon/authenticated là an toàn & chuẩn Supabase.
-- Idempotent.

GRANT EXECUTE ON FUNCTION public.current_profile_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_to_chuc(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_thanh_vien_to_chuc(uuid, uuid) TO anon, authenticated;
