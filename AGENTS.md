# CINs Website — hướng dẫn cho agent

## Ngữ cảnh dự án (đọc trước)

**Nguồn chính:** [`docs/CINS_INSTRUCTION.md`](./docs/CINS_INSTRUCTION.md) — **Schema / instruction v5** (product, DB 61+ bảng, naming, enum, quy tắc kiến trúc, ghi chú triển khai site).

- Repo này là **frontend Next.js** của CINs (trang chủ, ngành học, trường đại học, nghề nghiệp, bài viết, …), không phải toàn bộ backend.
- Khi user gửi file instruction mới (**v6, v7, v8, …**): cập nhật `docs/CINS_INSTRUCTION.md` (đổi số version ở đầu file, merge nội dung mới; không bỏ phần implementation site trừ khi user yêu cầu thay thế).
- SQL grant / RLS mẫu: `supabase/sql/`. Query trường–ngành: `lib/truong/`, `lib/nganh/`.
- Map trang trường (component tree, seed UUID, fetch patterns): [`docs/cursor_map_truong.md`](./docs/cursor_map_truong.md).

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
