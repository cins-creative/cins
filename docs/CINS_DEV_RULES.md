# CINS — Dev Rules (Quick + Security + Performance + Conventions)

> **File trong repo:** `docs/CINS_DEV_RULES.md`
> **Mục đích:** Gom rule code/security/performance về **một chỗ**, đã chỉnh theo convention thực tế của CINS (không phải Basakila/Sine Art).
> **Cặp đôi:** đọc cùng `docs/CINS_INSTRUCTION.md` (router) → `CINS_FOUNDATIONS.md` + **schema DB (đọc trực tiếp)**. File này nói **cách code**; các file kia nói **nghiệp vụ & cấu trúc DB**.
> **Khi xung đột:** **DB thật (đọc trực tiếp)** thắng về cấu trúc; `CINS_FOUNDATIONS.md` thắng về nghiệp vụ/naming; file này thắng về security/performance/style code.

---

## 0. Thứ tự đọc (agent / dev)

1. **`docs/CINS_INSTRUCTION.md`** — router, biết tra file nào.
2. **`docs/CINS_DEV_RULES.md`** (file này) — §1, §2 trước mọi task.
3. **`docs/CINS_FOUNDATIONS.md`** — nghiệp vụ, quy tắc kiến trúc. **DB trực tiếp** (Prisma/Supabase MCP · `information_schema`) — bảng/cột/enum khi cần chi tiết DB.
4. Mở sâu §5 (Performance) / §6 (Security) / §7 (Conventions) **chỉ khi** task đụng vào mảng đó.

---

## 1. Nguyên tắc chung

| Làm | Không làm |
|-----|-----------|
| Sửa đúng phạm vi yêu cầu | Refactor rộng không được hỏi |
| Hỏi lại khi không chắc | Đoán rồi code |
| Giữ style & pattern hiện có | Xóa comment/code không liên quan task |
| Thư viện mới **chỉ khi** được phép | Thêm dependency tự ý |
| Demo/SQL chạy được | Mô tả trừu tượng dài dòng |

**Task lớn** (>5 bước / sửa >3 file / đụng schema) → báo user & plan trước, **không** tự làm hết.

**ALTER bảng/cột đã có (BẮT BUỘC):** Mọi `ALTER TABLE` trên bảng đang live (thêm/đổi/xóa cột, đổi kiểu, đổi/thêm enum value dùng chung, đổi FK/CHECK, rename) → **báo cáo user trước** (bảng · cột · kiểu · nullable · lý do · ảnh hưởng dữ liệu cũ) → ghi / cập nhật inventory trong `CINS_DECISIONS.md` (mục CSĐT / ALTER) → **chỉ chạy migration sau khi user xác nhận**. Tạo bảng mới (`CREATE TABLE`) vẫn cần plan, nhưng không cùng mức gate với sửa cột cũ. Không tự ý ALTER “tiện tay”. Chi tiết inventory đề xuất: DECISIONS **L34**.

**Quy ước làm việc:** tiếng Việt, ngắn gọn. "Khoan sửa" → defer. "Sao cũng được" → tự quyết, không hỏi lại. Push back khi agent over-engineer hoặc sai semantic.

---

## 2. Cấm tuyệt đối (security + DB)

- Secret / API key / password → **`process.env`**, không hardcode. Không commit `.env`.
- Query Supabase: **không** `select('*')`; list → **pagination** (xem §5).
- **Không** nối chuỗi SQL; dùng Supabase client đúng kiểu (`.from().select('cột')`). SQL migration thì dùng file có kiểm soát, idempotent.
- **Không** `dangerouslySetInnerHTML` / `innerHTML` với data user. **Ngoại lệ hợp lệ:** `noi_dung_html` của bài `nghe` (content admin tạo) — render qua `dangerouslySetInnerHTML` với CSS scope `.article-rich-content`. Đây là content nội bộ đã kiểm soát, **không** phải input user tự do.
- **Không** log password, token, OTP, email/SĐT chưa public, PII nhạy cảm.
- **Không** commit `.env`, `node_modules`, artifact build.

→ Chi tiết: §6.

---

## 3. Checklist theo loại task

### Gate quyền — hỏi TRƯỚC khi build feature đọc-ghi (BẮT BUỘC)

