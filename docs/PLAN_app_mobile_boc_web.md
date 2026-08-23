# PLAN — App mobile bọc web (một app, vỏ native, ruột web)

> Trạng thái: **PLAN — chưa code.** Chốt đường đi để mọi agent/dev sau không thiết kế lại từ đầu.
> Phụ thuộc cứng: [`PLAN_responsive_mobile.md`](./PLAN_responsive_mobile.md) phải xong phần Shell trước khi bọc.
> Liên quan: [`PLAN_tach_worker.md`](./PLAN_tach_worker.md) · [`PLAN_wj_gallery_perf.md`](./PLAN_wj_gallery_perf.md) · [`PLAN_client_cache.md`](./PLAN_client_cache.md) · [`PLAN_auth_session_on_dinh.md`](./PLAN_auth_session_on_dinh.md) · DECISIONS **O17**

---

## 0. Quyết định nền (đọc trước khi bàn lại)

| Câu hỏi | Chốt | Lý do |
|---|---|---|
| Tách 4 app (Journey / chat / shop / quản lý) như Facebook–Messenger–Business Suite? | **Không** | Chuỗi giá trị CINs = *xem tranh → nhắn trong context → chốt đơn / vào lớp → mốc về Journey*. Tách app là đứt chuỗi, quay lại đúng cái khổ hiện tại (4 tab). |
| Native full (React Native / Swift + Kotlin)? | **Không ở phase này** | Phải viết lại toàn bộ UI → hai bộ code, mỗi feature làm hai lần. Team nhỏ = chậm gấp đôi, không đổi lại được gì user thấy. |
| Wrap web (WebView shell)? | **Có** — đường chính | Dùng lại 100% web hiện tại. App chỉ cần thêm phần OS không cho web làm. |
| Nhồi hết tính năng vào một app có nặng? | **Không** | Ruột tải từ server + code splitting theo route (DEV_RULES §JS). File cài đặt chỉ là vỏ (~10–20 MB), không phình theo số feature. Nặng đến từ **ảnh + dữ liệu**, không từ số module. |

**Nguyên tắc bất biến:** một tài khoản, một vỏ, nhiều khu. Native lo *quyền hệ điều hành*; web lo *toàn bộ nghiệp vụ*.

---

## 1. Ranh giới native ↔ web (hợp đồng, không đổi tuỳ hứng)

### Native chỉ lo 4 việc

| # | Việc | Vì sao web không làm được |
|---|---|---|
| N1 | **Push notification** | Web trong tab bị OS suspend → socket chết (đã ghi nhận thật, xem §3.2) |
| N2 | **Upload ảnh/video ổn định** | Khoá màn hình giữa lúc upload file lớn = đứt |
| N3 | **Nhận ảnh từ app khác** (share sheet) | Web không xuất hiện trong menu Chia sẻ của OS |
| N4 | **Giữ đăng nhập + mở link ngoài đúng cách** | Cookie WebView + Google OAuth chặn WebView (xem §4) |

### Web lo phần còn lại

Journey / Gallery · entity lens · chat UI · shop `/ban-hang` · CSĐT `/co-so/[slug]/quan-ly` · cộng đồng · billing `/tai-khoan/thanh-toan` · admin.

> **Luật:** thêm tính năng mới → mặc định là **web**. Chỉ đẩy sang native khi rơi vào N1–N4.

---

## 2. Thứ tự làm (mỗi phase tự có giá trị, không phase nào chờ phase sau)

### Phase 0 — Push ở server (làm trước cả khi quyết định công nghệ app)

Đây là phần đắt giá nhất và **dùng chung cho PWA, wrap, native**. Không làm bước này thì app chỉ là icon.

- [ ] Bảng đăng ký thiết bị: `user_thiet_bi_push` (user · endpoint/token · nền tảng `web|ios|android` · `tao_luc` · `mất_hiệu_lực_luc`)
      → **ALTER/CREATE mới ⇒ báo user trước + ghi inventory** (DEV_RULES §1)
- [ ] Lib `lib/push/` — `dang-ky.ts` · `gui.ts` · `don-dep.ts` (xoá token 410/404)
- [ ] Nối vào **điểm phát sinh sẵn có**, không dựng hệ thông báo thứ hai:
      `lib/social/thong-bao-insert.ts` (nguồn chính) · `lib/shop/don-hang.ts` · `lib/chat/room-moc-notify.ts` (O17) · `lib/billing/notify-hoa-don.ts`
- [ ] Loại thông báo được push (giữ hẹp, chống spam): **tin nhắn mới · đơn mới / đổi trạng thái · nhắc mốc lớp · hoá đơn phí**
      Không push: like, follow, view (giữ đúng triết lý phản-vanity, FOUNDATIONS §2)
