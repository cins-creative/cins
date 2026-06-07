# CINs Website — hướng dẫn cho agent

## Ngữ cảnh dự án (đọc trước)

**Nguồn chính:** [`docs/CINS_INSTRUCTION.md`](./docs/CINS_INSTRUCTION.md) — file router trỏ tới 5 tài liệu:

| File | Nội dung |
|---|---|
| [`CINS_FOUNDATIONS.md`](./docs/CINS_FOUNDATIONS.md) | Triết lý, quy tắc kiến trúc, verify, org |
| [`CINS_SCHEMA.md`](./docs/CINS_SCHEMA.md) | 67 bảng / enum / FK — sinh từ DB |
| [`CINS_IMPLEMENTATION.md`](./docs/CINS_IMPLEMENTATION.md) | API, lib, SQL, env, ghi chú site |
| [`CINS_DECISIONS.md`](./docs/CINS_DECISIONS.md) | Quyết định đã chốt + câu hỏi treo |
| [`CINS_DEV_RULES.md`](./docs/CINS_DEV_RULES.md) | Security, performance, UI conventions |

- Repo này là **frontend Next.js** của CINs, không phải toàn bộ backend.
- Khi user gửi instruction mới: merge vào **đúng file** (FOUNDATIONS / SCHEMA / IMPLEMENTATION / DECISIONS), cập nhật router `CINS_INSTRUCTION.md` nếu cần.
- SQL grant / RLS mẫu: `supabase/sql/`. Query trường–ngành: `lib/truong/`, `lib/nganh/`.
- Map trang trường: [`docs/cursor_map_truong.md`](./docs/cursor_map_truong.md).

## Auth OAuth (Google / PKCE)

- Dev: `.env.local` → `NEXT_PUBLIC_SITE_URL=http://localhost:3001` (cùng origin khi mở `/login`, không lẫn `127.0.0.1`).
- Supabase Dashboard → **Redirect URLs**: `http://localhost:3001/auth/callback` (hoặc `http://localhost:3001/**`).
- Callback: `app/auth/callback/route.ts` — đọc verifier từ **request** cookies, ghi session lên **response** redirect (`lib/supabase/route-handler.ts`).
- Intent đăng ký/đăng nhập: cookie `cins-oauth-intent` (không gắn `?intent=` vào `redirectTo`).

## Next.js (repo này)

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