Trước khi scaffold/triển khai **bất kỳ** trang / feature / endpoint **đọc-ghi dữ liệu** → **DỪNG và hỏi user** profile quyền, KHÔNG tự giả định mặc định rồi vá quyền sau:

1. **Ai xem được?** (khách / user / chỉ chủ / chỉ member org / chỉ Curator…)
2. **Ai hành động (tạo/sửa/xóa)?** Theo **trục 1** (role toàn cục) hay **trục 2** (quan hệ: chủ sở hữu / org owner)? — xem `CINS_FOUNDATIONS.md` §12.
3. **Có đụng moat không?** Liên quan verify quan hệ hay phong canonical (`da_verify`)? Nếu có → ai bấm, ai là đích.
4. **Soft-delete:** ai được set `da_xoa`.

Sau khi user trả lời → mới sinh **RLS policy + query (`auth.uid()`) + guard UI** khớp profile. Chưa rõ thì hỏi lại, KHÔNG đoán.

### API / Route handler

- [ ] Validate input ở **backend**; không tin mỗi frontend.
- [ ] List trả về có **giới hạn** + đếm tổng nếu cần phân trang.
- [ ] Response lỗi không lộ stack / secret; status HTTP đúng (400/401/403/404/422/500).
- [ ] Check quyền ở backend (RLS hoặc check `user_thanh_vien_to_chuc.vai_tro`), **không** chỉ ẩn UI.
- [ ] Co-author / kết bạn / verify: validate điều kiện nghiệp vụ **trước** INSERT (vd. `user_ket_ban` accepted trước khi tag co-author — xem `CINS_FOUNDATIONS.md` §5 quy tắc 19).

### Database / Supabase

- [ ] Chỉ `select` **cột cần thiết**; tránh N+1 (embed quan hệ trong 1 query).
- [ ] List: `.range(from, to)` + `count: 'exact'` khi cần phân trang. **Không** load cả bảng rồi slice client.
- [ ] Tên bảng/cột: theo `CINS_FOUNDATIONS.md` §4 — tiền tố tiếng Anh + tiếng Việt không dấu (`user_nguoi_dung`, `content_cot_moc`, `id_nguoi_dung`, `tao_luc`). **Không** tự đặt `created_at`, `user_id`, bảng số nhiều tiếng Anh.
- [ ] Đổi schema → **migration SQL idempotent** (`ON CONFLICT DO NOTHING` / `ON CONFLICT (slug) DO UPDATE`), **không** sửa DB production bằng tay.

### UI / Next.js App Router

- [ ] Link nội bộ: `next/link` (prefetch mặc định). **Không** `<a href>` raw cho internal route.
- [ ] Ảnh: Cloudflare Images, lazy + `width`/`height`. Upload → optimistic preview + Direct Upload (xem §5).
- [ ] Search/filter gõ tay: **debounce ~300ms** nếu gọi API.
- [ ] Streaming: tách UI tĩnh khỏi data fetch, mỗi khối 1 `<Suspense>` + `loading.tsx` (xem §8).
- [ ] Design tokens: dùng biến CINS (§4), **không** hardcode màu/peach/gray neutral.
- [ ] Mobile-first: layout đẹp từ **360px**; media trong feed/bài **full-bleed** (sát mép) ở mobile, thắt theo container từ breakpoint lớn (text vẫn giữ lề); nav cố định tôn trọng `env(safe-area-inset-*)`. Touch target ≥ 44×44px (xem §7 UX).

---

## 4. Design tokens CINS (nguồn: `01-foundations`)

> Áp cho skeleton, UI tĩnh, component mới. **Không** dùng palette peach/ink của Sine Art, **không** gray neutral mặc định nếu đã có token.

### Màu
```
--cins-blue        : #1F74C9   /* logo, headline, link, CTA chính */
--cins-blue-dark   : #1656A0   /* hover, pressed */
--cins-blue-soft   : #E7F0FB   /* nền tonal, tab active, callout */
--bg-page          : #F4F5F8
--bg-surface       : #FFFFFF
--border           : #E4E6EB
--border-strong    : #C9CCD3
--ink-display      : rgba(0,0,0,.85)
--ink-title        : rgba(0,0,0,.60)
--ink-body         : rgba(0,0,0,.55)
--ink-muted        : rgba(0,0,0,.40)
/* Accent quartet (mascot) — dùng tiết kiệm */
mint #6EFEC0 · orange #FFB85C · violet #BB89F8 · yellow #FDE859
```
- Logo CINs **chỉ** đặt trên nền trắng. Nền khác → bọc card/box trắng trước.

