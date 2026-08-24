# PLAN BUILD — App full native (RN/Expo), chia theo SESSION (chatbox)

> Chiến lược gốc: [`PLAN_app_native_rn.md`](./PLAN_app_native_rn.md). File này **liệt kê từng session để agent build**, mỗi session gọn trong một chatbox, không tràn context.
> Repo app: `C:\Users\nguye\Desktop\Code Web\cins_app_main` (Expo). Repo web (backend + tham chiếu): `C:\Users\nguye\Desktop\Code Web\cins`.
> Thay thế [`PLAN_app_mobile_BUILD_SESSIONS.md`](./PLAN_app_mobile_BUILD_SESSIONS.md) (Capacitor — SUPERSEDED). **A1–A2 server push: đã xong, tái dùng, không làm lại.**

---

## Cách dùng file này

1. Mỗi session = một chatbox mới. Mở session → **đọc lại `PLAN_app_native_rn.md` §0–§6** + mục session tương ứng ở đây.
2. Làm **đúng scope session**, không tràn sang session sau. Xong → cập nhật cột **Trạng thái** + để lại **Handoff** (đã đổi gì, còn treo gì).
3. Session sau đọc Handoff của session trước trước khi bắt đầu.
4. Trước khi động vào DB/schema → theo rule SSOT (`CINS_DEV_RULES.md` §1). App **không** tạo bảng mới; chỉ dùng cái đã có.
5. Bảo mật: không đưa `service_role` xuống app; logic nhạy cảm gọi `/api/*`.

---

## Bản đồ phụ thuộc

```
Phase 0 (nền)      R0 → R1 → R2 → R3 → R4
Phase 1 (lõi)              R5 → R6 → R7 → R8   (cần R0–R4)
Phase 2 (doanh thu)                    R9 → R10
Phase 3 (phụ)      R11a→R11b,R11c  R12a  R12b  R13  R14  R15  (song song, cần R0–R4)
Phase 4 (phát hành)                          R16
```

---

## Bảng session

| ID | Tên | Phase | Phụ thuộc | Model đề xuất · effort | Trạng thái |
|---|---|---|---|---|---|
| R0 | Scaffold Expo + chạy Android + EAS | 0 | — | Grok 4.5 · Medium | ⏳ chưa |
| R1 | Design system (tokens → RN) + component base | 0 | R0 | Composer 2.5 · Low | ⏳ |
| R2 | Auth: Supabase + SecureStore + Google Sign-In | 0 | R0 | Grok 4.5 · Medium (High nếu kẹt OAuth) | ⏳ |
| R3 | API layer (Supabase + `/api/*` + TanStack Query) | 0 | R2 | Grok 4.5 · Medium | ⏳ |
| R4 | Navigation shell (bottom tab + stack + deep link) | 0 | R1,R3 | Grok 4.5 · Medium | ⏳ |
| R5 | Journey feed + Profile | 1 | R4 | Grok 4.5 · Medium | ✅ |
| R6 | Post detail — renderer block ⚠ | 1 | R5 | Opus 5 (plan) → Grok 4.5 · High | ✅ |
| R7 | Gallery / album (FlashList grid) | 1 | R4 | Composer 2.5 · Low–Medium | ✅ |
| R8 | Chat list + room (realtime) ⚠ | 1 | R4 | Opus 5 (plan) → Grok 4.5 · High | ✅ |
| R9 | Shopping browse + product + cart + checkout | 2 | R4 | Grok 4.5 · Medium | ✅ |
| R10 | Seller orders **native** (list + chi tiết + đổi trạng thái) | 2 | R4 | Grok 4.5 · Medium | ✅ |
| R11a | Org/Academy/University/Community — **xem** native | 3 | R4 | Grok 4.5 · Medium | ✅ |
| R11b | Academy quản lý native (thành viên · khoá · học phí) | 3 | R11a | Grok 4.5 · Medium | ✅ |
| R11c | Community/University quản lý native (roster · bài · sự kiện) | 3 | R11a | Grok 4.5 · Medium | ✅ |
| R12a | Billing hub native (đọc; tính tiền qua `/api/*`) | 3 | R4 | Grok 4.5 · Medium | ✅ |
| R12b | Admin native (bảng quản trị chính) | 3 | R4 | Grok 4.5 · Medium | ✅ |
| R13 | Push register + Notifications center + settings | 3 | R3 | Grok 4.5 · Medium | ✅ |
| R14 | Upload native (ảnh/video) + Share intent | 3 | R4 | Grok 4.5 · Medium | ✅ |
| R15 | Search + entity lens | 3 | R4 | Composer 2.5 · Low–Medium | ✅ |
| R16 | Deep-link files (web) + EAS build + store + polish | 4 | tất cả lõi | Grok 4.5 · Medium | ✅ |

