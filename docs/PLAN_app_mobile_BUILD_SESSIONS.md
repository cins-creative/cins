# PLAN BUILD — App mobile bọc web, chia theo SESSION (chatbox)

> ⛔ **SUPERSEDED 2026-08-23** — thay bằng [`PLAN_app_native_rn_BUILD_SESSIONS.md`](./PLAN_app_native_rn_BUILD_SESSIONS.md) (full React Native). Workstream B (Capacitor: shell, WebView-OAuth, deep link bọc) **huỷ**. Workstream A (server push **A1–A2**) **đã xong, giữ lại, RN tái dùng**.
>
> Chiến lược gốc (lịch sử): [`PLAN_app_mobile_boc_web.md`](./PLAN_app_mobile_boc_web.md).
> Project native: `C:\Users\nguye\Desktop\Code Web\cins_app_main` (repo riêng). Repo web: `C:\Users\nguye\Desktop\Code Web\cins`.

---

## Cách dùng file này (quan trọng)

1. **Mỗi mục `S#` = một chatbox mới.** Đừng gộp nhiều S vào một chat — sẽ tràn context và agent làm ẩu.
2. Mở chatbox mới → **dán đúng khối "Kickoff prompt" của session đó** (đã kèm ngữ cảnh tối thiểu + file cần đọc).
3. Agent làm xong → **cập nhật cột Trạng thái** trong file này + ghi 3–5 dòng "Bàn giao" ở cuối session → đóng chat.
4. Chatbox tiếp theo chỉ cần đọc phần "Bàn giao" của session trước, không cần đọc lại cả lịch sử.
5. **Không nhảy cóc phụ thuộc** (cột "Cần trước"). Nếu prerequisite chưa xong → làm nó trước.
6. **Preview trên điện thoại (không Metro):** app này là Capacitor bọc web, không có Metro. Song song mọi session:
   - Web LAN: `npm run host` trong repo `cins` → điện thoại cùng Wi‑Fi mở `http://<LAN_IP>:3001` (hiện tại máy này: `http://192.168.1.250:3001`).
   - Sau B1: vỏ app `CINS_APP_ENV=dev` trỏ cùng URL trong `cins_app_main/capacitor.config.ts`.
   - Xong session → báo user preview → chờ feedback rồi mới sang session sau.

**Ký hiệu Trạng thái:** ⬜ chưa làm · 🟨 đang làm · ✅ xong · ⛔ chặn (ghi lý do).

---

## Bàn giao đang mở

### Bàn giao A1 — 2026-08-23 ✅
- Xem khối «Bàn giao A1» trong mục A1 bên dưới (migration + lib + API register/go).

### Bàn giao A2 — 2026-08-23 ✅
- Xem mục A2. Session tiếp: **A3** (cài đặt theo loại + cron) — chatbox mới nếu context dài.
- Preview: web LAN — nhắn tin / thao tác đơn không lỗi; push thật chờ FCM + app.

---

## Bản đồ phụ thuộc (đọc 30 giây)

```
Workstream A (repo web cins) — làm được NGAY, không cần app:
  A1 push-server-core ─┬─> A2 push-wire-sources ─> A3 push-settings-cron
                       └─> (cung cấp API đăng ký token cho B2)
  A4 web-shell-prep (allowlist + bridge helper + session-inject endpoint)
  A5 deeplink-web-files (.well-known)
  A6 web-perf-mobile (virtualize ảnh, khối nặng)  [song song, độc lập]
  A0 bottom-tab-shell  → thuộc PLAN_responsive_mobile.md (prerequisite cứng)

Workstream B (project native cins_app_main):
  B1 scaffold-run  ─> B2 push-native ─> B3 login-native ─> B4 upload-native ─> B5 share-native ─> B6 deeplink-native ─> B7 polish
                                   (B2 cần A1; B3 cần A4; B6 cần A5)
```

Thứ tự khuyến nghị: **A1 → A2 → A3** (server push trước, đúng chiến lược) rồi **B1 → B2 → B3 → …**. A4/A5/A6 xen kẽ khi rảnh vì độc lập.

---

## WORKSTREAM A — Trong repo web `cins`