### Chữ — MỘT font duy nhất: Be Vietnam Pro
```
--font-sans : "Be Vietnam Pro"  — DUY NHẤT cho toàn UI (heading H1–H6 + body + long-form). Dấu tiếng Việt chuẩn.
--font-mono : "JetBrains Mono"  — NGOẠI LỆ duy nhất: khối code, blockquote, số liệu mono.
```
- Be Vietnam Pro tự host qua **`next/font/google`**, phơi ra CSS variable, map `--font-sans` → `font-sans` mặc định. **CHỈ load weight thực dùng** (vd 300/400/500/600/700), không load cả 9 weight × italic.
- Font weight ưu tiên: **300 / 400 / 500** (theo demo production).
- **DEPRECATED — đang gỡ:** `Anton` (`--font-display`) & `Crimson Pro` (`--font-serif`). KHÔNG dùng cho code/UI mới. Để hiện thực hóa single-font, cần dọn code: `app/cins-font-bridge.css` (`h1 { font-family: var(--font-anton) }` → Be Vietnam), `app/cins-design-tokens.css`, font loader `app/layout.tsx`, và `docs/CINs-design-conventions.md` §Typography.

### Shape & shadow
```
--radius-xs 6 · sm 10 · md 14 · lg 20 · xl 28 · pill 999
--shadow-xs/sm/md/lg : rgba(15,23,42, .04→.10)
border mặc định: 1px solid var(--border)
```
- Không sharp corners cho card. Border 1px là chuẩn CINS.

### Icon
- **Lucide** (`lucide-react` production; unpkg UMD trong demo HTML). **Không** Feather/Material/Heroicons/FontAwesome. Không emoji trong UI chrome.

---

## 5. Performance

### Database
- LUÔN pagination cho list (mặc định 20/page).
- CẤM `select('*')` — chỉ cột cần dùng.
- CẤM N+1 → embed quan hệ Supabase trong 1 query.
- Index cho mọi cột trong WHERE / ORDER BY / JOIN (pgvector dùng HNSW cho `vector(6)`).
- Connection pooling bật. Transaction cho thao tác nhiều bảng (vd. owner row + `content_tac_pham` cùng transaction). Luồng nhiều bước/cần nguyên tử (đặc biệt **verify: claim → accept/veto**) viết bằng **RPC / Postgres function**, không chia nhiều round-trip dễ race.
- **RLS perf (gotcha hay bỏ sót):** RLS chạy **per-row** → mọi cột policy tham chiếu (FK quan hệ, `da_xoa`, cột lens) **phải có index**, không thì mỗi query quét toàn bảng. Bọc `auth.uid()` thành `(select auth.uid())` trong policy → Postgres tính **một lần**, không phải mỗi dòng.
- **Region:** DB + app cùng region gần VN (Singapore) — latency tới DB nhân lên mỗi query. CINS đi qua **Hyperdrive** cho Postgres TCP (xem `CINS_FOUNDATIONS.md` §3).

### Realtime (Supabase) có kỷ luật
- Realtime CHỈ cho **chat / thread đang mở / thông báo** — **KHÔNG bao giờ làm cơ chế feed/Gallery** (subscribe cả feed = sập).
- Subscribe **scope hẹp** (đúng channel/row cần), luôn **unsubscribe khi unmount**.

### Hình ảnh & Media (Cloudflare)
- Cloudflare Images: lưu `cloudflare_id`; serve qua `imagedelivery.net`. Lưu `width`/`height` (đã có ở `content_media`) để tránh layout shift.
- **Variants** (Dashboard): `avatar` 64×64 · `thumbnail` 300×300 (vuông) · **`grid` 640×360** · **`gridsm` 400×225** (lưới 16:9) · `public` 1366×768. Bảng đầy đủ + code map → `CINS_IMPLEMENTATION.md` §4.
- LUÔN `loading="lazy"` trừ ảnh above-the-fold (`loading="eager"` + `fetchpriority="high"` + preload).
- WebP/AVIF qua Cloudflare variants. `srcset` cho responsive (`gallery-grid`: `gridsm` + `grid`).
- Video: Bunny Stream (delivery) + R2 (source). YouTube/Vimeo → thumbnail click-to-load, không nhúng iframe trực tiếp.