> **Native hết (M2)** — không WebView. R11/R12 tách session con vì mỗi mảng quản lý rất nhiều màn; agent tới session nào có thể tách nhỏ thêm (list/form/chi tiết) nếu tràn context.
> **Model:** theo `.cursor/rules/auto-model-selector.mdc` (repo web). Session ⚠ (R6, R8) nên **plan bằng Opus 5 trước**, rồi build. UI thuần (R1, R7, R15) đủ Composer 2.5. Override bằng `--model` khi cần.

---

## R0 — Scaffold Expo + chạy Android + EAS

**Mục tiêu:** app Expo chạy được trên điện thoại (Dev Client / Expo Go), CI build cấu hình sẵn.
**Việc:**
- Gỡ file Capacitor trong `cins_app_main` (giữ `README`, `.env.example`, `src/native/bridge-contract.ts` để tham khảo → chuyển thành contract RN nếu cần). Init Expo + TypeScript.
- Expo Router, cấu trúc `app/` (tabs), `components/`, `lib/`, `theme/`.
- `app.json`/`app.config.ts`: id `vn.cins.app`, tên, scheme deep link `cins://`, icon/splash placeholder.
- `eas.json` profiles: `development` (dev client), `preview` (apk nội bộ), `production`.
- Chạy Android trên máy thật qua QR.
**Xong khi:** mở app trên điện thoại thấy màn Home rỗng; `eas build --profile preview` cấu hình sẵn (chưa cần build thật).
**Kickoff:** "Đọc `PLAN_app_native_rn.md` §1,§9. Làm R0: scaffold Expo + Expo Router trong `cins_app_main`, gỡ Capacitor, cấu hình `app.config.ts` + `eas.json`. Không thêm feature."
**Handoff:** ghi cấu trúc thư mục + lệnh chạy dev + scheme deep link.

## R1 — Design system (tokens → RN) + component base

**Mục tiêu:** thư viện UI nền khớp thương hiệu CINs.
**Việc:** map token màu/spacing/typography CINS sang `theme/`. Component: `Text`, `Button`, `Card`, `Avatar`, `Image` (expo-image + variant helper), `Skeleton`, `Sheet`, `Input`. Dark/light nếu web có.
**Xong khi:** màn "Storybook" nội bộ liệt kê component; không hardcode màu rời.
**Kickoff:** "Làm R1: dựng theme tokens + component base RN. Lấy giá trị token từ web `globals.css`/config, KHÔNG chế hệ màu mới."
**Handoff:** danh sách component + cách dùng variant ảnh.

## R2 — Auth (Supabase + SecureStore + Google Sign-In)

