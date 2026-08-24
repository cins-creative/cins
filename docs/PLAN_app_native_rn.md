# PLAN — App full native (React Native / Expo)

> Trạng thái: **PLAN — chốt hướng RN, chưa code.** Đảo hướng 2026-08-23: **bỏ Capacitor bọc web → viết app native đầy đủ.**
> Thay thế: [`PLAN_app_mobile_boc_web.md`](./PLAN_app_mobile_boc_web.md) (SUPERSEDED — giữ để tra lịch sử vì sao đổi).
> Danh sách build từng phần (chia theo chatbox): [`PLAN_app_native_rn_BUILD_SESSIONS.md`](./PLAN_app_native_rn_BUILD_SESSIONS.md)
> Project native: `C:\Users\nguye\Desktop\Code Web\cins_app_main` (repo riêng — re-scaffold Expo, gỡ Capacitor).
> **Tái dùng nguyên vẹn:** server push A1–A2 (`lib/push/*`, `/api/push/register|go`, `user_web_push`), toàn bộ Supabase (bảng/RLS), các `/api/*` sẵn có, Cloudflare Images variants.

---

## 0. Sự thật phải nhìn thẳng trước khi làm

**Full native = viết lại toàn bộ UI.** Web CINs hiện có: Journey/Gallery, post blocks, entity lens, chat, shop (`/shopping`, `/seller`), CSĐT/ĐH quản lý, cộng đồng, billing, admin. RN **không dùng lại được** markup/CSS web — chỉ dùng lại **backend** (API + DB + push + ảnh).

| Dùng lại được | Phải viết lại |
|---|---|
| Supabase tables/RLS/enum | Mọi màn hình (feed, post, chat, shop, org, billing…) |
| `/api/*` route (402 route) | Renderer block Journey (JSON → native) |
| Server push A1–A2 (FCM) | Navigation, shell, tab bar |
| Cloudflare Images variants (URL) | Realtime chat UI, compose, upload UI |
| Design tokens (giá trị màu/spacing) | Component library (Button/Card/Avatar…) |

**Hệ quả team nhỏ:** trong lúc web vẫn phải sống (không thể tắt web), mỗi feature mới có nguy cơ **làm hai lần** (web + RN). Đây là cái giá đã được cảnh báo và user chấp nhận (DECISIONS 2026-08-23).

**Giảm rủi ro (không phản bội "full native"):** vài bề mặt tần suất thấp / phức tạp (admin, CSĐT quản lý sâu, billing hub) **bọc WebView tạm trong app RN** ở phase đầu, migrate native sau. Native-first cho lõi giá trị (feed, post, chat, shop). Xem §6.

---

## 1. Stack chốt (đề xuất — user xác nhận ở §9 M-table)

| Hạng mục | Chọn | Lý do |
|---|---|---|
| Framework | **React Native + Expo (managed) + EAS Build** | Velocity team nhỏ; OTA update; native module dễ; build cloud không cần Mac cho Android |
| Ngôn ngữ | **TypeScript** | Đồng bộ repo web |
| Navigation | **Expo Router** (file-based) | Quen tay với Next App Router; deep link tốt |
| Data fetching | **TanStack Query** | Cache/retry/invalidate; hợp API-first |
| Backend call | **Supabase JS trực tiếp** (auth/realtime/CRUD theo RLS) **+ `/api/*`** cho logic server-only | Không dựng backend mới |
| Auth | `@supabase/supabase-js` + **SecureStore** token + **native Google Sign-In** → `signInWithIdToken` | Né WebView-OAuth; token an toàn |
| Push | **FCM native** (`@react-native-firebase/messaging` hoặc Expo Notifications) → `/api/push/register` | Dùng lại A1–A2 |
| Ảnh | **expo-image** + Cloudflare variants | Cache + perf lưới |
| State | Query cache + Zustand (UI state nhẹ) | Không Redux nặng |
| Realtime | Supabase Realtime channel (chat phòng đang mở) | Ngoài app = push server |

