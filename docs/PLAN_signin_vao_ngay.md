# PLAN: Sign-in → vào shell ngay, load content sau

Ngày: 14/08/2026 · Scan `LoginPasswordForm` / `auth/callback` / `app/page.tsx` / `CinsShell` / `HomeWorldJourneyFeedBlock` + plan cũ  
Trạng thái: **Bước 1 đã implement** (2026-08-14). Còn bước 2 (OAuth landing) · 3a/3b · 4.

Xuất phát từ: *«mỗi lần đăng nhập rồi vào trang chủ khá chậm — signin là vào luôn, load content sau»*.

---

## Kết luận đi trước

Cảm giác chậm **sau khi bấm Đăng nhập** không còn chủ yếu vì pipeline feed (đã tách stream + `unstable_cache` 20s). Nút thắt còn lại là **user chưa được coi là “đã vào app” cho đến khi document `/` render xong**.

Hiện tại: cookie phiên đã có → **vẫn unload toàn bộ trang** → TTFB middleware + RSC + topbar + feed. User nhìn spinner login / trang trắng / «Đang đăng nhập…» thay vì chrome trang chủ.

**Đúng hướng:** sau khi auth thành công, **sơn ngay khung logged-in** (sidebar + topbar + skeleton feed). Feed, badge, module sidebar stream sau. Không persist feed localStorage (đã loại ở `PLAN_home_instant_paint` / DEV_RULES §10).

| Ý tưởng | Quyết định | Vì sao |
|---|---|---|
| Soft-nav sau password / OTP (`router.replace`) | **Làm trước** | Cookie đã nằm trên response `POST /api/auth/login`; full reload chỉ để SSR “chắc” thấy cookie — trả giá bundle + font + TTFB |
| Overlay skeleton logged-in ngay khi `ok: true` | **Làm cùng bước 1** | `app/loading.tsx` hiện **không có sidebar/topbar** → soft-nav trần vẫn cảm giác “chưa vào” |
| OAuth: bỏ HTML 200 landing | **Không** | Safari/iOS bỏ `Set-Cookie` trên 302 — `oauthSessionLandingResponse` bắt buộc |
| OAuth: landing = chrome skeleton, không chữ «Đang đăng nhập…» | **Làm** | Đó là first paint sau Google; hiện là trang trống rồi load `/` lần nữa |
| localStorage / IndexedDB snapshot feed lúc login | **Không** | §10; login nguội chưa có snapshot hợp lệ của user mới |
| `getClaims()` middleware / bỏ `getUser` lần 2 | **Để sau, PR riêng** | Đụng auth; không phải cảm giác “vào app” |
| Tách feed khỏi `Promise.all` owner+layout trong FeedBlock | **Bước content, sau “vào ngay”** | User đã vào shell rồi mới thấy bài; layout đang cổng chung vì CSS 2 cột |

---

## Hiện trạng (đã kiểm chứng code)

### Đã ship — không làm lại

| Việc | Neo | Plan cũ |
|---|---|---|
| `app/loading.tsx` + Suspense ngoài `HomeWorldJourneyMain` | `app/page.tsx` | `PLAN_login_perf` 1 |
| Gallery SSR chỉ khi `?view=gallery\|video` | props Main | `PLAN_login_perf` 2 |
| Topbar `Promise.all` 3 query (admin inbox vẫn nối sau) | `CinsAppTopbar` | `PLAN_login_perf` 4 |
| Feed không chờ 7 nhánh cũ; ranked SSR = `unstable_cache` 20s | FeedBlock / fetch | `PLAN_home_instant_paint` 1–2 |
| `flushDeferredAuthCookies` trước khi trả JSON / landing | login API + callback | ổn định cookie |

### Chuỗi thật sau sign-in (còn chậm)

**Mật khẩu / OTP / quên mật khẩu**

```
POST /api/auth/login   (signInWithPassword + query profile → chọn / hay /onboarding)
  └─ Set-Cookie phiên  ✓ xong
       └─ window.location.assign("/")     ← UNLOAD bundle + CSS + font Google
            └─ middleware getUser()
                 └─ page.tsx await session+profile   ← quyết guest vs authed TRƯỚC khi vẽ CinsShell
                      └─ CinsShell await session (cache) + CinsAppTopbar (badge, chưa Suspense)
                           └─ mới thay loading.tsx bằng shell + skeleton feed
                                └─ FeedBlock Promise.all(owner, feed, layout, gallery?)
```

`loading.tsx` **không chạy** trên hard navigation theo cách user cảm nhận được sớm: browser đã rời `/login`, chờ TTFB `/`. Comment trong form: *«Reload đầy đủ để SSR nhận session cookie mới»* — đó là lý do lịch sử, không còn là cách rẻ nhất.

