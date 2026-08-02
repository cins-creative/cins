# PLAN: Tăng tốc từ lúc bấm "Đăng nhập" đến khi thấy trang chủ

Ngày: 03/08/2026 · Dựa trên scan codebase + log topbar ấm (~100–200ms)
Trạng thái: **Bước 1–4 đã implement** (2026-08-03). Còn bước 5–8 tùy đo lại.

## Chuỗi thời gian hiện tại (mỗi bước nối tiếp bước trước)

```
bấm "Đăng nhập"
 └─ POST /api/auth/login          signInWithPassword (bcrypt phía Supabase) + query profile
      └─ window.location.assign("/")   ← reload TOÀN TRANG: tải lại HTML + toàn bộ JS/CSS + font Google
           └─ middleware "/"           supabase.auth.getUser()  ← round-trip mạng #1 tới Supabase Auth
                └─ RSC render "/" (force-dynamic, KHÔNG loading.tsx, KHÔNG Suspense)
                     ├─ getCurrentSessionAndProfile   getUser() ← round-trip mạng #2 + query profile
                     ├─ CinsAppTopbar                 4 query TUẦN TỰ
                     └─ HomeWorldJourneyMain          fetchOwnerBySlug → listLinhVucForHub
                          └─ Promise.all 7 nhánh, trong đó feed + gallery mỗi cái là
                             một pipeline ~30–50 query nhiều tầng
                               └─ HomeModuleColumn trái + phải, mỗi module tự fetch
                                    └─ HTML mới bắt đầu gửi về  ← user vẫn nhìn trang trắng đến đây
                                         └─ hydrate bundle client
```

Điểm mấu chốt: **không có byte HTML nào được gửi cho tới khi toàn bộ query xong**, vì `app/page.tsx` `await` thẳng `HomeWorldJourneyMain` và route không có `loading.tsx` cũng không có `Suspense`. Đây là đúng cái mà `CINS_DEV_RULES.md` §8 mô tả là "page await Supabase top-level → cả trang đứng hình".

## File neo