**Mục tiêu:** đăng nhập/đăng xuất native, phiên bền, không WebView-OAuth.
**Việc:** `@supabase/supabase-js` với storage = SecureStore adapter. `@react-native-google-signin` → lấy idToken → `supabase.auth.signInWithIdToken`. Màn Login, auto-refresh, logout (gọi `/api/push/go` để gỡ token). Chặn màn cần auth.
**Cấu hình ngoài code:** thêm SHA-1/Client ID Android + iOS vào Google/Supabase (ghi hướng dẫn, không tự đổi dashboard).
**Xong khi:** login Google trên điện thoại thật → có phiên → reload app vẫn đăng nhập.
**Kickoff:** "Làm R2: auth Supabase + native Google Sign-In + SecureStore. Tham chiếu `lib/supabase/*`, `lib/auth/*`. Logout gọi `/api/push/go`."
**Handoff:** cách lưu token, ID cần cấu hình dashboard, luồng refresh.

## R3 — API layer

**Mục tiêu:** một chỗ gọi dữ liệu, có cache.
**Việc:** client Supabase (đọc/ghi theo RLS) + fetch `/api/*` kèm phiên (Bearer/cookie). TanStack Query provider, query key convention, xử lý 401→re-auth, error toast. Liệt kê route `/api/*` app cần; route nào chưa trả JSON → đánh dấu "cần biến thể JSON" (làm ở session dùng nó).
**Xong khi:** gọi thử 1 query Supabase + 1 call `/api/*` thành công có cache.
**Kickoff:** "Làm R3: API layer (Supabase trực tiếp + `/api/*`) + TanStack Query. Không đưa service_role xuống app."
**Handoff:** convention query key + danh sách route cần JSON hoá.

## R4 — Navigation shell

**Mục tiêu:** khung điều hướng + deep link + tap-push routing.
**Việc:** bottom tab (đề xuất 5: Home/Feed · Khám phá/Shop · Chat · Thông báo · Tài khoản — chốt lại theo web). Stack lồng, header, safe area. Cấu hình deep link `cins://` + universal link map sang route. Hàm điều hướng từ payload push.
**Xong khi:** chuyển tab mượt; mở `cins://chat?...` vào đúng màn (dù màn còn rỗng).
**Kickoff:** "Làm R4: bottom tab + stack + deep link map. Định nghĩa route cho các màn Phase 1–3 (rỗng placeholder)."
**Handoff:** sơ đồ route + tên màn.

## R5 — Journey feed + Profile

**Việc:** feed (FlashList, pagination 20), card post, profile header, follow/like/save. Dữ liệu qua R3.
**Xong khi:** cuộn feed thật, mở profile, like/follow hoạt động.
**Kickoff:** "Làm R5: feed + profile native. Nghiệp vụ tham chiếu `app/[slug]`, `lib/*` feed. FlashList + variant ảnh."

**Handoff (✅ 2026-08-23):**
- Feed: `GET /api/world-journey/feed` · FlashList · page size 20 · `FeedPostCard` (like/save optimistic).
- Profile: `/profile/[slug]` · `GET /api/users/preview` · follow qua `/api/follow` · không hiện follower count.
- Social helpers: `lib/social.ts` · queries: `lib/queries/feed.ts`, `lib/queries/profile.ts`.
- Doc app: `docs/FEED.md`. `tsc --noEmit` sạch.
- **Treo:** Save chỉ upsert (giống web, chưa unsave). Feed/post cần session (401 nếu chưa login).

## R6 — Post detail (renderer block) ⚠ lớn

**Việc:** render block JSON của Journey post sang native (text, ảnh, embed, list…). Block chưa hỗ trợ → fallback mở WebView post. Comment list.
**Xong khi:** mở post nhiều loại block hiển thị đúng; comment đọc/gửi được.
**Kickoff:** "Làm R6: renderer block Journey → native. Đọc `docs/cursor_brief_journey_blocks_css.md`. Cắt theo loại block; loại chưa hỗ trợ → fallback WebView. Chỉ post detail + comment."
**Handoff:**
- Doc app: `cins_app_main/docs/POST.md`
- Native: `h2|h3|body|quote|imgs|palette|divider|spacer`
- Fallback (`expo-web-browser`): `embed|table|…` → permalink `/{slug}/p/{postSlug}` hoặc `config.url`
- API app: `GET /api/journey/milestone/:id` · `POST …/comments` (Bearer JSON — route mới web)
- Nav feed: `cotMocId ?? id` → `/post/[id]`
- **Treo:** layout imgs phức tạp (mosaic/album); reply nested; unsave; cần deploy web để POST comments lên prod