### A1 — Push server: core (bảng + lib gửi FCM)
- **Cần trước:** — (làm đầu tiên)
- **Trạng thái:** ✅ xong (2026-08-23) — thiếu env FCM_* để gửi thật (skip an toàn)
- **Mục tiêu:** dựng nền gửi push từ server, CHƯA nối vào nguồn thông báo.
- **SSOT:** giữ `user_web_push` (Option A). Inventory **A26**.
- **Việc:**
  - [x] Scan DB / SSOT + ALTER `user_web_push` (`nen_tang` · `token` · `mat_hieu_luc_luc`).
  - [x] `lib/push/dang-ky.ts` · `gui.ts` · `don-dep.ts` · `go-khi-logout.ts` · `types.ts`
  - [x] `POST /api/push/register` (+ legacy 308 từ `/api/push/dang-ky`) · `POST /api/push/go`
  - [ ] Env `FCM_*` — user thêm khi có Firebase project (B2).
- **Acceptance:** migration OK (3 row web giữ `nen_tang=web`); API không auth → 401; `gui.ts` thiếu env → skip không crash.
- **KHÔNG làm:** chưa nối nguồn thông báo, chưa UI.

**Kickoff prompt (dán vào chatbox mới):**
> (A1 đã xong — dùng A2.)

---

### Bàn giao A1 — 2026-08-23 (hoàn tất)
- Đã làm: Option A ALTER `user_web_push`; lib `lib/push/*`; API register/go; inventory A26; DECISIONS LOG.
- File: `supabase/sql/migration_user_web_push_fcm.sql` · `scripts/run-user-web-push-fcm-migration.mjs` · `lib/push/*` · `app/api/push/register/route.ts` · `app/api/push/go/route.ts` · docs plan/sessions/DECISIONS · `schema-docs.ts`.
- Quyết định: API English `/api/push/register` (không dùng folder `dang-ky` — bị middleware 308).
- Còn nợ: cấu hình `FCM_PROJECT_ID` + `FCM_CLIENT_EMAIL` + `FCM_PRIVATE_KEY` (hoặc JSON) trên `.env.local` / Worker secrets trước khi test gửi thật; A2 nối nguồn thông báo.
- Verify nhanh: `POST /api/push/register` không cookie → 401; host LAN `http://192.168.1.250:3001` vẫn load web.

---

### A2 — Push server: nối vào các nguồn thông báo sẵn có
- **Cần trước:** A1
- **Trạng thái:** ✅ xong (2026-08-23)
- **Mục tiêu:** phát push từ đúng điểm phát sinh, không dựng hệ thứ hai.
- **Việc:**
  - [x] `lib/push/su-kien.ts` — 4 loại + fire-and-forget + coalesce tin 45s
  - [x] Hook `insertSocialThongBao` (allowlist; shop không nằm đây — tránh double)
  - [x] `lib/shop/don-hang.ts` — đơn mới + đổi trạng thái
  - [x] `lib/chat/room-moc-notify.ts` — O17 nhắc/đến hạn (đóng phần push)
  - [x] `lib/billing/notify-hoa-don.ts` — hoá đơn phí
  - [x] `sendRoomMessage` — tin nhắn mới (bỏ system / card đơn)
- **Acceptance:** code path đúng; gửi FCM thật cần `FCM_*` + thiết bị đăng ký (B2). Không push vanity.
- **KHÔNG làm:** cài đặt theo loại / cron (A3).

**Kickoff prompt:**
> (A2 đã xong — dùng A3.)

### Bàn giao A2 — 2026-08-23
- Đã làm: nối 4 loại push; O17 push mốc; coalesce chat 45s.
- File: `lib/push/su-kien.ts` · `thong-bao-insert.ts` · `direct-message.ts` · `room-moc-notify.ts` · `don-hang.ts` · `notify-hoa-don.ts` · DECISIONS O17/LOG.
- Còn nợ: `FCM_*` env; A3 settings+cron; deep link buyer đơn còn `/chat` tạm.
- Verify: gửi tin DM / tạo đơn trên web LAN — log không crash; không FCM thật nếu thiếu env (skip).

---