> **Metro có ở đây** (RN dùng Metro) — preview: Expo Dev Client + quét QR trên điện thoại. Đây là điểm khác Capacitor.

---

## 2. Kiến trúc dữ liệu — API-first, không backend mới

- **Đọc/ghi theo RLS** (feed, post, chat, follow…) → gọi **Supabase trực tiếp** từ app (anon key + phiên user). Bảo mật vẫn là RLS như web.
- **Logic server-only** (service-role: billing, phí, tạo đơn, verify, admin) → gọi **`/api/*`** trên `cins.vn` kèm cookie/Bearer phiên.
- **Không** đưa `service_role` key xuống app. Không tính tiền/phí/verify ở client.
- Hợp đồng API: liệt kê route dùng cho app trong build-sessions; nếu route nào chỉ trả HTML/redirect → cần thêm biến thể JSON (đánh dấu ở session tương ứng).

---

## 3. Ranh giới vẫn giữ

- Một tài khoản, một app. Push chỉ **4 loại** (tin nhắn · đơn · mốc lớp · hoá đơn), không vanity — **A1/A2 đã làm**.
- Không tách 4 app (Journey/chat/shop/quản lý) — vẫn một app, chuỗi giá trị liền mạch.
- Realtime chỉ cho phòng đang mở; thông báo ngoài app = push server (đã có).

---

## 4. Bảo mật / hiệu năng (mang từ DEV_RULES sang RN)

- Token phiên trong **SecureStore/Keychain**, không AsyncStorage trần.
- Ảnh: dùng đúng variant (`grid`/`gridsm`/`avatar`), không tải bản gốc cho lưới; `expo-image` cache + placeholder.
- Danh sách dài: **FlashList** (Shopify) virtualize — bắt buộc cho feed/gallery/chat.
- Pagination 20 mặc định; không `select('*')`; không tải cả bảng.
- Deep link mở đúng màn; xử lý phiên hết hạn → re-auth mượt.

---

## 5. Push / deep link (tái dùng A1–A2 + A5)

- App lấy FCM token → `POST /api/push/register` (`nenTang: android|ios`). Gỡ khi logout → `POST /api/push/go`. **Đã có server.**
- Tap push → điều hướng `deepLink` trong payload (`/chat?...`, `/seller/orders?...`, `/account/billing`).
- Universal Link / App Link cần file `.well-known` phía web — **session A5 cũ vẫn cần** (chuyển sang plan RN).

---

## 6. Phạm vi native — **native hết, KHÔNG WebView** (chốt M2 = native, 2026-08-23)

Mọi bề mặt viết native. **Không** dùng `WebViewScreen` làm màn chính. Ngoại lệ hẹp duy nhất: **fallback loại block Journey chưa hỗ trợ** trong R6 (mở WebView chỉ riêng nội dung block đó), sẽ bị loại dần khi renderer đủ.

Hệ quả: các bề mặt quản lý (Seller, Academy/University/Community, Billing, Admin) **tách thành nhiều session con native** (list · form · chi tiết) — xem build-sessions R10–R12. Khối lượng lớn hơn hẳn WebView; chấp nhận theo yêu cầu user.

| Bề mặt | Cách làm |
|---|---|
| Feed Journey / Profile | **Native** — lõi giá trị |
| Post detail (blocks) | **Native** (khó — R6); block chưa hỗ trợ → fallback WebView **chỉ riêng block đó** |
| Gallery / album | **Native** — FlashList |
| Chat | **Native** (khó nhất — R8) — lý do chính chọn native |
| Shop browse / product / checkout | **Native** — lõi doanh thu |
| Seller orders dashboard | **Native** (R10) |
| Academy/University/Community **quản lý** | **Native**, nhiều session con (R11a–R11c) — rất nhiều màn |
| Billing hub / Admin | **Native** (R12a–R12b) — nhạy cảm, mọi tính tiền/verify vẫn qua `/api/*` |

---

## 7. Thứ tự (mỗi phase tự có giá trị; phase sau khởi động khi phase trước ổn)

