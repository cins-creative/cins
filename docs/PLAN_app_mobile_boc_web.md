# PLAN — App mobile bọc web (một app, vỏ native, ruột web)

> ⛔ **SUPERSEDED 2026-08-23** — đảo hướng sang **full React Native**: [`PLAN_app_native_rn.md`](./PLAN_app_native_rn.md) + [`PLAN_app_native_rn_BUILD_SESSIONS.md`](./PLAN_app_native_rn_BUILD_SESSIONS.md).
> File này **giữ lại để tra lịch sử** vì sao từng chọn Capacitor và vì sao đổi (xem `PLAN_app_native_rn.md` §12). **Server push A1–A2 vẫn còn hiệu lực, được tái dùng nguyên vẹn** ở plan RN. Phần Capacitor/WebView-OAuth (A3/A4…) trong file này **không thực hiện nữa**.
>
> Trạng thái (lịch sử): **PLAN — chốt hướng Capacitor, đã làm A1–A2.**
> Danh sách build từng phần (chia theo chatbox): [`PLAN_app_mobile_BUILD_SESSIONS.md`](./PLAN_app_mobile_BUILD_SESSIONS.md)
> Project native: `C:\Users\nguye\Desktop\Code Web\cins_app_main` (repo riêng — quyết định M4).
> Phụ thuộc cứng: [`PLAN_responsive_mobile.md`](./PLAN_responsive_mobile.md) phải xong phần Shell (bottom tab) trước khi bọc.
> Liên quan: [`PLAN_tach_worker.md`](./PLAN_tach_worker.md) · [`PLAN_wj_gallery_perf.md`](./PLAN_wj_gallery_perf.md) · [`PLAN_client_cache.md`](./PLAN_client_cache.md) · [`PLAN_auth_session_on_dinh.md`](./PLAN_auth_session_on_dinh.md) · DECISIONS **O17**

---

## 0. Quyết định nền (đã chốt — đọc trước khi bàn lại)

| Câu hỏi | Chốt | Lý do |
|---|---|---|
| Tách 4 app (Journey / chat / shop / quản lý) như Facebook–Messenger–Business Suite? | **Không** | Chuỗi giá trị CINs = *xem tranh → nhắn trong context → chốt đơn / vào lớp → mốc về Journey*. Tách app là đứt chuỗi. |
| Native full (React Native / Swift + Kotlin)? | **Không ở phase này** | Viết lại toàn bộ UI → hai bộ code, mỗi feature làm hai lần. |
| Wrap web (WebView shell)? | **Có** — đường chính | Dùng lại 100% web hiện tại. App chỉ thêm phần OS không cho web làm. |
| Nhồi hết tính năng vào một app có nặng? | **Không** | Ruột tải từ server + code splitting theo route. Vỏ ~10–20 MB, không phình theo số feature. |
| **Làm PWA trước để đo, hay bọc app luôn?** | **Bọc app luôn — BỎ PWA** (chốt 2026-08-23) | PWA-push trên iOS phải "Thêm vào màn hình chính" → phép đo lệch nặng, vô nghĩa với thị trường iOS-heavy. Bỏ PWA còn **cắt bớt việc**: không cần manifest PWA + service worker + web-push (VAPID). |
| **Đăng nhập Google: bọc trong web hay native?** | **Native Google Sign-In SDK** (chốt 2026-08-23) | Mượt nhất + **né hẳn** lỗi Google chặn WebView. Đánh đổi: phải **tiêm phiên Supabase vào WebView** sau khi đăng nhập native (xem §4). |
| **Việc nào quá khó trong web-wrap?** | **Làm code native** (chốt 2026-08-23) | Upload nền + nhận ảnh chia sẻ không làm ổn trong WebView → viết native, bàn giao file qua bridge. |

**Nguyên tắc bất biến:** một tài khoản, một vỏ, nhiều khu. Native lo *quyền hệ điều hành* + *vài chỗ quá khó cho web*; web lo *toàn bộ nghiệp vụ*.

---

## 1. Ranh giới native ↔ web (hợp đồng, không đổi tuỳ hứng)