### A3 — Push server: cài đặt theo loại + gửi qua cron
- **Cần trước:** A2
- **Trạng thái:** ⬜
- **Việc:**
  - [ ] Cài đặt tắt/bật theo loại — tôn trọng `org/[orgId]/chat/thong-bao` đã có; mở rộng cho 4 loại.
  - [ ] Gửi qua cron/worker sẵn có (`worker.ts` + `POST /api/noi-bo/*/cron`), không dựa client mở.
  - [ ] Instrumentation: đếm thiết bị đăng ký + tỉ lệ mở push.
- **Acceptance:** tắt một loại → không nhận loại đó; cron chạy gửi được khi không có client.

**Kickoff prompt:**
> Đọc mục **A3** + Bàn giao A2. Làm cài đặt push theo loại (tái dùng `org/[orgId]/chat/thong-bao`), route gửi qua cron/worker, và đếm chỉ số đăng ký/mở. Cập nhật Trạng thái + Bàn giao.

---

### A4 — Web shell prep: allowlist + bridge helper + tiêm phiên
- **Cần trước:** — (độc lập; B3 cần cái này)
- **Trạng thái:** ⬜
- **Việc:**
  - [ ] `lib/auth/in-app-browser.ts`: thêm allowlist UA `CINsApp/1.0`, **return sớm trước vòng regex `IN_APP_UA_PATTERNS`**.
  - [ ] Helper `hasNativeCapability(name)` + type `window.CINS_NATIVE` (đọc bridge, web chạy bình thường khi không có).
  - [ ] Endpoint/handshake để native **ghi phiên `sb-*-auth-token`**: xác định cách app set cookie đúng chuẩn `lib/supabase/cookie-options.ts` (maxAge/expires/secure, Domain prod). Ghi rõ hợp đồng cho B3.
- **Acceptance:** mở web với UA `CINsApp/1.0` → không hiện cảnh báo in-app-browser; `hasNativeCapability` trả false an toàn khi không có bridge.

**Kickoff prompt:**
> Đọc mục **A4** + §3.7/§4 của `PLAN_app_mobile_boc_web.md`. Trong repo web: (1) allowlist `CINsApp/1.0` return sớm trong `lib/auth/in-app-browser.ts`; (2) helper `hasNativeCapability` + type `window.CINS_NATIVE`; (3) chốt hợp đồng "native tiêm cookie sb-*-auth-token" theo `cookie-options.ts`. Cập nhật Trạng thái + Bàn giao (ghi rõ hợp đồng cookie cho session B3).

---

### A5 — Deep link: file khai báo phía web
- **Cần trước:** — (B6 cần cái này)
- **Trạng thái:** ⬜
- **Việc:**
  - [ ] Phục vụ `/.well-known/apple-app-site-association` (JSON, không đuôi .json, `Content-Type: application/json`).
  - [ ] Phục vụ `/.well-known/assetlinks.json`.
  - [ ] Kiểm trên Cloudflare Worker/OpenNext: `.well-known/*` không bị redirect, đúng header.
- **Acceptance:** `curl https://cins.vn/.well-known/assetlinks.json` trả 200 + JSON đúng.
- **Ghi chú:** appId + SHA256 fingerprint lấy từ session B1/B6 → có thể để placeholder rồi điền sau khi có native.

**Kickoff prompt:**
> Đọc mục **A5** + §3.6. Thêm route phục vụ `/.well-known/apple-app-site-association` và `/.well-known/assetlinks.json` từ cins.vn (Cloudflare/OpenNext, đúng Content-Type, không redirect). Dùng placeholder cho appId/fingerprint nếu chưa có. Cập nhật Trạng thái + Bàn giao.

---

### A6 — Web perf cho mobile (song song, độc lập)
- **Cần trước:** —
- **Trạng thái:** ⬜
- **Việc:** virtualize lưới Gallery/album (`PLAN_wj_gallery_perf.md`); poster + click-to-load cho Rive/Sketchfab/Figma/iframe; xác nhận `EditorView` lazy; rà pagination `/ban-hang`, `/co-so/[slug]/quan-ly`.
- **Acceptance:** cuộn album dài trên Android tầm trung không tụt DOM/không giật; trang nặng không tải danh sách vô giới hạn.