- **Phase 0 — Nền:** scaffold Expo, design system, auth, API layer, navigation shell, push. (R0–R4)
- **Phase 1 — Lõi giá trị:** Journey feed → Post detail → Gallery → Chat. (R5–R8)
- **Phase 2 — Doanh thu:** Shop browse/product/checkout → Seller orders. (R9–R10)
- **Phase 3 — Bề mặt phụ:** Org/Academy/Community + Billing/Admin (WebView→native), Search, Notifications, Upload/Share. (R11–R15)
- **Phase 4 — Phát hành:** EAS build, store submission, deep link, polish.

---

## 8. Rủi ro & chặn

| Rủi ro | Chặn |
|---|---|
| Rewrite khổng lồ, kéo dài | Phase hoá theo chuỗi giá trị; WebView tạm cho bề mặt phụ; API-first (không đụng backend) |
| Hai codebase web+RN lệch nhau | Backend là nguồn chung; UI web đóng băng tính năng lớn trong lúc dựng RN lõi |
| Renderer block Journey (R6) rất lớn | Cắt nhỏ theo loại block; block chưa hỗ trợ → fallback WebView post |
| Chat native khó (R8) | Dùng thư viện list ngược (FlashList inverted) + Supabase realtime; tách session riêng |
| iOS cần Mac | EAS Build cloud cho iOS; Android build local/EAS trên Windows |
| Lộ `service_role` | Tuyệt đối không đưa xuống app; logic nhạy cảm qua `/api/*` |
| Store từ chối | App native thật + push + deep link — không phải lo "chỉ là web" |

---

## 9. Câu hỏi stack → **ĐÃ CHỐT 2026-08-23**

| # | Câu | Chốt |
|---|---|---|
| R-M1 | Expo hay RN bare? | ✅ **Expo managed + EAS Build** |
| R-M2 | WebView tạm hay native hết? | ✅ **Native hết — KHÔNG WebView** (trừ fallback block R6). R10–R12 tách session con native |
| R-M3 | Navigation | ✅ **Expo Router** |
| R-M4 | Push lib | ✅ **`@react-native-firebase/messaging`** (khớp FCM v1 A1/A2) |
| R-M5 | Repo `cins_app_main` | ✅ **Re-scaffold Expo** (gỡ Capacitor) trong R0 |
| R-M6 | Web app khi dựng RN | ✅ **Đóng băng feature lớn** — tránh làm hai lần |

---

## 10. Neo file

| Vai trò | Path |
|---|---|
| Server push (tái dùng) | `lib/push/*` · `app/api/push/register|go/route.ts` · `user_web_push` |
| Auth/session web (tham chiếu logic) | `lib/auth/*` · `lib/supabase/*` · `app/auth/callback/route.ts` |
| Chat (tham chiếu nghiệp vụ) | `lib/chat/*` |
| Shop | `lib/shop/*` |
| Block Journey (renderer nguồn) | `docs/cursor_brief_journey_blocks_css.md` |
| Ảnh variants | `CINS_IMPLEMENTATION.md` §4 · `lib/cloudflare/` |
| Deep link web files | session A5 (chuyển sang build-sessions RN) |
| Project RN | `../cins_app_main/` |

---

## 11. Tóm một câu

Viết **app native đầy đủ bằng React Native/Expo**, dùng lại **backend** (Supabase + `/api/*` + push A1–A2 + Cloudflare Images), viết lại **toàn bộ UI**. Đi theo chuỗi giá trị (feed → post → chat → shop), bề mặt phụ bọc WebView tạm rồi migrate.

---

## 12. Lịch sử quyết định

- **2026-08-23 (sáng):** chốt Capacitor bọc web (bỏ PWA, native login/upload/share). Làm xong A1–A2 server push.
- **2026-08-23 (chiều):** **đảo hướng sang full React Native** theo yêu cầu user. Lý do user muốn: app native thật, có Metro/preview quen thuộc, không phụ thuộc WebView. Đánh đổi đã ghi §0. Capacitor plan → SUPERSEDED; A1–A2 giữ lại tái dùng; scaffold Capacitor ở `cins_app_main` sẽ được thay bằng Expo (R0).