### Native lo 5 việc (thêm N5 sau khi chốt đăng nhập native)

| # | Việc | Vì sao web không làm được |
|---|---|---|
| N1 | **Push notification** | Web trong tab bị OS suspend → socket chết (§3.2) |
| N2 | **Upload ảnh/video nền ổn định** | Khoá màn hình giữa lúc upload → WebView bị đóng băng → đứt. **Là code native thật** (hàng đợi ngầm + bàn giao file), không phải file picker. |
| N3 | **Nhận ảnh từ app khác** (share sheet) | Web không xuất hiện trong menu Chia sẻ của OS. Native nhận → **bàn giao file cho web** (dùng chung đường với N2). |
| N4 | **Mở link ngoài đúng cách** | Link ngoài phải mở qua system browser, không `window.open` trong WebView |
| N5 | **Đăng nhập Google (native SDK)** | Google trả `disallowed_useragent` trong WebView. Native SDK đăng nhập → **tiêm phiên vào WebView** (§4) |

### Web lo phần còn lại

Journey / Gallery · entity lens · chat UI · shop `/ban-hang` · CSĐT `/co-so/[slug]/quan-ly` · cộng đồng · billing `/tai-khoan/thanh-toan` · admin.

> **Luật:** thêm tính năng mới → mặc định là **web**. Chỉ đẩy sang native khi rơi vào N1–N5.

---

## 2. Thứ tự làm (mỗi giai đoạn tự có giá trị; giai đoạn sau chỉ khởi động khi giai đoạn trước cho tín hiệu tốt)

> Ghi chú thay đổi so với bản đầu: **bỏ Phase PWA**. Đánh số lại còn 3 giai đoạn.

### Giai đoạn 0 — Push ở server (làm trước cả khi động vào project app)

Đắt giá nhất, dùng chung cho vỏ app + mọi hướng sau. **Chỉ còn một đường gửi: FCM** (không còn web-push/VAPID vì đã bỏ PWA).

- [x] Bảng đăng ký thiết bị — **SSOT Option A (2026-08-23):** mở rộng `user_web_push` (`nen_tang` · `token` · `mat_hieu_luc_luc`); không CREATE bảng thứ hai. Inventory **A26** · `migration_user_web_push_fcm.sql`.
- [x] Lib `lib/push/` — `dang-ky.ts` · `gui.ts` (FCM HTTP v1) · `don-dep.ts` · `go-khi-logout.ts`
- [ ] Nối vào **điểm phát sinh sẵn có** (A2):
      `lib/social/thong-bao-insert.ts` · `lib/shop/don-hang.ts` · `lib/chat/room-moc-notify.ts` (O17) · `lib/billing/notify-hoa-don.ts`
- [ ] Loại được push (giữ hẹp, chống spam): **tin nhắn mới · đơn mới / đổi trạng thái · nhắc mốc lớp · hoá đơn phí**. Không push like/follow/view (phản-vanity, FOUNDATIONS §2).
- [ ] Gom nhóm ở server (10 tin → 1 push gộp) — trách nhiệm server, không để mỗi OS tự làm.
- [ ] Cài đặt tắt/bật theo loại — tôn trọng `org/[orgId]/chat/thong-bao` đã có.
- [ ] Gửi qua cron/worker sẵn có (`worker.ts` + `POST /api/noi-bo/*/cron`), **không** dựa vào client đang mở.
- [ ] Instrumentation: ghi nhận số thiết bị đăng ký + tỉ lệ mở push (để đo thật, không đoán).
- [x] `POST /api/push/register` + `POST /api/push/go` (legacy `/api/push/dang-ky` → 308 register)
- [ ] Env `FCM_*` (service account) — user thêm secret; code skip an toàn khi thiếu.

**Đóng O17 tại đây (coupling có chủ đích).**

### Giai đoạn 1 — Bọc app lên store (Capacitor)