- [ ] Cài đặt tắt/bật theo loại — tôn trọng `org/[orgId]/chat/thong-bao` đã có
- [ ] Gửi qua cron/worker sẵn có (`worker.ts` + `POST /api/noi-bo/*/cron`), **không** dựa vào client đang mở

**Đóng O17 tại đây.**

### Phase 1 — PWA (rẻ, đo trước khi tốn tiền store)

- [ ] `app/manifest.ts` (Next metadata route) — tên, icon, `display: standalone`, theme màu CINs
      *Lưu ý: `manifest.json` hiện có trong repo là **Chrome extension**, không phải PWA.*
- [ ] Service worker tối thiểu: nhận web push + mở đúng deep link. **Chưa** offline cache (tránh dính stale HTML — xem §5 rủi ro)
- [ ] Web Push (VAPID) cho Android/desktop; iOS cần user tự "Thêm vào màn hình chính"
- [ ] **Chỉ tiêu đo:** bao nhiêu % user hoạt động chịu bật thông báo. Đây là phép thử thật — nếu không ai bật, app native cũng vô nghĩa.

### Phase 2 — Wrap lên store (khi Phase 1 cho tín hiệu dương)

- [ ] Capacitor shell (repo riêng hoặc `apps/mobile/`), trỏ `https://cins.vn`
- [ ] Plugin: Push (FCM/APNs) · Share intent · File/Camera · Browser (system) · SafeArea · StatusBar
- [ ] Deep link / Universal Link: thông báo mở đúng `/{slug}/p/...`, `/chat?phong=...`, `/ban-hang/don/...`
- [ ] Bridge tối thiểu web ↔ native: `window.CINS_NATIVE` (đăng ký push token · mở share · chọn file · phiên bản app)
      → web phải **chạy bình thường khi bridge không tồn tại** (mở bằng browser)

### Phase 3 — Native từng phần (chỉ khi đau thật)

Ứng viên duy nhất hiện thấy: **khung chat** (bàn phím nhảy, mất vị trí cuộn, gõ trễ). Viết lại riêng khung chat, **giữ nguyên** mọi thứ khác. Không đập cả nhà.

---

## 3. Việc phải làm **trong web hiện tại** để sau bọc là chạy

Đây là phần trả lời trực tiếp "không phải build lại từ đầu". Làm sớm, không chờ app.

### 3.1 Shell & layout

- [ ] Hoàn tất **bottom tab bar** theo `PLAN_responsive_mobile.md` §2.1 — app không có tab bar thì cảm giác vẫn là web
- [ ] `env(safe-area-inset-*)` cho topbar / bottom nav / khung soạn tin (tai thỏ + home indicator)
- [ ] Chặn zoom lệch: `viewport-fit=cover`, input `font-size ≥ 16px` (iOS auto-zoom khi focus)
- [ ] Xử lý **nút Back Android** → `history.back()`, ở gốc thì thoát app (bridge)
- [ ] Không dùng `window.open` cho link ngoài → mở qua system browser

### 3.2 Realtime: đừng trông vào socket để thông báo

Fact đã ghi trong DECISIONS: `lib/chat/use-chat-realtime.ts` từng mất tin vì **tab bị OS suspend trên mobile**, socket "chết lâm sàng" mà không bắn lỗi.

- [ ] Socket chỉ dùng cho **trong-phòng-đang-mở**. Thông báo ngoài app = **push từ server**, luôn luôn.
- [ ] Bắt buộc theo dõi trạng thái kênh + tự reconnect; `unsubscribe` khi unmount (DEV_RULES §Realtime)
- [ ] Khi app quay lại foreground → **fetch lại** tin mới, không tin vào socket đã ngủ

### 3.3 Ảnh — rủi ro số một của app tranh

Đã có nền tốt: variants `grid` 640×360 · `gridsm` 400×225 · `avatar` 64×64, lazy + `width/height`, cấm dùng `public` cho lưới.

Còn thiếu cho mobile:

- [ ] **Virtualize** lưới Gallery / album dài (chỉ render ô trong viewport) — nối tiếp `PLAN_wj_gallery_perf.md`
- [ ] Trần số ô giữ trong DOM khi cuộn vô hạn; thả ảnh đã ra khỏi tầm nhìn
- [ ] Kiểm trên **Android tầm trung thật**, không chỉ iPhone mới

### 3.4 Khối nặng — chỉ chạy khi bấm

- [ ] Rive / Sketchfab / Figma / iframe embed trong bài Journey: poster + click-to-load (đã có luật cho YouTube/Vimeo, mở rộng cho phần còn lại)
- [ ] Editor block Journey (`EditorView`) lazy load — đã có luật DEV_RULES §JS, xác nhận còn đúng

### 3.5 Dữ liệu

- [ ] Giữ đúng luật: pagination mặc định 20, cấm `select('*')`, cấm load cả bảng rồi slice client
- [ ] Dashboard `/ban-hang`, `/co-so/[slug]/quan-ly`: kiểm lại có trang nào tải danh sách không giới hạn