## R7 — Gallery / album

**Việc:** lưới ảnh virtualize (FlashList masonry), mở album, viewer full-screen (zoom/swipe), dùng đúng variant.
**Kickoff:** "Làm R7: gallery grid + viewer native. Variant `grid/gridsm`, expo-image cache."
**Handoff:**
- Doc: `cins_app_main/docs/GALLERY.md`
- Feed toggle Journey | Gallery → `GET /api/world-journey/gallery`
- Profile → `/gallery/[slug]` → `GET /api/journey/:slug/gallery`
- Viewer `/gallery/viewer` — swipe; mở post; **chưa** pinch-zoom
- Lưới 2 cột + `gridsm` (FlashList 1.7 chưa masonry prop)
- **Treo:** pinch-zoom · masonry thật · album multi-ảnh trong 1 post

## R8 — Chat list + room ⚠ khó nhất

**Việc:** danh sách phòng; phòng chat: list ngược (FlashList inverted), compose, gửi text, realtime Supabase channel cho phòng đang mở, đính kèm ảnh cơ bản, trạng thái đọc. Ngoài app = push server (A2 đã nối). Order card / system message hiển thị đúng.
**Xong khi:** nhắn qua lại realtime giữa 2 thiết bị; nhận push khi app nền.
**Kickoff:** "Làm R8: chat native. Nghiệp vụ `lib/chat/*`. FlashList inverted + Supabase realtime phòng mở. Đừng đụng server push (đã có)."
**Handoff:**
- Doc: `cins_app_main/docs/CHAT.md`
- List: tab Chat → `GET /api/chat/threads`
- Room: `/chat/[roomId]` — FlashList inverted · `POST …/messages` `{ noi_dung }` · realtime `chat_tin_nhan` filter `id_phong`
- **Treo:** ảnh/file · typing · read receipts UI · order/system rich cards · âm thanh; push nền = A2

## R9 — Shopping + checkout

**Việc:** browse `/shopping`, category, product detail, cart, checkout. Tạo đơn / thanh toán qua `/api/shop/*` (server-only). Đơn tạo xong đã có push (A2).
**Kickoff:** "Làm R9: shop browse→checkout native. Ghi/đơn qua `/api/shop/*`, không tính tiền client."

**Handoff:**
- Doc: `cins_app_main/docs/SHOP.md`
- Browse: tab Khám phá → `GET /api/shop/listing?mode=hang|shop` (route web mới — **cần deploy**)
- Product: `/shop/[id]?slug=` → `GET /api/shop/store/groups/:id`
- Cart: `/shop/cart` → `GET/PATCH /api/shop/shared-cart` (`idBienThe` + `soLuong`|`delta`)
- Checkout: `/shop/checkout?sellerId=` → địa chỉ + biên lai + `nguoiMuaChapNhanRuiRo` → `POST /api/shop/shared-cart/orders`
- **Treo:** search/facet hub · sửa sổ địa chỉ in-app · voucher UI; seller orders = R10

## R10 — Seller orders (native)

**Việc:** danh sách đơn (FlashList, lọc trạng thái), chi tiết đơn, đổi trạng thái. Ghi qua `/api/shop/*` (server-only). Push đơn đã có (A2).
**Kickoff:** "Làm R10: màn Seller native — list đơn + chi tiết + đổi trạng thái. Nghiệp vụ `lib/shop/don-hang.ts`. Ghi qua `/api/shop/*`."