**Google OAuth**

```
Google → GET /auth/callback
  exchangeCode + getUser + query profile
  └─ 200 HTML landing («Đang đăng nhập…») + Set-Cookie   ← bắt buộc Safari
       └─ location.replace("/")   ← document load lần 2, cùng chuỗi RSC như trên
```

Hai lần document: landing trống + homepage. User không “vào app” ở bước nào trước khi feed/topbar xong.

### File neo

| Vai trò | Path |
|---|---|
| Password login + hard reload | `app/login/LoginPasswordForm.tsx` (~dòng 138–139) |
| OTP / register session | `components/auth/EmailOtpVerification.tsx` |
| Forgot password | `app/login/ForgotPasswordForm.tsx` |
| Login API (cookie + redirect) | `app/api/auth/login/route.ts` |
| OAuth callback + landing | `app/auth/callback/route.ts`, `lib/auth/oauth-session-landing.ts` |
| Gate guest vs logged-in | `app/page.tsx` (`await getCurrentSessionAndProfile` top-level) |
| Shell chặn topbar | `components/cins/CinsShell.tsx`, `CinsAppTopbar.tsx` |
| Content sau shell | `HomeWorldJourneyFeedBlock.tsx` (`Promise.all` owner+feed+layout) |
| Skeleton segment (thiếu chrome) | `app/loading.tsx` |
| Hard-nav chỉ khi đổi shell org/profile | `lib/navigation/hard-nav.ts` — **`/login` → `/` không bị HardNavGuard ép** (`app:login` vs `app:home`, không fragile) |

---

# Database

Không đổi schema / RLS / cột. Không migration.

---

# API

Không endpoint mới.

| Route | Đổi? | Ghi chú |
|---|---|---|
| `POST /api/auth/login` | Tối thiểu | Giữ `{ ok, redirect }`. Cookie vẫn ghi trên JSON response. Có thể thêm `giai_doan`/`slug` (đã query sẵn) để client sơn topbar optimistic — **không bắt buộc bước 1** |
| `GET /auth/callback` | Không đổi exchange | Chỉ đổi HTML landing (cùng helper) |
| Ranked feed / gallery | Không | Đã cache |

**Không** bỏ query `giai_doan` trên login/callback: vẫn cần chọn `/` vs `/onboarding`. Homepage cũng `redirect("/onboarding")` khi `giai_doan === null` — fallback an toàn nếu client đi `/` sớm.

---

# Frontend

## Mục tiêu UX

1. **≤ 1 frame sau `ok: true` (password/OTP):** user thấy khung trang chủ logged-in (nav + cột giữa skeleton), không còn form login / không trắng trang.
2. **OAuth:** landing 200 trông như cùng khung đó, rồi `/` hydrate content — không trang chữ «Đang đăng nhập…».
3. Bài feed, module sidebar, badge chuông/shop **đến sau**, content-aware skeleton (đã có `HomeWorldJourneySkeleton`).
4. Onboarding: nếu `redirect === "/onboarding"` thì vào onboarding ngay (không giả home rồi đá).

## Không làm trên UI

- Không đổi visual language feed / token màu.
- Không snapshot feed vào storage.
- Không bỏ landing 200 OAuth.

## Kiến trúc “vào ngay”

Ba lớp, cùng một visual skeleton:

```
Lớp A — Client ngay sau auth (password/OTP)
        Overlay / replace view = LoggedInChromeSkeleton
        rồi router.replace(redirect)

Lớp B — loading.tsx + (tuỳ chọn) Suspense topbar
        Cùng chrome, để soft-nav / F5 nguội không tụt về khung cụt

Lớp C — OAuth landing HTML
        Inline cùng chrome (CSS tối thiểu, không đợi bundle)
        location.replace(destination)
```

Chrome skeleton = `cins-shell` + `CinsShellNav` chỗ trống + topbar trống + `HomeWorldJourneySkeleton`. Không cần data user (avatar có thể vòng tròn trống).

---

# Steps (mỗi bước = một session implement)

## Bước 0 — Đo baseline (ngắn, cùng session bước 1 nếu cần)

DevTools Network (Disable cache) + Performance, **đăng xuất rồi đăng nhập mật khẩu**:

| Metric | Cách lấy |
|---|---|
| `POST /api/auth/login` duration | Timing XHR |
| Thời điểm click Đăng nhập → first paint khung home (nav/skeleton) | Performance |
| TTFB document `/` sau assign | Timing document |
| Google: thời gian landing HTML → first paint `/` | Filmstrip |