### Optimistic UI cho upload ảnh (Journey editor)
- Hiện preview local (`URL.createObjectURL`) NGAY khi chọn file, **không** đợi upload xong.
- Upload chạy ngầm song song khi user điền form. Dùng **Direct Upload (signed URL)** thẳng lên Cloudflare, không qua backend.
- Xử lý: upload fail (error + retry), đổi file giữa chừng (abort upload cũ), rời trang khi chưa xong.
- Disable nút Save khi upload chưa hoàn tất hoặc hiện indicator nhỏ.

### Prefetch & cache client
- Detail page (Journey post, ngành): prefetch item trước/sau.
- Pagination: prefetch trang kế khi đang xem.
- `next/link` prefetch on hover (mặc định).
- Khuyến nghị **TanStack Query** hoặc SWR — sẵn cache + eviction (LRU) + dedup. Set `staleTime` + `gcTime` hợp lý.

### JS & CSS
- Code splitting theo route; lazy load component nặng (block editor, chart, map).
- Import cụ thể: `import debounce from 'lodash/debounce'`, KHÔNG `import _ from 'lodash'`.
- Script bên thứ 3 (analytics): `defer` / load sau interactive.
- Minify + Brotli ở production.

### Rendering
- SSR/SSG cho trang public (Journey public, Gallery, trang trường) — SEO + first paint.
- CSR cho dashboard / trang sau login.
- List dài (>100): virtual scrolling. Skeleton loading thay spinner trắng.

### Khi viết code mới
- Thư viện mới → check bundle size (bundlephobia) trước.
- Component ngoài critical path → lazy load.
- API mới → hỗ trợ pagination từ đầu.
- Query DB mới → EXPLAIN check index.

---

## 6. Security

### Bí mật & config
- CẤM hardcode secret. Dùng `.env`; cập nhật `.env.example`. Không commit `.env`. Secret production ở vault.

### Input & output
- Validate & sanitize MỌI input user (API + form), cả frontend (UX) lẫn backend (security).
- Escape output. Không `innerHTML`/`dangerouslySetInnerHTML` với data user tự do (ngoại lệ `noi_dung_html` content admin — §2).
- Dùng Supabase client / prepared statement, CẤM string concat SQL.
- Giới hạn size upload, check mime type + extension.

### Auth & phân quyền
- Auth qua Supabase `auth.users` ↔ `user_nguoi_dung.auth_user_id` (trigger `handle_new_user()`).
- Session/JWT ở httpOnly cookie, KHÔNG localStorage.
- Check quyền ở **backend** — RLS + check `user_thanh_vien_to_chuc.vai_tro`. Không chỉ ẩn UI.
- **RLS chưa apply trong schema cơ bản → phải làm trước khi public** (ưu tiên cao). Phân quyền org theo `CINS_IMPLEMENTATION.md` §7.
- Rate limiting cho login/register/forgot-password/API public.
- 2FA cho tài khoản admin CINS.

### Network
- HTTPS bắt buộc production. Cookie `secure` + `httpOnly` + `sameSite`.
- CORS chặt — whitelist domain, KHÔNG `*`.
- CSRF token cho form đổi data. Security headers: CSP, X-Frame-Options, X-Content-Type-Options.

### Logging & error
- KHÔNG log password/token/OTP/PII. KHÔNG lộ stack trace production.
- Error cho user chung chung; chi tiết log nội bộ (request id, user id, timestamp).

### Dữ liệu nhạy cảm
- Không trả data thừa trong API response (không lộ email/SĐT chưa public).
- Open question (`CINS_DECISIONS.md`): phone/email có cần verify trước khi public không → quyết trước launch.

### Dependency
- `npm audit` định kỳ. Cấm package có lỗ hổng chưa fix. Check star/last update/license trước khi thêm.

---

## 7. Conventions

> **Lưu ý quan trọng:** Naming DB/API của CINS **khác** convention web phổ thông. Theo CINS, **không** theo mặc định "snake_case số nhiều tiếng Anh".