---

## 4. Cạm bẫy lớn nhất: Google OAuth **chặn WebView**

Repo đã có `lib/auth/in-app-browser.ts` chặn sớm để tránh Google trả `disallowed_useragent`. Nghĩa là:

> **Đăng nhập Google KHÔNG chạy được bên trong WebView của app.**

Bắt buộc làm một trong hai:

| Cách | Ghi chú |
|---|---|
| **System browser** (`ASWebAuthenticationSession` iOS / Chrome Custom Tabs Android) rồi trả session về app | Ít việc hơn, dùng lại luồng `/auth/callback` hiện có |
| **Native Google Sign-In SDK** → đổi token với Supabase | Trải nghiệm mượt hơn, thêm việc |

Kèm theo, phải giữ nguyên mấy bài học đã trả giá trong `PLAN_auth_session_on_dinh.md` / IMPLEMENTATION:

- Callback trả **200 HTML + `location.replace`**, **không** `302 + Set-Cookie` (Safari/iOS xoá cookie đó khi tắt app)
- Cookie phiên `sb-*-auth-token` phải copy đủ `maxAge`/`expires`/`secure`
- Không để `in-app-browser.ts` chặn oan chính app CINs → **thêm allowlist theo User-Agent riêng của app** (vd. `CINsApp/1.0`)

---

## 5. Rủi ro & cách chặn

| Rủi ro | Chặn bằng |
|---|---|
| Service worker cache HTML cũ → user thấy bản lỗi thời | Phase 1 **không** cache HTML; chỉ cache asset có hash. Có cơ chế "phiên bản mới, tải lại" |
| Store từ chối "app chỉ là website" | Phải có push + share + camera + deep link thật (đúng N1–N4). Đây là lý do Phase 2 đi sau Phase 0 |
| Push spam → user tắt hết | Chỉ 4 loại ở Phase 0; có cài đặt theo loại; không push vanity |
| Worker vượt 10 MiB (đã xảy ra 2026-08-05) | App **không** làm nặng Worker (ruột vẫn web). Giữ hướng `PLAN_tach_worker.md`: tách theo *deploy*, không theo *sản phẩm* |
| Chat trên mobile khó chịu | Chấp nhận ở Phase 2; nâng cấp native **chỉ khung chat** ở Phase 3 |
| Hai bộ code trôi lệch nhau | Native tuyệt đối không chứa logic nghiệp vụ. Bridge chỉ truyền sự kiện |

---

## 6. Không làm (chống scope creep)

- Không React Native / native full ở Phase 1–2
- Không tách app riêng cho chat / shop / quản lý theo mô hình Meta
- Không offline-first, không đồng bộ nền, không cache dữ liệu nghiệp vụ trong máy
- Không viết lại UI theo Tailwind utility (giữ Quyết định 1 của `PLAN_responsive_mobile.md`)
- Không đưa logic tính tiền / phí / verify xuống native

---

## 7. Dấu hiệu để nâng cấp (không dùng "số user" làm mốc)

| Nâng lên | Khi thấy |
|---|---|
| Phase 1 → 2 (lên store) | Có nhóm user thật mở CINs hàng ngày + chịu bật thông báo; bắt đầu có người hỏi "app đâu" |
| Phase 2 → 3 (native chat) | Chat thành nơi ngồi cả buổi; có phản hồi thật về bàn phím / mất vị trí cuộn |
| Tách trang quản lý riêng | Seller / CSĐT ngồi trong dashboard như đi làm — cho `manage.cins.vn` (đã có hạ tầng từ `PLAN_tach_worker.md`) |

---

## 8. Câu hỏi treo (đưa vào `CINS_DECISIONS.md` khi user chốt)

| # | Câu | Đề xuất |
|---|---|---|
| M1 | Tên bảng thiết bị push — `user_thiet_bi_push` hay gộp vào `user_nguoi_dung`? | Bảng riêng (1 user ↔ N thiết bị) |
| M2 | Nhà cung cấp push cho app: FCM cho cả hai nền tảng, hay FCM + APNs riêng? | FCM cho cả hai (một đường code) |
| M3 | Đăng nhập trong app: system browser hay native Google SDK? | System browser trước (ít việc, tái dùng `/auth/callback`) |
| M4 | Repo app: monorepo `apps/mobile/` hay repo riêng? | Repo riêng — tránh làm nặng build web / Worker |
| M5 | Có làm PWA thật (Phase 1) hay nhảy thẳng wrap? | Làm PWA trước để **đo tỉ lệ bật thông báo** |

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

---

## 10. Tóm một câu

Xây **một app**: vỏ native cho *push + share + upload + đăng nhập*, ruột là web hiện tại. Việc nặng nhất (**push ở server**) làm trước và dùng được cho mọi hướng — nên bắt đầu từ đó, đừng bắt đầu bằng việc chọn framework app.