- [ ] Project Capacitor (`cins_app_main`, repo riêng), `server.url = https://cins.vn`.
- [ ] Native login (N5): Google SDK → đổi token Supabase → **tiêm phiên vào WebView** (§4).
- [ ] Push native (N1): FCM token → đăng ký về server → nhận → mở đúng deep link.
- [ ] Upload nền (N2): hàng đợi upload ngầm + bàn giao file web↔native + báo % ngược lại.
- [ ] Share intent (N3): nhận ảnh → dùng chung đường bàn giao của N2.
- [ ] Deep link / Universal Link: mở đúng `/{slug}/p/...`, `/chat?phong=...`, `/ban-hang/don/...` (cần file khai báo phía web — §3.6).
- [ ] Bridge `window.CINS_NATIVE`: đăng ký push token · mở share · chọn/upload file · phiên bản app · **capability-detection từng khả năng** (không chỉ "có bridge hay không").
      → web phải **chạy bình thường khi bridge không tồn tại** (mở bằng browser thường).
- [ ] SafeArea · StatusBar · nút Back Android → `history.back()`, ở gốc thì thoát app.

### Giai đoạn 2 — Native từng phần (chỉ khi đau thật)

Ứng viên: **khung chat** (bàn phím nhảy, mất vị trí cuộn, gõ trễ). Viết lại riêng khung chat, **giữ nguyên** mọi thứ khác.

---

## 3. Việc phải làm **trong web hiện tại** (repo `cins`) để sau bọc là chạy

Làm sớm, không chờ app.

### 3.1 Shell & layout
- [ ] Hoàn tất **bottom tab bar** theo `PLAN_responsive_mobile.md` §2.1.
- [ ] `env(safe-area-inset-*)` cho topbar / bottom nav / khung soạn tin.
- [ ] Chặn zoom lệch: `viewport-fit=cover`, input `font-size ≥ 16px`.
- [ ] Nút Back Android + không dùng `window.open` cho link ngoài (mở qua bridge → system browser).

### 3.2 Realtime: đừng trông vào socket để thông báo
Fact (DECISIONS): `use-chat-realtime.ts` từng mất tin vì tab bị OS suspend, socket "chết lâm sàng" không bắn lỗi.
- [ ] Socket chỉ dùng cho **phòng đang mở**. Thông báo ngoài app = **push từ server**, luôn luôn.
- [ ] Theo dõi trạng thái kênh + tự reconnect; `unsubscribe` khi unmount.
- [ ] App quay lại foreground → **fetch lại** tin mới, không tin socket đã ngủ.

### 3.3 Ảnh — rủi ro số một của app tranh
Đã có: variants `grid` 640×360 · `gridsm` 400×225 · `avatar` 64×64, lazy + `width/height`, cấm `public` cho lưới.
- [ ] **Virtualize** lưới Gallery / album dài (nối `PLAN_wj_gallery_perf.md`).
- [ ] Trần số ô giữ trong DOM khi cuộn vô hạn; thả ảnh ra khỏi tầm nhìn.
- [ ] Kiểm trên **Android tầm trung thật**.

### 3.4 Khối nặng — chỉ chạy khi bấm
- [ ] Rive / Sketchfab / Figma / iframe: poster + click-to-load.
- [ ] Editor block Journey (`EditorView`) lazy load — xác nhận còn đúng.

### 3.5 Dữ liệu
- [ ] Pagination mặc định 20, cấm `select('*')`, cấm load cả bảng rồi slice client.
- [ ] Kiểm `/ban-hang`, `/co-so/[slug]/quan-ly` có trang nào tải danh sách không giới hạn.

### 3.6 Deep link — file khai báo phía web (MỚI, đưa lên đây vì là việc của web, làm sớm)
- [ ] Phục vụ `/.well-known/apple-app-site-association` (iOS Universal Links) từ cins.vn.
- [ ] Phục vụ `/.well-known/assetlinks.json` (Android App Links) từ cins.vn.
- [ ] Trên Cloudflare Worker / OpenNext: đảm bảo route `.well-known/*` trả đúng `Content-Type` + không bị redirect.