Ghi vào mục Nhật ký đo dưới. Không chặn bước 1 nếu chỉ có 1 lần đo dev.

## Bước 1 — Password / OTP / forgot: vào shell ngay ✅ đã ship (2026-08-14)

**Đã làm:** `enterAfterAuth` + overlay portal `LoggedInChromeSkeleton` (sống qua `router.replace`) · `app/loading.tsx` cùng chrome · `data-cins-authed-home` trên `/` logged-in · fallback `location.assign` nếu RSC ra guest home. Gọi từ LoginPasswordForm / EmailOtpVerification / ForgotPasswordForm.

**Ý**

1. Helper client chung (vd. `enterAfterAuth(redirect: string)`):
   - Nếu `redirect` là `/onboarding` hoặc `?next=` khác `/`: `router.replace(url)` (không overlay home).
   - Nếu `/`: **sơn LoggedInChromeSkeleton ngay** (state trên login page hoặc portal overlay full-viewport), *rồi* `router.replace("/")`.
   - Không `window.location.assign` trên đường thành công.
2. Gọi từ: `LoginPasswordForm`, `EmailOtpVerification`, `ForgotPasswordForm`.
3. `app/loading.tsx`: nâng lên **cùng chrome** (sidebar + cột + skeleton feed), không chỉ `cins-shell-column` cụt — để khoảng chờ RSC không tụt UX.
4. **Fallback cứng:** nếu sau replace, RSC vẫn ra `GuestHomePage` (cookie chưa kịp vào request) → `window.location.assign("/")` một lần. Timeout ngắn (vd. detect guest shell / không có `AuthGateRoot initialAuthenticated`) — không để user kẹt form login đã submit.

**Rủi ro:** TB — cookie + RSC. Mitigation: fallback hard nav; không đổi cách ghi cookie (`flushDeferredAuthCookies` giữ nguyên). `HardNavGuard` không chặn `router.replace` programmatic.

**Kỳ vọng:** mất hẳn một lần tải JS/CSS/font; cảm giác “đã vào CINs” ngay khi API `ok`.

## Bước 2 — OAuth landing = chrome skeleton

**Ý:** `oauthSessionLandingResponse` giữ 200 + Set-Cookie + `location.replace`. Thay body chữ bằng HTML/CSS tĩnh **cùng bố cục** bước 1 (không import React, không đợi `/_next`). `meta refresh` giữ.

**Rủi ro:** Thấp — không đổi cookie/exchange. Cẩn thận escape URL (đã có `escapeHtmlAttr`).

**Kỳ vọng:** sau Google, user đã “ở trong app” trên landing; `/` chỉ thay skeleton bằng content.

## Bước 3 — Shell không chờ badge topbar / session page

**Ý** (cảm giác F5 + bổ sung bước 1):

1. `CinsAppTopbar` bọc `<Suspense fallback={<TopbarSkeleton/>}>` trong `CinsShell` — badge không chặn `<main>`.
2. `app/page.tsx`: **không** `await session` trước khi return khung. Khung `CinsShell` + Suspense; nhánh guest vs authed nằm trong async child (`HomeAuthBranch`). Guest F5: có thể flash skeleton logged-in rất ngắn nếu cookie không có — **cần fallback skeleton trung tính hoặc đọc hint cookie session tồn tại** (chỉ boolean “có sb-auth cookie”, không parse JWT ở client). Nếu flash guest đáng sợ: chỉ stream topbar, **giữ** await session ở page cho bước này và làm 3.1 thôi.

Đề xuất tách: **3a topbar Suspense** (thấp rủi ro) → đo → **3b bỏ await session ở page** chỉ nếu guest flash chấp nhận được hoặc có cookie-hint.

**Rủi ro:** 3a thấp; 3b TB (flash guest/authed).

## Bước 4 — Content: bài feed không chờ owner+layout

Chỉ sau khi bước 1–2 đã cho cảm giác “vào”. `FeedBlock` vẫn `Promise.all([owner, feed, layout, gallery])` — nhánh chậm nhất cổng thẻ bài.

**Ý:** stream cột giữa (`WorldJourneyFeed` + milestones) khi `feedPage` xong; owner/layout vào boundary riêng. Cột sidebar: skeleton slot cho đến layout (đã có ExtraModules). Không đổi query ranked.

**Rủi ro:** TB — CSS 2 cột / `childMap` (comment hiện tại trong FeedBlock). Cần giữ slot `[data-ha-module]` trống, không unmount grid.

**Không** làm IndexedDB (`PLAN_home_instant_paint` bước 5) trong đợt này.

## Không làm trong đợt này