**Kickoff prompt:**
> Đọc mục **A6** + `docs/PLAN_wj_gallery_perf.md`. Làm virtualize lưới ảnh + click-to-load khối nặng + rà pagination. Test cảm giác cuộn trên viewport mobile. Cập nhật Trạng thái + Bàn giao.

---

### A0 — Bottom tab shell (PREREQUISITE cứng, thuộc plan khác)
- **Cần trước:** —
- **Trạng thái:** ⬜ (theo `PLAN_responsive_mobile.md` §2.1)
- **Ghi chú:** không làm trong plan này; nhưng **phải xong trước khi bọc app** để app không "còn cảm giác web". Theo dõi ở plan responsive.

---

## WORKSTREAM B — Project native `cins_app_main`

> Máy dev là **Windows** → chỉ build/test được **Android** tại chỗ. iOS cần máy Mac (để sau). Mọi session B ưu tiên Android trước.

### B1 — Scaffold + chạy được trên Android
- **Cần trước:** — (skeleton đã được tạo sẵn ở pass này; session này hoàn tất phần còn lại)
- **Trạng thái:** ⬜
- **Việc:**
  - [ ] `npm install` trong `cins_app_main`.
  - [ ] `npx cap add android`.
  - [ ] Xác nhận `capacitor.config.ts` `server.url=https://cins.vn` (dev có thể trỏ LAN `http://<ip>:3001` + `cleartext:true` khi cần).
  - [ ] `npx cap sync` → mở `npx cap open android` → chạy trên máy/emulator → thấy cins.vn load trong app.
  - [ ] Đặt UA hậu tố `CINsApp/1.0` (để khớp allowlist A4).
- **Acceptance:** app Android mở lên load cins.vn, điều hướng cơ bản chạy.

**Kickoff prompt:**
> Đọc `cins_app_main/README.md` + `docs/PLAN_app_mobile_BUILD_SESSIONS.md` mục **B1**. Hoàn tất scaffold: npm install, `cap add android`, sync, chạy trên Android, gắn UA `CINsApp/1.0`. Không thêm plugin nghiệp vụ ở session này. Cập nhật Trạng thái + Bàn giao.

---

### B2 — Push native (FCM)
- **Cần trước:** B1, **A1** (API đăng ký token)
- **Trạng thái:** ⬜
- **Việc:** plugin Push (FCM) → lấy token → gọi `POST /api/push/dang-ky` → nhận notification → tap mở deep link cơ bản.
- **Acceptance:** gửi test từ server (A1) → app nền nhận được → tap mở đúng route.

**Kickoff prompt:**
> Đọc mục **B2** + Bàn giao B1 & A1. Tích hợp FCM native, đăng ký token về `/api/push/dang-ky`, nhận + tap-to-open. Cập nhật Trạng thái + Bàn giao.

---

### B3 — Login native (Google SDK) + tiêm phiên vào WebView
- **Cần trước:** B1, **A4** (hợp đồng cookie)
- **Trạng thái:** ⬜
- **Việc:** Google Sign-In SDK native → `signInWithIdToken` (Supabase) → **ghi cookie `sb-*-auth-token` vào WebView** theo hợp đồng A4 → web nhận biết đã đăng nhập. Test cookie sống qua tắt/mở app.
- **Acceptance:** đăng nhập một chạm trong app; reload web trong app thấy đã login; tắt mở lại app vẫn còn phiên.

**Kickoff prompt:**
> Đọc mục **B3** + §4 `PLAN_app_mobile_boc_web.md` + Bàn giao A4. Làm native Google Sign-In → đổi token Supabase → tiêm cookie sb-*-auth-token vào WebView đúng chuẩn `cookie-options.ts`. Test phiên sống qua tắt/mở app. Cập nhật Trạng thái + Bàn giao.

---

### B4 — Upload nền (native) + bàn giao file
- **Cần trước:** B1
- **Trạng thái:** ⬜
- **Việc:** hàng đợi upload ngầm (Android `WorkManager`/URLSession iOS sau) + bridge nhận file từ web + báo % ngược về web. Web upload flow gọi bridge khi có `hasNativeCapability('upload')`.
- **Acceptance:** upload file lớn, khoá màn giữa chừng → upload vẫn hoàn tất; web thấy % + kết quả.