### Đặt tên
- Biến/hàm: `camelCase`. Component/Class: `PascalCase`.
- File component: `PascalCase.tsx` (tiếng Việt không dấu: `DanhSachHocVien.tsx`). File khác: `kebab-case.ts`.
- Constant: `UPPER_SNAKE_CASE`.
- **DB table: tiền tố tiếng Anh + tiếng Việt không dấu, số ít** — `user_nguoi_dung`, `content_cot_moc`, `org_truong_nganh`. KHÔNG số nhiều tiếng Anh.
- **DB column: tiếng Việt không dấu** — `tao_luc`, `cap_nhat_luc`, `xu_ly_luc`, `id_nguoi_dung`. KHÔNG `created_at`/`updated_at`/`userId` (trừ bảng mới từ migration v2/v3 đã quy ước riêng).
- **API endpoint:** theo route thực tế CINS — `/api/truong/{id}/cau-hinh-tinh-diem`, `/api/tac-pham/:id/tac-gia`, `/api/follow`. Không bắt buộc versioning, không số nhiều tiếng Anh.
- Branch git: `kebab-case`.

### Code style
- Prettier + ESLint, format trước commit. Max line ~100. Indent 2 space.
- Single quote JS/TS. Import order: built-in → third-party → local.
- Comment cho logic phức tạp, KHÔNG comment thứ hiển nhiên.

### Cấu trúc thư mục (Next.js App Router)
```
app/                # routes
components/          # UI tái sử dụng
lib/                 # helper (lib/truong/queries.ts, lib/social/follow.ts)
supabase/sql/        # migration + seed SQL idempotent
docs/                # CINS_INSTRUCTION.md (router), CINS_FOUNDATIONS/SCHEMA/IMPLEMENTATION/DECISIONS, CINS_DEV_RULES.md, cursor_map_*
```

### Error handling
- Try-catch cho async có thể lỗi. Format API error: `{ error: { code, message } }`.
- Status đúng: 200/201/400/401/403/404/422/500.
- Frontend: toast rõ ràng, loading state mọi action async, confirm dialog trước action phá hủy, empty state có hướng dẫn, retry cho network quan trọng.

### Database
- Mọi đổi schema qua **migration idempotent**, KHÔNG sửa tay.
- FK + constraint đầy đủ. **Soft delete: CINS dùng `da_xoa BOOLEAN`** (vd. `social_binh_luan`, `chat_tin_nhan`), không phải `deleted_at`.
- Timestamp: `tao_luc` / `cap_nhat_luc` / `xu_ly_luc`. `thoi_diem DATE` = ngày xảy ra milestone (khác `tao_luc`).
- Transaction khi thao tác nhiều bảng.
- **SQL gotchas (CINS):** apostrophe trong HTML nhúng SQL dùng `&apos;`/`&#39;`; `backdrop-filter` trên overlay scroll phá `position:fixed` con → dùng `::before` pseudo-element.

### Git
- Branch: `feature/` `bugfix/` `hotfix/` `refactor/`. Conventional Commits (`feat:` `fix:` `chore:` `refactor:` `docs:` `style:` `test:`).
- CẤM commit thẳng `main`. PR có mô tả (làm gì / tại sao / ảnh hưởng). Commit lock file.

### Accessibility
- Semantic HTML (`<button>` không phải `<div onClick>`). Alt text. `<label>` liên kết input. Keyboard nav (tab/enter/esc). Focus visible. Contrast WCAG AA.

### SEO (trang public)
- Mỗi trang `<title>` + meta description riêng (`article_bai_viet` có `meta_title`/`meta_description`). 1 `<h1>`/trang, heading không nhảy cóc. Open Graph + Twitter Card. URL kebab-case có nghĩa (slug). Sitemap + robots. Canonical.

### UX
- Loading state (button disabled + spinner). Confirm dialog action phá hủy. Toast feedback. Validate ngay tại field lỗi. Empty state có hướng dẫn. Không auto-refresh làm mất data đang nhập. Touch target ≥ 44×44px mobile.

---

## 8. Streaming pattern (Next.js App Router)

> Vấn đề: page `await` Supabase top-level → cả trang đứng hình. Giải: Suspense + stream song song. **Mỗi session refactor 1 page**, không tự mở rộng.

### Nguyên tắc
1. **Tách UI tĩnh khỏi data fetch:** header/title/layout/step indicator/empty-state text → render ngay ở page cha. Phần data-heavy (query Supabase) → async Server Component riêng.
2. **Mỗi khối fetch = 1 `<Suspense fallback={<Skeleton/>}>`.** KHÔNG `Promise.all` ở page cha — để mỗi boundary stream độc lập, xong trước hiện trước.
3. **`loading.tsx`** cho route segment — skeleton tổng hiện ngay khi click `<Link>`, trước cả khi server render.
4. **Navigation:** `next/link` prefetch. Không `<a href>` raw internal. `router.push` chỉ khi có lý do (submit, redirect điều kiện).