### 3.7 Cầu nối + tiêm phiên (MỚI — hỗ trợ native login N5)
- [ ] Allowlist UA app `CINsApp/1.0` trong `lib/auth/in-app-browser.ts` — **return sớm trước vòng regex** (nếu không, chuỗi `wv` của WebView Android khiến app tự chặn cảnh báo oan).
- [ ] Cơ chế để native **ghi phiên `sb-*-auth-token` vào WebView** đúng chuẩn cookie (`cookie-options.ts`: đủ `maxAge`/`expires`/`secure`, `Domain=.cins.vn` ở prod).
- [ ] Helper web `hasNativeCapability(name)` đọc `window.CINS_NATIVE` — web không bao giờ giả định bridge tồn tại.

---

## 4. Đăng nhập: Native Google Sign-In + tiêm phiên vào WebView (đã chốt)

> **Đăng nhập Google KHÔNG chạy trong WebView** (`in-app-browser.ts` xác nhận Google trả `disallowed_useragent`). Chốt: **không bọc login trong web** — dùng **Google Sign-In SDK native**.

Luồng:
1. User bấm "Đăng nhập Google" → màn Google **native** (một chạm, không rời app).
2. Native nhận Google ID token → `supabase.auth.signInWithIdToken()` → phiên Supabase.
3. **Mấu chốt:** native **tiêm phiên vào WebView** — ghi cookie `sb-*-auth-token` để ruột web hiểu đã đăng nhập.

Bài học phải giữ (từ `PLAN_auth_session_on_dinh.md` / IMPLEMENTATION):
- Cookie phiên copy đủ `maxAge`/`expires`/`secure` (`cookie-options.ts` — 400 ngày, không phải session cookie; Safari cần Max-Age + Expires).
- Callback web (nếu còn dùng cho login khác) trả **200 HTML + `location.replace`**, không `302 + Set-Cookie`.
- Allowlist `CINsApp/1.0` để web **không cảnh báo "trình duyệt lạ" oan** cho các luồng khác (login đã là native nên không còn bị chặn ở đây).

Login khác Google (email / magic link…) vẫn chạy bình thường trong WebView — chỉ Google cần native.

---

## 5. Rủi ro & cách chặn

| Rủi ro | Chặn bằng |
|---|---|
| Mở app lúc mạng yếu → màn trắng (do không cache HTML) | Vỏ giữ **một màn hình chờ tĩnh** (khung + logo), không cache HTML dữ liệu. Có cơ chế "phiên bản mới, tải lại". |
| Store từ chối "app chỉ là website" | Phải có push + share + camera + deep link + login native thật (N1–N5). |
| Push spam → user tắt hết | Chỉ 4 loại; gom nhóm server; cài đặt theo loại; không push vanity. |
| App tự chặn login của chính nó | Allowlist `CINsApp/1.0` return sớm trong `in-app-browser.ts`; login đi native. |
| Phiên không sang được WebView sau login native | Tiêm cookie đúng chuẩn `cookie-options.ts`; test cookie sống qua tắt/mở app (Safari/iOS hay xoá). |
| Upload đứt khi khoá máy | Hàng đợi upload **native ngầm**, không dựa WebView. |
| Push nhầm người trên máy dùng chung | `go-khi-logout.ts` xoá token khi đăng xuất. |
| Worker vượt 10 MiB (đã xảy ra 2026-08-05) | Vỏ không làm nặng Worker; giữ hướng `PLAN_tach_worker.md` (tách theo *deploy*, không theo *sản phẩm*). |
| Hai bộ code trôi lệch | Native tuyệt đối không chứa logic nghiệp vụ. Bridge chỉ truyền sự kiện + file + token. |

---

## 6. Không làm (chống scope creep)

- Không React Native / native full ở Giai đoạn 0–1.
- Không tách app riêng cho chat / shop / quản lý theo mô hình Meta.
- Không offline-first, không đồng bộ nền, không cache **dữ liệu nghiệp vụ** trong máy (chỉ cache màn hình chờ tĩnh).
- Không viết lại UI theo Tailwind utility (giữ Quyết định 1 của `PLAN_responsive_mobile.md`).
- Không đưa logic tính tiền / phí / verify xuống native.
- Không làm PWA (đã bỏ).