**Kickoff prompt:**
> Đọc mục **B4** + N2 §1. Làm hàng đợi upload native + bridge bàn giao file web↔native + báo %. Web dùng bridge khi có, fallback web khi không. Cập nhật Trạng thái + Bàn giao.

---

### B5 — Share intent (nhận ảnh từ app khác)
- **Cần trước:** B4 (dùng chung đường bàn giao file)
- **Trạng thái:** ⬜
- **Việc:** đăng ký share target OS → nhận ảnh → đưa vào luồng đăng ảnh của web qua bridge B4.
- **Acceptance:** từ app Ảnh bấm Chia sẻ → CINs → ảnh vào đúng luồng đăng.

**Kickoff prompt:**
> Đọc mục **B5** + Bàn giao B4. Đăng ký share intent, nhận ảnh, dùng lại đường bàn giao file của B4 để đẩy vào web. Cập nhật Trạng thái + Bàn giao.

---

### B6 — Deep link / Universal Link native
- **Cần trước:** B1, **A5** (.well-known)
- **Trạng thái:** ⬜
- **Việc:** cấu hình App Links Android (+ điền SHA256 vào A5) → mở đúng `/{slug}/p/...`, `/chat?phong=...`, `/ban-hang/don/...`. Xử lý bấm push/link lúc phiên hết hạn → re-auth mượt.
- **Acceptance:** mở link cins.vn từ ngoài → vào app đúng trang; hết phiên thì đưa đăng nhập lại rồi về đúng trang.

**Kickoff prompt:**
> Đọc mục **B6** + Bàn giao A5. Cấu hình App Links, điền fingerprint vào assetlinks (A5), route deep link đúng trang, xử lý hết-phiên. Cập nhật Trạng thái + Bàn giao.

---

### B7 — Polish OS
- **Cần trước:** B1
- **Trạng thái:** ⬜
- **Việc:** SafeArea, StatusBar, nút Back Android → `history.back()` (gốc thì thoát), mở link ngoài qua system browser, màn hình chờ tĩnh (chống trắng khi mạng yếu), icon/splash CINs.
- **Acceptance:** không đè tai thỏ/home indicator; Back đúng; link ngoài mở system browser; mạng yếu thấy màn chờ.

**Kickoff prompt:**
> Đọc mục **B7** + §5 rủi ro. Làm SafeArea/StatusBar/Back/system-browser/splash + màn chờ tĩnh. Cập nhật Trạng thái + Bàn giao.

---

## Bảng theo dõi tổng (cập nhật mỗi session)

| ID | Mục | Cần trước | Trạng thái | Bàn giao (link/ghi chú) |
|---|---|---|---|---|
| A1 | Push core (FCM) | — | ✅ | register/go + A26 `user_web_push` |
| A2 | Push wire nguồn | A1 | ✅ | su-kien + 4 nguồn; O17 push |
| A3 | Push settings + cron | A2 | ⬜ | |
| A4 | Web shell prep (allowlist + bridge + cookie) | — | ⬜ | |
| A5 | Deeplink .well-known | — | ⬜ | |
| A6 | Web perf mobile | — | ⬜ | |
| A0 | Bottom tab shell | — | ⬜ (plan responsive) | |
| B1 | Scaffold + chạy Android | — | ⬜ | |
| B2 | Push native | B1, A1 | ⬜ | |
| B3 | Login native + tiêm phiên | B1, A4 | ⬜ | |
| B4 | Upload nền | B1 | ⬜ | |
| B5 | Share intent | B4 | ⬜ | |
| B6 | Deeplink native | B1, A5 | ⬜ | |
| B7 | Polish OS | B1 | ⬜ | |

---

## Mẫu "Bàn giao" ghi ở cuối mỗi session

```
### Bàn giao [ID] — [ngày]
- Đã làm: ...
- File đụng tới: ...
- Quyết định/đổi so với plan: ...
- Còn nợ / cảnh báo cho session sau: ...
- Cách verify nhanh: ...
```
