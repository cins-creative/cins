-- =====================================================================
-- migration_phase0_tier2_revoke_anon_helpers.sql
-- Phase 0 / Tier 2.1 — chạy sau Tier 1 + smoke
-- Project: ospzzzxcomrmhqrnkoiw
--
-- Postgres mặc định GRANT EXECUTE TO PUBLIC — chỉ REVOKE anon không đủ.
-- Pattern đúng: REVOKE FROM PUBLIC, anon; GRANT lại cho authenticated.
-- KHÔNG revoke authenticated (RLS cần EXECUTE).
-- =====================================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (
        (p.proname = 'current_profile_id' AND pg_get_function_identity_arguments(p.oid) = '')
        OR (p.proname = 'is_thanh_vien_to_chuc' AND pg_get_function_identity_arguments(p.oid) = 'p_user uuid, p_org uuid')
        OR (p.proname = 'is_admin_to_chuc' AND pg_get_function_identity_arguments(p.oid) = 'p_user uuid, p_org uuid')
        OR (p.proname = 'cong_dong_cong_khai' AND pg_get_function_identity_arguments(p.oid) = 'p_org uuid')
        OR (p.proname = 'is_chat_room_member' AND pg_get_function_identity_arguments(p.oid) = 'p_room uuid, p_user uuid')
        OR (p.proname = 'is_article_curator_for_bai_viet' AND pg_get_function_identity_arguments(p.oid) = 'p_user uuid, p_bai_viet uuid')
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
      r.proname,
      r.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
      r.proname,
      r.args
    );
    RAISE NOTICE 'phase0 tier2: % — PUBLIC/anon revoked; authenticated granted', r.proname;
  END LOOP;
END $$;