- `getClaims()` / bỏ `getUser` middleware (`PLAN_login_perf` bước 6) — PR auth riêng.
- `next/font` Material Symbols / Crimson (`PLAN_login_perf` bước 8) — hữu ích cho **mọi** hard load, không đặc thù sign-in; làm sau nếu bước 1 xong mà OAuth landing vẫn chờ font.
- Đổi TTL ranked 20s, TanStack Query, service worker.

---

# Edge cases

| Case | Xử lý |
|---|---|
| `giai_doan === null` | `redirect` API/callback = `/onboarding` — helper **không** sơn home skeleton |
| `?next=/cua-hang` (v.v.) | `router.replace(safeNext)` — không overlay home |
| Cookie chưa tới RSC (Safari, ITP) | Fallback `location.assign` một lần |
| Login đã có phiên (`/login` redirect sẵn) | Không đụng |
| User bấm Back sau soft-nav | Về `/login` với phiên → page login đã `redirect("/")` — OK |
| Đăng nhập username (slug) | API vẫn tra email server-side; bước 1 không đổi |
| Register có session ngay | Đã `assign("/onboarding")` — chuyển helper, đích onboarding |
| Google `intent=register` | Landing → `/onboarding?intent=register`, chrome onboarding không bắt buộc bước 2 (có thể skeleton generic) |
| `?view=gallery` sau login | Hiếm; default `/` không gallery |
| Chat poll mount khi vào shell | `CinsChatShellBridge` mount sớm hơn — chấp nhận; không trì hoãn paint vì chat |

---

# Security

- Session vẫn httpOnly cookie; không đưa token vào overlay/localStorage.
- Overlay chỉ UI tĩnh — không tin client là đã authed cho data (RSC + RLS vẫn nguồn sự thật).
- Fallback hard nav nếu guest leak.
- Rate-limit login API giữ nguyên.
- Landing OAuth: không nhúng script ngoài; `location.replace` path same-origin đã normalize.

---

# Thứ tự & phạm vi session

| Bước | Việc | Rủi ro | Phụ thuộc |
|---|---|---|---|
| 0 | Đo 1 lần login → home | — | song song 1 |
| 1 | Soft-nav + overlay chrome + `loading.tsx` đủ shell | TB | — |
| 2 | OAuth landing cùng chrome | Thấp | visual bước 1 |
| 3a | Suspense topbar | Thấp | — |
| 3b | Bỏ await session ở `page.tsx` | TB | 3a + đo flash |
| 4 | Feed cards độc lập owner/layout | TB | sau 1–2 |

Một bước / một PR (`DEV_RULES` §1). Không gộp 1+4+getClaims.

## Không đụng tới

- Logic query ranked / RLS / `da_verify`.
- `exchangeCodeForSession` / PKCE / `flushDeferredAuthCookies`.
- HardNavGuard rules (login→home vốn không hard).
- Guest home marketing.

---

# Verify (sau mỗi bước)

1. Đăng xuất → đăng nhập **email+mật khẩu** (Disable cache): từ `ok` đến khung nav+skeleton **không** chờ document `/` xong; form login biến mất ngay.
2. User cần onboarding: không thấy home, vào `/onboarding`.
3. `?next=` hợp lệ: vào đúng path, không overlay home.
4. Cưỡng bức cookie fail (chặn cookie tạm): fallback reload `/`, không kẹt spinner.
5. Google OAuth desktop + **Safari iOS**: phiên còn sau tắt app; landing không phải trang chữ trần.
6. F5 `/` đã login: không regress feed; Slow 3G: chrome/skeleton trước bài.
7. Đăng xuất: không còn overlay/auth hint; guest home đúng.
8. (Bước 4) Thẻ bài xuất hiện khi feed xong dù sidebar còn skeleton.

---

# Nhật ký đo

_(Điền khi implement)_

| Lần đo | Máy / mạng | POST login | Click → khung home | TTFB `/` | OAuth landing → `/` | Ghi chú |
|---|---|---|---|---|---|---|
| | | | | | | |

---

# Liên kết plan cũ

- `PLAN_login_perf.md`: bước 1–4 đã ship; bước **7** (bỏ full reload) = lõi bước 1 plan này. Bước 6 + 8 vẫn để sau.
- `PLAN_home_instant_paint.md`: feed stream / cache ranked — **F5 đã login**. Plan này xử lý **khoảng chết từ sign-in → first logged-in pixel**.
- `PLAN_auth_session_on_dinh.md` (archived): lý do từng hard-reload; middleware `/login` vẫn phải sync cookie — **không regress**.
- `PLAN_client_cache.md`: không dùng localStorage để giả tốc độ login.