### KHÔNG được đụng khi refactor streaming
- KHÔNG sửa logic query Supabase (cột select, filter, join, RLS).
- KHÔNG đổi cấu trúc data trả về.
- KHÔNG refactor component không liên quan data flow.
- KHÔNG tự thêm cache layer (`unstable_cache`, `revalidate`) trừ khi yêu cầu riêng.

### Skeleton — dùng design tokens CINS (§4)
- Base bg: `var(--cins-blue-soft)` hoặc neutral nhạt `rgba(0,0,0,.04)`; shimmer highlight tông blue nhạt. **Không** peach Sine Art.
- Border radius theo §4 (md 14 / lg 20). Icon Lucide.
- **Content-aware:** skeleton match layout thật (cùng size/spacing/aspect ratio) → không layout shift. Avatar tròn → skeleton tròn cùng size; dòng tên → width ~60%; dòng phụ → ~40%.

### Cấu trúc file sau refactor
```
app/[route]/
├── page.tsx                 // tĩnh + <Suspense> wrappers
├── loading.tsx              // skeleton tổng segment
└── _components/
    ├── SectionA.tsx         // async Server Component fetch A
    ├── SectionA.skeleton.tsx
    ├── SectionB.tsx
    └── SectionB.skeleton.tsx
```

```tsx
// page.tsx
export default function Page() {
  return (
    <div>
      <PageHeader />                                  {/* tĩnh, hiện ngay */}
      <Suspense fallback={<SectionASkeleton />}><SectionA /></Suspense>
      <Suspense fallback={<SectionBSkeleton />}><SectionB /></Suspense>
    </div>
  );
}
```
```tsx
// _components/SectionA.tsx
import { createClient } from '@/lib/supabase/server';
export async function SectionA() {
  const supabase = createClient();
  const { data } = await supabase.from('content_cot_moc').select('id, tieu_de, thoi_diem');
  return <div>{/* render */}</div>;
}
```

### Naming streaming
- Async Server Component fetch: `[Domain].tsx` PascalCase tiếng Việt không dấu (`DanhSachCotMoc.tsx`, `LuoiTacPham.tsx`).
- Skeleton: same name + `.skeleton.tsx` hoặc `[Domain]Skeleton`.

### Checklist commit (streaming)
- [ ] Page cha không còn `await` trực tiếp (trừ auth/session nếu cần).
- [ ] Mỗi Suspense boundary có Skeleton tương ứng.
- [ ] `loading.tsx` tồn tại cho segment.
- [ ] Skeleton dùng token CINS (blue/neutral), radius 14/20, icon Lucide — **không** peach/Feather.
- [ ] Không đổi logic query Supabase.
- [ ] Test DevTools Network throttle Slow 3G: UI tĩnh hiện ngay, skeleton shimmer, data stream sau.

---

## 9. Vòng đời media & xóa

Media KHÔNG ở Supabase Storage: **video → Bunny Stream** (source ở R2), **ảnh → Cloudflare Images**. DB chỉ lưu **metadata + id tham chiếu**, không lưu file.

### Xóa = 1 hành động, 2 cách xử lý
- **DB = soft delete**: set `da_xoa = TRUE` (KHÔNG hard-delete row) — giữ bản ghi, chỉ ẩn (đồng bộ ẩn dụ sổ cái + Journey là source of truth). Mọi query list/feed/lens lọc `da_xoa = FALSE` — tốt nhất qua **RLS / helper chung**, không nhớ-thủ-công từng query.
- **Media ngoài = hard delete**: gọi Bunny / Cloudflare Images API xóa asset thật (giảm chi phí + quota). Gọi từ **server** bằng key bí mật, KHÔNG từ client.

### Thứ tự & độ bền
- Soft-delete DB **trước** (phản hồi user tức thì) → xóa asset ngoài **async / queue**.
- Xóa asset **idempotent** + chịu retry; lưu trạng thái "đã xóa asset" để không gọi API trùng (404). Lỗi xóa asset KHÔNG được chặn/đảo ngược soft-delete → đẩy vào hàng chờ retry.
- Hệ quả: item soft-deleted **không khôi phục đầy đủ** (text/metadata còn, ảnh/video đã mất). Đừng code "restore" với giả định media còn nguyên.