**Handoff (✅):**
- List `/seller/orders` (FlashList + chip status) · detail `/seller/orders/[id]` · entry từ Tài khoản
- API: `GET ?role=seller` · `GET/PATCH /:id` — actions `da_nhan_tien` · `da_giao_tai_su_kien` · `cap_nhat_van_chuyen` · `hoan_thanh` · `hoan_tra` · `huy` · `yeu_cau_huy` · `bo_yeu_cau_huy`
- Doc app: `docs/SELLER_ORDERS.md` · không tính tiền client

## R11a — Org/Academy/University/Community — xem (native)

**Việc:** màn xem native cho trang academy/university/community (public/hồ sơ, tab nội dung). Điều hướng vào từ feed/search.
**Kickoff:** "Làm R11a: màn xem native academy/university/community. Chỉ đọc; quản lý để R11b/R11c."

**Handoff (✅):**
- Routes `/academy|[university|community]/[slug]` · shared `OrgProfileView`
- Preview: `/api/{academy|university|community}/preview?slug=`
- Content: academy courses public · community posts (+403 private) · university stats-only (majors API write-gated)
- Deep link wired · smoke Storybook · feed/search → org = R15
- Doc: `docs/ORGS.md`

## R11b — Academy quản lý (native)

**Việc:** thành viên/vai trò, khoá học, học phí (đọc + thao tác chính). Tính tiền/học phí qua `/api/academy/*`. Cắt nhỏ list/form nếu tràn.
**Kickoff:** "Làm R11b: quản lý Academy native (members · courses · tuition). Ghi/tính qua `/api/academy/*`, không tính tiền client."

**Handoff (✅):**
- Entry `/academy/manage` (Tài khoản) · hub `/academy/[slug]/manage`
- Members: list + mời slug + đổi vai trò + gỡ · `GET/POST/PATCH/DELETE /api/academy/:id/members*`
- Courses: list only (`GET …/courses`) — form tạo/sửa treo
- Tuition: packages read · revenue · `POST …/tuition/:donId/confirm`
- Doc: `docs/ACADEMY_MANAGE.md` · không tính tiền client

## R11c — Community/University quản lý (native)

**Việc:** roster, bài viết, sự kiện, mời/duyệt. Qua `/api/community/*`, `/api/university/*`.
**Kickoff:** "Làm R11c: quản lý Community/University native (roster · posts · events · invites)."

**Handoff (✅):**
- Community: entry `/community/manage` · hub · members (approve/reject/role) · roster · invite · events (`cancel_scheduled`) · posts đọc
- University: entry `/university/manage` · settings đọc · majors catalog + link POST
- Doc: `docs/ORG_MANAGE.md`
- Treo: đăng bài · event create đầy đủ · list ngành đã gắn · admissions · PATCH settings

## R12a — Billing hub (native)

**Việc:** xem hoá đơn/gói/thanh toán. **Mọi tính tiền/tạo hoá đơn/verify qua `/api/*`** — client chỉ hiển thị. Push hoá đơn đã có.
**Kickoff:** "Làm R12a: billing hub native (đọc). Không tính tiền client; thao tác qua `/api/*` billing."

### Handoff ✅

- Hub `/account/billing` · entry Tài khoản → Thanh toán / Billing
- `GET /api/account/billing` · tự khai · poll Sepay · khiếu nại
- Doc app: `docs/BILLING.md`
- Treo: PATCH info · assignee · close invoice · ảnh khiếu nại

## R12b — Admin (native)

**Việc:** bảng quản trị chính (người dùng, báo cáo, tài chính…) native, gọi `/api/admin/*`. Chỉ role hợp lệ. Cắt nhỏ theo màn nếu tràn.
**Kickoff:** "Làm R12b: admin native — các bảng quản trị chính qua `/api/admin/*`. Kiểm tra quyền chặt."

### Handoff ✅