| Vai trò | Path |
|---|---|
| Form login (redirect) | `app/login/LoginPasswordForm.tsx` (dòng 137–138) |
| API login | `app/api/auth/login/route.ts` |
| Middleware (getUser #1) | `middleware.ts` (`resolveSession`, dòng 178–219) |
| Trang chủ | `app/page.tsx` — `force-dynamic`, không Suspense |
| Session + profile (getUser #2) | `lib/auth/session.ts` |
| Shell + topbar | `components/cins/CinsShell.tsx`, `components/cins/CinsAppTopbar.tsx` |
| Nội dung trang chủ | `components/cins/home-v2/HomeWorldJourneyMain.tsx` |
| Pipeline feed | `lib/cins/worldJourneyFeedFetch.ts` (`buildWorldJourneyFeedRanked`, dòng 403–593) |
| Pipeline gallery | `lib/cins/worldJourneyGalleryFetch.ts` |
| Cột module | `components/cins/home-adaptive/HomeModuleColumn.tsx` + `modules/*` |

---

## Nguyên nhân, xếp theo mức ảnh hưởng

### N1 — Trang chủ không stream (ảnh hưởng lớn nhất về cảm nhận)

`app/page.tsx` không có `Suspense`, repo cũng không có `app/loading.tsx`. Nhánh chậm nhất trong `Promise.all` quyết định thời điểm user thấy pixel đầu tiên. Trong khi đó `app/[slug]/page.tsx` và `app/[slug]/journey/page.tsx` đã được refactor streaming — trang chủ bị bỏ sót.

### N2 — Gallery được fetch dù mặc định không hiển thị

`HomeWorldJourneyMain` luôn gọi `fetchWorldJourneyGalleryPageCached`. Nhưng gallery chỉ hiện khi `?view=gallery` (`WorldJourneyFeed.feedViewHref`, dòng 101–110). Lượt vào trang chủ mặc định đang trả tiền cho **một pipeline query nặng hoàn toàn không dùng đến**.

### N3 — Pipeline feed không có cache liên request khi render trang

`fetchWorldJourneyFeedPageCached` (dùng cho SSR) chỉ bọc `cache()` của React — dedupe trong **một** request. Bản `...ForApi` lại có `unstable_cache` với `revalidate`. Nghĩa là: gọi qua API (scroll, đổi filter) thì có cache, còn **lần load trang chủ — đúng lúc user vừa đăng nhập và sốt ruột nhất — luôn dựng lại pool từ đầu**: 6 query song song, rồi 10 query song song, rồi `choPhepLinks`, `loadVisibilityNgoaiLeIndex`, `buildSelfMilestonesForCotMocs` + `loadAuthors`, `attachSocialState`.

### N4 — Topbar chạy 4 query tuần tự

`CinsAppTopbar` dòng 29–40: `countUnreadNotifications` → `getCurrentUserIsCinsAdmin` → `getBanHangEnabled` → `countAdminInboxStats`, mỗi cái `await` riêng. Bốn round-trip xếp hàng chỉ để vẽ vài badge, và chúng chặn cả shell.

### N5 — Hai lần `auth.getUser()` cho mỗi điều hướng *(hạ ưu tiên sau đo)*

Log ấm: `getUser()` thường **7–15ms** (xác minh JWT cục bộ), thỉnh thoảng 400–670ms khi refresh token. Middleware + RSC vẫn gọi hai lần nhưng không phải round-trip mạng mỗi lần như giả định ban đầu. Bước 6 (`getClaims`) gần như vô nghĩa ở trạng thái ấm.

### N6 — Redirect bằng full page load

`window.location.assign(json.redirect || "/")` tải lại toàn bộ tài liệu: bundle JS, CSS, font. Cookie phiên đã được set bởi chính response của `POST /api/auth/login` rồi, nên về lý thuyết `router.replace()` + `router.refresh()` là đủ. Cần kiểm chứng cẩn thận vì repo có `HardNavGuard` và lịch sử lỗi cookie/SSR (xem `PLAN_auth_session_on_dinh.md`) — đây là mục rủi ro cao nhất trong plan này.

### N7 — Font Google chặn render

`app/layout.tsx` dòng 84–92: hai thẻ `<link rel="stylesheet">` tới `fonts.googleapis.com` (Material Symbols + Crimson Pro) nằm trong `<head>` → render-blocking trên mọi lần load. Chỉ đáng làm sau khi N6 xong, hoặc nếu giữ full reload thì đáng làm ngay.

---

## Các bước đề xuất

Mỗi bước là một session riêng, không gộp.

| Bước | Việc | Rủi ro | Kỳ vọng |
|---|---|---|---|
| 1 | Thêm `app/loading.tsx` + bọc `HomeWorldJourneyMain` trong `Suspense` với skeleton | Thấp | Thấy shell gần như tức thì thay vì trang trắng |
| 2 | Bỏ fetch gallery khi không `?view=gallery`; đọc `searchParams` trong `page.tsx` | Thấp | Cắt trọn một pipeline nặng khỏi đường mặc định |
| 3 | Tách feed / cột trái / cột phải / pending-confirmations thành các `Suspense` boundary độc lập (bỏ `Promise.all` ở cha, theo §8) | Thấp–TB | Nhánh nhanh hiện trước, không chờ nhánh chậm nhất |
| 4 | Topbar: `Promise.all` cho 4 query, hoặc đẩy badge vào `Suspense` riêng | Thấp | Bớt 3 round-trip nối tiếp trước khi shell hiện |
| 5 | Cho SSR trang chủ dùng `unstable_cache` như bản `...ForApi` (revalidate ngắn, key theo `viewerId`), ghi rõ cách invalidate | TB — §5 dev rules yêu cầu không thêm cache tuỳ tiện; ở đây là dùng lại lớp cache đã tồn tại | Lần load thứ hai trở đi rẻ hơn nhiều |
| 6 | Thay `getUser()` bằng `getClaims()` ở middleware (giữ `getUser()` chỗ cần user đầy đủ) | TB — đụng auth | Bớt 1 round-trip mạng mỗi điều hướng |
| 7 | Đổi redirect sau login sang `router.replace` + `router.refresh` | **Cao** — đụng auth/cookie | Bỏ hẳn một lần tải lại toàn bộ bundle |
| 8 | Đưa Material Symbols / Crimson Pro sang `next/font` hoặc preload async | Thấp | Bỏ 2 request chặn render |

Đề xuất làm **1 → 2 → 3 → 4** trước: rủi ro thấp, không đụng logic query, không đụng auth, và chiếm phần lớn cải thiện mà user cảm nhận được. Bước 5–8 quyết định sau khi đo lại.

## Cần đo trước khi và sau khi sửa

Plan này dựa trên đọc code, chưa có số. Trước bước 1 nên lấy baseline:

1. DevTools → Network, tick "Disable cache", đăng nhập → ghi lại: thời gian `POST /api/auth/login`, TTFB của document `/`, và thời điểm First Contentful Paint.
2. Thêm log tạm `console.time` quanh `fetchWorldJourneyFeedPageCached` và `fetchWorldJourneyGalleryPageCached` để biết mỗi pipeline tốn bao nhiêu ms trên dữ liệu thật.
3. Đếm số query Supabase cho một lần render trang chủ (Supabase Dashboard → Logs, lọc theo khoảng thời gian).

Không có 3 con số này thì không biết bước nào đáng làm tiếp sau bước 4.

## Không đụng tới

- Logic query Supabase (cột select, filter, join, RLS) — chỉ đổi *khi nào* gọi, không đổi *gọi cái gì*.
- Cấu trúc data trả về cho client component.
- Luồng OAuth Google / PKCE trong `app/auth/callback/route.ts`.