### Upload nháp = upload ngay + dọn rác mồ côi
- Thêm media lúc soạn nháp → **upload thẳng Bunny/Cloudflare NGAY** (Direct Upload), preview bằng URL đã upload / object URL tạm. KHÔNG base64 vào localStorage, KHÔNG lưu `blob:` xuống DB.
- Asset đã upload nhưng chưa gắn bài = trạng thái **`pending`** (ghi `tao_luc` + owner). Bấm Đăng → `attached`. Hủy/đóng không đăng → rác mồ côi.
- **Cron dọn rác (bắt buộc):** quét asset `pending` quá ngưỡng (vd >24h) chưa gắn → xóa thật trên Bunny/Cloudflare + xóa metadata. Idempotent + chừa khoảng an toàn (đừng xóa asset vừa upload vài phút). Không có cron → rác tích lũy, **vẫn tốn tiền + quota**.

---

## 10. State & persistence (client)

Tách 2 mục tiêu — cơ chế khác nhau, đừng gộp:

- **"Chuyển trang mượt" = RAM**, KHÔNG phải localStorage: Router Cache + `<Link>` prefetch + `staleTimes`; cache TanStack/SWR cũng ở RAM. KHÔNG nhét feed/data lớn vào localStorage để "chuyển trang nhanh".
- **"Sống qua reload (F5 / mở lại)" = localStorage/IndexedDB** — chỉ cho:
  - **Nháp đang soạn** (caption + tag AI đã gật, chưa đăng): localStorage, autosave debounce ~1s, **key theo user**; xóa khi **đăng xong** và khi **logout**. Media của nháp KHÔNG lưu local (đã upload — xem §9).
  - Preferences UI (theme, tab cuối, thu/mở, onboarding), tag gần đây, hàng chờ optimistic (like/follow lúc mạng chập chờn). Data lớn (snapshot Journey của chính chủ, stale-while-revalidate) → **IndexedDB**.

### KHÔNG persist như "sự thật" (đặc thù CINS)
- **Data verified-moat** ("đã xác thực bởi org", `da_verify`): KHÔNG phục vụ từ cache local như đang đúng — org thu hồi mà client vẫn hiện badge cũ = **phá moat**. Luôn lấy tươi từ server (hoặc hiện cached kèm trạng thái "đang cập nhật").
- Mọi cache persistent phải tôn trọng `da_xoa` + vô hiệu khi data đổi (bài đã xóa KHÔNG sống dai trên client sau reload).

### Guardrail
- **Xóa cache theo-user khi logout** (máy dùng chung phổ biến ở VN — không dọn = lộ nháp/Journey của user trước).
- Session/token ở **httpOnly cookie** (`@supabase/ssr`), KHÔNG localStorage (đồng bộ §6).
- localStorage **đồng bộ, chặn main thread, ~5MB** → chỉ thứ nhỏ (prefs, nháp, tag gần đây); lớn hơn → IndexedDB.

---

## 11. Checklist tổng trước khi commit

- [ ] Không `select('*')`, list có pagination (`.range` + `count`).
- [ ] Tên bảng/cột/API theo convention CINS (§7), không `created_at`/số nhiều tiếng Anh.
- [ ] Không hardcode secret; không log PII.
- [ ] Ảnh optimize + lazy; upload dùng optimistic + Direct Upload.
- [ ] Không import thư viện thừa.
- [ ] Đổi schema → migration idempotent, không sửa DB tay.
- [ ] Design tokens CINS (blue/Lucide/**Be Vietnam Pro duy nhất**, mono chỉ cho code), không peach/Feather/gray mặc định, không Anton/Crimson (deprecated).
- [ ] Lighthouse > 85 cho trang vừa sửa (trang public).

---

*File này thay thế cho QUICK_RULES/PERFORMANCE/SECURITY/CONVENTIONS/STREAMING_REFACTOR (vốn viết cho Basakila/Sine Art). Mọi tham chiếu `AGENTS.md`, `BASAKILA_SCHEMA_REF.md`, design system peach đã được gỡ/chuyển sang chuẩn CINS.*