- Hub `/admin` · entry Tài khoản (chỉ khi inbox-stats OK)
- Users · orgs · finance (đọc) · khiếu nại billing
- Backend: `getCurrentUserSystemRole` nhận Bearer — deploy web trước prod
- Doc: `docs/ADMIN.md` · `CINS_DECISIONS.md` 2026-08-24
- Treo: báo cáo/gop-y/seeding REST · PATCH tài chính · soft-delete

## R13 — Push register + Notifications center

**Việc:** xin quyền push, lấy FCM token → `POST /api/push/register` (`nenTang`), gỡ khi logout → `/api/push/go`. Màn Thông báo (đọc `social_thong_bao`), badge, tap → deep link. Settings bật/tắt.
**Xong khi:** thiết bị nhận đủ 4 loại push; tap mở đúng màn.
**Kickoff:** "Làm R13: đăng ký FCM token qua `/api/push/register` + notifications center. Server đã có A1/A2, chỉ nối client."

### Handoff ✅

- `lib/push.ts` · register on login · unregister logout · tap `deepLink`
- Tab Thông báo: feed unread/history · mark read · switch push · badge
- `@react-native-firebase/app|messaging` + plugin; cần `google-services.json` + rebuild Dev Client
- Doc: `docs/PUSH.md`
- Treo: iOS `GoogleService-Info.plist` · foreground display · per-type mute (A3 server)

## R14 — Upload native + Share intent

**Việc:** chọn ảnh/video (expo-image-picker), upload nền lên Cloudflare qua luồng upload sẵn có; nhận Share Sheet từ app khác → tạo post/gửi chat.
**Kickoff:** "Làm R14: upload ảnh/video native + share intent. Dùng luồng upload Cloudflare hiện có."

### Handoff ✅

- `lib/upload.ts` · `lib/media-picker.ts` · `/share`
- Chat composer đính ảnh/video → messages API
- `expo-share-intent@5` + `ShareIntentRoot` (Dev Client)
- Doc: `docs/UPLOAD.md`
- Treo: editor tạo post từ share · nén video client · upload nền queue UI

## R15 — Search + entity lens

**Việc:** ô tìm kiếm, kết quả (trường/ngành/người/shop…), entity lens cơ bản. Qua `/api/search` hoặc Supabase.
**Kickoff:** "Làm R15: search + entity lens native."

**Handoff (2026-08-24):**
- Backend: `GET /api/search?q=&kind=` bọc `runGlobalSearch` — deploy web trước prod.
- App: `/search` · FlashList · debounce · kind tabs · map native (profile/org/post) · browser fallback article/job/studio.
- Entry: Explore search icon · Account · Storybook · deep link `/search`.
- Docs: `docs/SEARCH.md`.

## R16 — Deep-link files + EAS build + store + polish

**Việc:** phía **web** thêm `.well-known/apple-app-site-association` + `assetlinks.json` (universal/app link). EAS build production Android (+ iOS nếu có tài khoản Apple). Splash/icon thật, safe-area, offline state, submit store.
**Kickoff:** "Làm R16: deep-link files trên web + EAS production + submit store. Đây là session phát hành."

**Handoff (2026-08-24):**
- Web: `/.well-known/apple-app-site-association` + `assetlinks.json` (route + bypass middleware). Env `APPLE_TEAM_ID` · `ANDROID_CERT_SHA256` điền sau EAS/Play.
- App: splash brand blue · OfflineBanner + NetInfo · eas.json production AAB · docs `RELEASE.md`.
- **Submit store:** chưa chạy — checklist trong `docs/RELEASE.md` (cần tài khoản + `eas build`/`submit` tay).
- Deploy web trước khi verify App Link.

---

## Ghi chú chuyển session

- Xong session → cập nhật cột **Trạng thái** (✅) + viết Handoff ngay dưới mục session.
- Câu treo về stack (R-M1…R-M6 trong plan §9) chốt **trước R0**.
- Nếu user đổi M2 sang "native hết không WebView": R10–R12 tách thành nhiều session con (list, form, chi tiết) — ghi bổ sung khi tới.
