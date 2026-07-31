# Phase 0 — Runbook làm cứng bảo mật CINS

> **Project đúng:** `ospzzzxcomrmhqrnkoiw` · URL `https://ospzzzxcomrmhqrnkoiw.supabase.co`  
> **Không** chạy các SQL này trên project khác (vd. MCP lệch `cfftnaqwrsjidephlpad`).  
> Agent **không** `apply_migration` lên production — bạn chạy trên **Supabase Branch**.

---

## File trong repo

| File | Mục đích |
|---|---|
| [`supabase/sql/audit_phase0_security.sql`](../supabase/sql/audit_phase0_security.sql) | Chỉ đọc — xác nhận project + map hàm/policy |
| [`supabase/sql/migration_phase0_tier1_security.sql`](../supabase/sql/migration_phase0_tier1_security.sql) | Tier 1: `search_path` + revoke `handle_new_user` (+ `rls_auto_enable` nếu có) |
| [`supabase/sql/migration_phase0_tier2_revoke_anon_helpers.sql`](../supabase/sql/migration_phase0_tier2_revoke_anon_helpers.sql) | Tier 2.1: `REVOKE … FROM anon` trên helper RLS (không đụng `authenticated`) |

---

## Gate trước khi paste SQL

1. Dashboard → đúng org/project **CINs** (`ospzzzxcomrmhqrnkoiw`).
2. Chạy khối **A** trong `audit_phase0_security.sql` — phải thấy `user_nguoi_dung` / `chat_phong` / …
3. Nếu MCP Cursor vẫn trỏ project khác: Settings → MCP → Supabase → chọn lại project CINS (không dựa advisor của project lệch).

---

## Quy trình branch

1. **Branches** → tạo branch từ production (tên gợi ý: `phase0-security`).
2. Trên branch SQL Editor → chạy hết `audit_phase0_security.sql`, lưu kết quả (đặc biệt **B, D, E, G**).
3. Chạy `migration_phase0_tier1_security.sql`.
4. **Smoke Tier 1** (dùng app trỏ branch URL nếu có, hoặc SQL Editor + Auth trên branch):
   - [ ] Đăng nhập Google OAuth
   - [ ] User mới (hoặc tài khoản test): profile `user_nguoi_dung` vẫn được tạo bởi trigger
   - [ ] Mở chat (list phòng / gửi tin)
   - [ ] Xem Journey / bài cộng đồng
5. Chạy `migration_phase0_tier2_revoke_anon_helpers.sql`.
6. **Smoke Tier 2**:
   - [ ] Lặp smoke đăng nhập / chat / cộng đồng (policy vẫn OK với `authenticated`)
   - [ ] Gọi RPC helper bằng **anon key** (PostgREST `/rpc/current_profile_id` …) → phải **fail** (permission denied)
7. Dashboard → **Database Advisors / Security** trên branch — WARN `search_path` / DEFINER callable giảm; không regression.
8. **Merge** branch → production khi xanh.
9. Advisor lần cuối trên production.
10. **Auth → Password / Policies** → bật **Leaked password protection** (HaveIBeenPwned). Không SQL.

---

## Inventory repo (policy ↔ helper) — trước khi có kết quả audit live

Dùng để hiểu blast radius; **DB branch là sự thật** (audit khối E).

| Helper | Migration định nghĩa | Policy / bảng gọi (file SQL repo) |
|---|---|---|
| `current_profile_id()` | `migration_cong_dong.sql` | Chat, cộng đồng, CSĐT, tuyển dụng, emoji, báo cáo, đóng góp… |
| `is_admin_to_chuc(uuid,uuid)` | `migration_cong_dong.sql` | `org_*`, cộng đồng admin, `org_bai_tap`, tuyển dụng |
| `is_thanh_vien_to_chuc(uuid,uuid)` | `migration_cong_dong.sql` | Cộng đồng select/insert |
| `cong_dong_cong_khai(uuid)` | `migration_cong_dong.sql` | Visibility cộng đồng |
| `is_chat_room_member(uuid,uuid)` | `migration_chat_rls.sql` | `chat_phong`, `chat_tin_nhan`, `chat_the_*`, `chat_moc`, `chat_ghim` |
| `is_article_curator_for_bai_viet(uuid,uuid)` | `migration_article_dong_gop.sql` | Quyền thẩm định đóng góp |
| `handle_new_user()` | Chỉ có trên DB (docs) — không file SQL trong repo | Trigger `auth.users` → profile |
| `set_updated_at()` | Thường có trên DB (advisor) | Trigger `updated_at` |

**Vì sao không `REVOKE … FROM authenticated`:** policy RLS chạy với quyền của user đang query → cần `EXECUTE` helper.

**Vì sao chưa `app_hidden`:** sau `ALTER … SET SCHEMA`, mọi `USING (is_chat_room_member(…))` gãy trừ khi rewrite policy. Làm Phase 0.5 khi audit E đủ và có cửa sổ test.

---

## Tier 2.2 / Tier 3 — ngoài phạm vi chạy ngay

- **`vector` extension:** chỉ khi audit F còn `public` và có thời gian test cột `vector`. Không block Tier 1–2.1.
- **~N bảng RLS-no-policy:** đang khóa kín. Viết policy khi build UI đọc/ghi bảng đó (Phase 1 portfolio, …). Không mass-add.

---

## Docs đã đồng bộ

- `docs/CINS_DECISIONS.md` — **L32** Phase 0 hardening
- `docs/CINS_IMPLEMENTATION.md` §3 — 3 file SQL Phase 0
- `docs/CINS_INSTRUCTION.md` — link runbook này
