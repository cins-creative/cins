-- =====================================================================
-- migration_phase0_tier1_security.sql
-- Phase 0 / Tier 1 — an toàn tương đối · chạy trên BRANCH CINS trước
-- Project: ospzzzxcomrmhqrnkoiw
--
-- 1.2 Cố định search_path cho set_updated_at (nếu tồn tại)
-- 1.3 REVOKE EXECUTE handle_new_user khỏi PUBLIC/anon/authenticated (trigger vẫn chạy)
-- Thêm: REVOKE rls_auto_enable nếu còn expose (event trigger / DEFINER thừa)
-- Lưu ý: phải REVOKE PUBLIC — GRANT mặc định khiến anon vẫn EXECUTE.
--
-- Idempotent. Bỏ qua object không tồn tại (NOTICE).
-- KHÔNG apply lên production qua MCP — paste SQL Editor trên branch.
-- =====================================================================

DO $$
DECLARE
  fn_oid oid;
  def text;
  r record;
  revoked_any boolean := false;
BEGIN
  -- ---- 1.2 set_updated_at -------------------------------------------------
  SELECT p.oid
  INTO fn_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'set_updated_at'
    AND pg_get_function_identity_arguments(p.oid) = ''
  LIMIT 1;

  IF fn_oid IS NOT NULL THEN
    def := pg_get_functiondef(fn_oid);
    -- Body chuẩn trigger: chỉ gán NEW.updated_at — search_path rỗng an toàn.
    -- Nếu thân hàm có FROM/UPDATE/… đối tượng không chắc qualify → public, pg_catalog.
    IF def ~* 'updated_at'
       AND def !~* '\m(FROM|INTO|UPDATE|INSERT|DELETE|EXECUTE|PERFORM)\M'
    THEN
      EXECUTE 'ALTER FUNCTION public.set_updated_at() SET search_path = ''''';
      RAISE NOTICE 'phase0 tier1: set_updated_at search_path = ''''';
    ELSE
      EXECUTE 'ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_catalog';
      RAISE NOTICE 'phase0 tier1: set_updated_at search_path = public, pg_catalog';
    END IF;
  ELSE
    RAISE NOTICE 'phase0 tier1: set_updated_at() không tồn tại — bỏ qua';
  END IF;

  -- ---- 1.3 handle_new_user (mọi overload trong public) ---------------------
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'handle_new_user'
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.handle_new_user(%s) FROM PUBLIC, anon, authenticated',
      r.args
    );
    RAISE NOTICE 'phase0 tier1: REVOKE handle_new_user(%) FROM anon, authenticated', r.args;
    revoked_any := true;
  END LOOP;

  IF NOT revoked_any THEN
    RAISE NOTICE 'phase0 tier1: handle_new_user không tồn tại — bỏ qua';
  END IF;

  -- ---- rls_auto_enable (DEFINER thừa, không dùng trong RLS policy) --------
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'rls_auto_enable'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
    RAISE NOTICE 'phase0 tier1: REVOKE rls_auto_enable() FROM anon, authenticated';
  ELSE
    RAISE NOTICE 'phase0 tier1: rls_auto_enable() không tồn tại — bỏ qua';
  END IF;
END $$;
