# CINs Creative — Portfolio shell

Next.js App Router frontend cho nền tảng sáng tạo CINs.

## Khởi động nhanh

```bash
cp .env.example .env.local
# Điền các biến môi trường vào .env.local
npm install
npm run dev
```

Dev server chạy trên **port 3002** (`NEXT_PUBLIC_SITE_URL=http://localhost:3002`).

## Quy tắc budget

| Loại | Giới hạn |
|---|---|
| Dependencies | Không thêm shadcn, Rive, Tiptap, hay UI framework nặng |
| Ảnh | Cloudflare Images duy nhất (`imagedelivery.net`) |
| Auth | Supabase SSR (`@supabase/ssr`) — không JWT tự quản |
| State | React useState/useEffect — không Zustand/Redux |

## Cấu trúc route

| URL hiển thị | File hệ thống | Ghi chú |
|---|---|---|
| `/` | `src/app/page.tsx` | Landing |
| `/login` | `src/app/login/page.tsx` | Auth |
| `/onboarding` | `src/app/onboarding/page.tsx` | Thiết lập profile |
| `/studio` | `src/app/studio/page.tsx` | Dashboard tác giả |
| `/studio/new` | `src/app/studio/new/page.tsx` | Tạo tác phẩm |
| `/studio/[id]/edit` | `src/app/studio/[id]/edit/page.tsx` | Sửa tác phẩm |
| `/studio/collections` | `src/app/studio/collections/page.tsx` | Nhãn cá nhân |
| `/@slug` | `src/app/u/[slug]/page.tsx` | Portfolio công khai (rewrite qua middleware) |
| `/@slug/workSlug` | `src/app/u/[slug]/[workSlug]/page.tsx` | Chi tiết tác phẩm |
| `/explore` | `src/app/explore/page.tsx` | Danh sách lĩnh vực |
| `/linh-vuc/[slug]` | `src/app/linh-vuc/[slug]/page.tsx` | Grid tác phẩm theo lĩnh vực |
| `/api/feed/[slug]` | `src/app/api/feed/[slug]/route.ts` | JSON feed |

> **Lưu ý `/@slug` routing**: Next.js App Router dùng `@folder` cho parallel routes. Middleware rewrite `/@*` → `/u/*` để URL `/@username` hoạt động đúng.

## Phase 1 SQL cần chạy

Đã apply trên CINS `ospzzzxcomrmhqrnkoiw` (agent):

- `supabase/sql/phase1_portfolio_rls.sql`
- `supabase/sql/phase1_content_tac_pham_linh_vuc.sql`
- `filter_doi_tuong_enum` + `tac_pham` (Phase 5)

**Phase 0** (bạn chạy trên branch — xem `supabase/sql/PHASE0_RUNBOOK.md`):

- `migration_phase0_tier1_security.sql`
- `migration_phase0_tier2_revoke_anon_helpers.sql`
- Bật Leaked password protection trên Auth Dashboard

## Env

```bash
cp .env.example .env.local
```

Điền: `NEXT_PUBLIC_SUPABASE_*`, `CLOUDFLARE_*`, `NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH`, `NEXT_PUBLIC_SITE_URL=http://localhost:3002`.

Supabase Auth → Redirect URLs thêm `http://localhost:3002/auth/callback`.

## Vercel

- Root Directory: `cins-creative`
- Env giống `.env.local` (+ `NEXT_PUBLIC_SITE_URL` production)
- Redirect URL production trong Supabase Auth

## Đo budget (Task 7)

Sau deploy: Lighthouse mobile `/@slug` (LCP cover). `npm ls` không có radix/rive/tiptap.
