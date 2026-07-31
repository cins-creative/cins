# Phase 0 — Runbook bảo mật CINS

**Project:** `ospzzzxcomrmhqrnkoiw` · URL phải là `https://ospzzzxcomrmhqrnkoiw.supabase.co`

Agent **không** `apply_migration` lên production. Bạn chạy trên Supabase Branch.

## Thứ tự

1. Dashboard → Branches → tạo preview branch từ production *(hoặc apply SQL đã ghi trong `supabase/sql/` — session 2026-07-14 đã chạy Tier1 + revoke PUBLIC trên production CINS)*.
2. SQL Editor trên **branch** → paste [`migration_phase0_tier1_security.sql`](./migration_phase0_tier1_security.sql) → Run *(REVOKE PUBLIC + anon)*.
3. Smoke: OAuth login, session mới (`handle_new_user`), chat, cộng đồng / bài.
4. Paste [`migration_phase0_tier2_revoke_anon_helpers.sql`](./migration_phase0_tier2_revoke_anon_helpers.sql) → Run *(REVOKE PUBLIC/anon; GRANT authenticated)*.
5. Smoke lại + thử RPC helper bằng **anon** key (phải fail EXECUTE).
6. Advisors Security trên branch — WARN giảm, không regress.
7. Merge branch → production → advisor lần cuối *(nếu chưa apply thẳng)*.
8. Auth → bật **Leaked password protection** (dashboard, tay).

## Kiểm tra nhanh sau Tier 2

```sql
SELECT p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'current_profile_id','handle_new_user','set_updated_at',
    'is_admin_to_chuc','is_thanh_vien_to_chuc','is_chat_room_member',
    'is_article_curator_for_bai_viet','cong_dong_cong_khai'
  );
-- Kỳ vọng helpers: anon_exec=false, auth_exec=true
-- handle_new_user: cả hai false (PUBLIC đã revoke)
-- ⚠ Phải REVOKE PUBLIC — chỉ REVOKE anon không đủ
```

## Auth Dashboard (tay)

Bật **Leaked password protection** trên project CINS (production).