---

## 7. Dấu hiệu để nâng cấp

| Nâng lên | Khi thấy |
|---|---|
| Giai đoạn 1 → 2 (native chat) | Chat thành nơi ngồi cả buổi; phản hồi thật về bàn phím / mất vị trí cuộn. |
| Tách trang quản lý riêng | Seller / CSĐT ngồi dashboard như đi làm — cho `manage.cins.vn` (hạ tầng từ `PLAN_tach_worker.md`). |

---

## 8. Câu hỏi treo → **đã chốt** (đưa vào `CINS_DECISIONS.md`)

| # | Câu | Chốt |
|---|---|---|
| M1 | Tên bảng thiết bị push | **Chốt Option A (2026-08-23):** giữ/mở rộng `user_web_push` (1 SoT). Không CREATE `user_thiet_bi_push`. Inventory **A26**. |
| M2 | Nhà cung cấp push | **FCM cho cả hai nền tảng** (iOS qua FCM→APNs). Bỏ web-push vì bỏ PWA. |
| M3 | Đăng nhập trong app | **Native Google Sign-In SDK** + tiêm phiên vào WebView |
| M4 | Repo app | **Repo riêng** `cins_app_main` |
| M5 | Có làm PWA không | **Không** — bọc app luôn |

---

## 9. File neo

| Vai trò | Path |
|---|---|
| Chat realtime (điểm yếu suspend) | `lib/chat/use-chat-realtime.ts` · `use-chat-read-cursors-realtime.ts` |
| Thông báo trong app | `lib/social/thong-bao-insert.ts` · `lib/social/notifications.ts` · UI `JourneyNotifications` |
| Nhắc mốc lớp (O17) | `lib/chat/room-moc-notify.ts` · `POST /api/chat/mocs/tick` |
| Đơn shop | `lib/shop/don-hang.ts` · `lib/shop/dong-don.ts` |
| Hoá đơn phí | `lib/billing/notify-hoa-don.ts` |
| Auth / session | `lib/auth/session.ts` · `in-app-browser.ts` · `app/auth/callback/route.ts` · `lib/supabase/cookie-options.ts` |
| Cron / worker | `worker.ts` · `workers/scheduled.ts` · `wrangler.jsonc` |
| Ảnh & variants | `CINS_IMPLEMENTATION.md` §4 · `lib/cloudflare/` |
| Shell mobile | `PLAN_responsive_mobile.md` §2.1 |
| Project native | `../cins_app_main/` (repo riêng) |
| Danh sách build từng phần | `PLAN_app_mobile_BUILD_SESSIONS.md` |

---

## 10. Tóm một câu

Xây **một app**: vỏ native cho *push + share + upload + đăng nhập Google*, ruột là web hiện tại. Việc nặng nhất (**push ở server**) làm trước và dùng cho mọi hướng. **Bỏ PWA, bọc app luôn; đăng nhập native rồi tiêm phiên vào WebView.**

---

## 11. Lịch sử quyết định (vì sao đổi so với bản đầu)

- **2026-08-23:** Bỏ Phase PWA. Lý do: KPI "tỉ lệ bật push qua PWA" lệch nặng trên iOS (phải Add-to-Home-Screen) → không đo được nhu cầu thật ở thị trường iOS-heavy. Hệ quả tốt: cắt manifest PWA + service worker + web-push/VAPID; `lib/push/gui.ts` chỉ còn một đường FCM.
- **2026-08-23:** Đăng nhập chuyển sang **native Google SDK** (thay vì system browser). Né hẳn Google-chặn-WebView. Việc mới phát sinh: tiêm phiên Supabase vào WebView.
- **2026-08-23:** Chốt "khó thì làm native" → N2 (upload nền) và N3 (share) là code native, cần đường bàn giao file web↔native.
- **2026-08-23:** Thêm §3.6 (AASA/assetlinks phía web) và §3.7 (allowlist + tiêm phiên) vào nhóm "việc làm trong web".
