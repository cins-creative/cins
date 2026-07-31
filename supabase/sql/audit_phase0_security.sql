-- =====================================================================
-- audit_phase0_security.sql — CHỈ ĐỌC · paste lên SQL Editor CINS branch
-- Project đúng: ospzzzxcomrmhqrnkoiw (URL …ospzzzxcomrmhqrnkoiw.supabase.co)
-- Chạy từng khối; lưu kết quả trước khi chạy migration_phase0_tier*.sql
-- =====================================================================

-- A) Xác nhận đang đúng project (phải có bảng CINS)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_nguoi_dung', 'org_to_chuc', 'chat_phong',
    'content_cot_moc', 'content_tac_pham'
  )
ORDER BY 1;
-- Kỳ vọng: cả 5 tên (hoặc gần đủ). Nếu chỉ thấy orders/products → SAI project.

-- B) Hàm mục tiêu: body config + grant
SELECT
  n.nspname AS schema,
  p.proname AS name,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.prosecdef AS security_definer,
  p.proconfig AS config,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'set_updated_at',
    'handle_new_user',
    'current_profile_id',
    'is_admin_to_chuc',
    'is_thanh_vien_to_chuc',
    'is_chat_room_member',
    'is_article_curator_for_bai_viet',
    'cong_dong_cong_khai',
    'rls_auto_enable'
  )
ORDER BY p.proname;

-- C) Body set_updated_at / handle_new_user (quyết định search_path)
SELECT p.proname, pg_get_functiondef(p.oid) AS def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('set_updated_at', 'handle_new_user', 'rls_auto_enable');

-- D) Mọi SECURITY DEFINER public còn anon EXECUTE (ứng viên Tier 1 thêm)
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef
  AND has_function_privilege('anon', p.oid, 'EXECUTE')
ORDER BY 1;

-- E) Policy → helper map (vì sao KHÔNG revoke authenticated trên helper)
SELECT
  c.relname AS table_name,
  pol.polname AS policy_name,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (
    coalesce(pg_get_expr(pol.polqual, pol.polrelid), '')
    || ' '
    || coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '')
  ) ~* '(current_profile_id|is_admin_to_chuc|is_chat_room_member|is_thanh_vien_to_chuc|is_article_curator_for_bai_viet|cong_dong_cong_khai)'
ORDER BY c.relname, pol.polname;

-- F) Extension vector
SELECT e.extname, n.nspname AS schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname IN ('vector', 'pgcrypto', 'uuid-ossp')
ORDER BY 1;

-- G) Inventory Tier 3 — RLS bật, chưa policy (KHÔNG mass-add)
SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity
  AND NOT EXISTS (
    SELECT 1 FROM pg_policy pol WHERE pol.polrelid = c.oid
  )
ORDER BY 1;

-- H) Đếm nhanh
SELECT
  count(*) FILTER (
    WHERE c.relrowsecurity
      AND NOT EXISTS (SELECT 1 FROM pg_policy pol WHERE pol.polrelid = c.oid)
  ) AS rls_no_policy,
  count(*) FILTER (
    WHERE c.relrowsecurity
      AND EXISTS (SELECT 1 FROM pg_policy pol WHERE pol.polrelid = c.oid)
  ) AS rls_with_policy
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r';
