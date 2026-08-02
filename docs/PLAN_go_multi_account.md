# PLAN — Gỡ tính năng chuyển đổi nhiều tài khoản

**Trạng thái:** đã implement (2026-08-02) — 5 phase
**Lý do:** khâu đăng nhập chậm và tốn quá nhiều thời gian bảo trì; giá trị tính năng không tương xứng.

---

## 0. Quyết định đã chốt

| # | Nội dung | Chốt |
|---|---|---|
| D1 | Cơ chế tự khôi phục phiên (`SessionRestorer` + `/api/auth/restore` + cookie `cins-restore-hint`) | **Gỡ luôn.** Nó sống nhờ kho `cins-accounts`; giữ lại là giữ code chết |
| D2 | Card «Tiếp tục với @nick» ở `/login` (`lib/auth/remembered-account.ts`, localStorage) | **Giữ.** Chỉ metadata 1 nick, không token, không tốn request |
| D3 | Google account picker (`prompt=select_account`) | **Gỡ** `forceAccountPicker` / `addAccount`, để Google dùng hành vi mặc định |
| D4 | Cookie tồn dư trên trình duyệt user production | **Dọn trong middleware ~4 tuần rồi gỡ** — an toàn, không làm ai mất phiên (xem §0b) |

## 0b. Vì sao gỡ kho mà user VẪN không phải đăng nhập lại

Đã xác minh trực tiếp trong `node_modules` và middleware:

| Dữ kiện | Nguồn | Ý nghĩa |
|---|---|---|
| `@supabase/ssr` ép `maxAge = 400 * 24 * 60 * 60` (400 ngày) ở mọi nhánh ghi cookie | `node_modules/@supabase/ssr/dist/main/utils/constants.js:10` | Cookie phiên `sb-*-auth-token` **không** phải session-cookie; đóng trình duyệt không mất phiên |
| `lib/supabase/cookie-options.ts` không override `maxAge` | đọc file | Mặc định 400 ngày được giữ nguyên |
| `middleware.ts:48–49, 273–278` — `/login` đi qua `resolveSession()` và ghi cookie đã xoay lên response | đọc file | Bug "mất refresh token khi mở /login" **đã được sửa từ trước và không liên quan tới kho** |

Kho `cins-accounts` **chưa bao giờ** là thứ giữ cho user đăng nhập — nó chỉ là **lưới an toàn** cho đúng cái bug ở trên (xem `docs/PLAN_auth_session_on_dinh.md`, chuỗi hỏng dòng 31–39). Bug đã vá tại gốc trong middleware, nên lưới này giờ là chi phí thuần.

**Cơ chế ghi nhớ đăng nhập sau khi gỡ:** cookie `sb-*-auth-token` (400 ngày) → mỗi request qua middleware gọi `getUser()`, `auth-js` tự xoay refresh token khi còn <90 giây trước hạn, middleware ghi token mới lên response. User đăng nhập một lần và ở lại cho tới khi tự bấm đăng xuất hoặc không vào site quá lâu (theo cấu hình refresh token của Supabase project).

**Xóa `cins-accounts` không đụng tới `sb-*-auth-token`** — hai cookie độc lập, nên bước dọn ở Phase 4 không đá ai ra ngoài.

**Điều kiện bắt buộc:** không được đụng vào `middleware.ts` phần `isSessionSyncOnlyPath` / `resolveSession`. Nếu `/login` quay lại bị bypass, bug mất phiên sẽ trở lại — và lần này không còn lưới an toàn. Ghi rõ cảnh báo này vào `docs/CINS_DECISIONS.md` ở Phase 5.

---

## 1. Vì sao đăng nhập đang chậm (nguồn chi phí thực tế)

| Vị trí | Chi phí | Ghi chú |
|---|---|---|
| `app/auth/callback/route.ts:112–136` | **+1 `getSession()` + 1 query `user_nguoi_dung`** trước cả `exchangeCodeForSession` | Nằm ngay trên đường tới hạn (critical path) của OAuth — user chờ đúng đoạn này |
| `components/cins/SessionRestorer.tsx` + `app/api/auth/restore/route.ts` | Mỗi lần render ra trạng thái khách mà kho còn nick → **1 POST + `refreshSession` + `router.refresh()` render lại toàn trang** | Đây là nguyên nhân "nháy khách rồi mới đăng nhập" |
| `components/auth/AuthSessionRemember.tsx:39–62` | POST `/api/auth/vault-sync` mỗi `TOKEN_REFRESHED` (throttle 30s) | Request nền lặp lại |
| `app/api/auth/login/route.ts:174–186`, `reset-password/route.ts:164–176`, `app/[slug]/journey/actions.ts:360–380` | Mỗi lần đăng nhập ghi thêm kho | Chi phí nhỏ nhưng cộng dồn |
| `components/cins/CinsAppTopbar.tsx:55–63` | 3 lần đọc/parse cookie mỗi render topbar | Rẻ, nhưng là code chết sau khi gỡ |
| `app/api/auth/session-profile/route.ts` | Trả thêm `savedAccounts` cho home v2 | |

Gỡ xong: OAuth callback bớt 1 round-trip DB + 1 `getSession`, trang khách không còn vòng restore + re-render, mất hẳn request nền `vault-sync`.

---

## 2. Phạm vi

**Không đụng:** logic Supabase auth chuẩn (`lib/supabase/*`), PKCE exchange, đăng xuất, onboarding (ngoài đoạn ghi kho), remembered-account (theo D2).

### File xóa hoàn toàn (7)

```
app/auth/switch-account-action.ts
app/api/auth/restore/route.ts
app/api/auth/vault-sync/route.ts
components/cins/SessionRestorer.tsx
lib/auth/account-vault.ts
lib/auth/refresh-error.ts        # chỉ phục vụ switch/restore — xác nhận lại không còn import
```

### File sửa một phần (16)

| File | Gỡ gì |
|---|---|
| `components/cins/UserAccountMenu.tsx` | Block `.app-user-switch` (149–248), state `switchOpen`, prop `savedAccounts`, type `SwitchableAccount`, import 2 server action |
| `components/cins/CinsAppTopbar.tsx` | `SessionRestorer`, `canRestore`, `getSwitchableAccounts`/`hasRestoreHint`/`readAccountVault`, prop `savedAccounts`. **Lưu ý:** điều kiện hiện `isAuthed \|\| canRestore` → còn `isAuthed` |
| `components/cins/home-v2/CinsHomeV2Page.tsx` | State `topbarSavedAccounts` + phần fetch `savedAccounts` |
| `components/cins/home-v2/HomeV2TopbarUserMenu.tsx` | Prop `savedAccounts` (giữ portal) |
| `components/auth/AuthSessionRemember.tsx` | Toàn bộ nhánh `vault-sync` (39–62); giữ `saveRememberedAccount` |
| `app/auth/callback/route.ts` | 112–136 (chụp phiên cũ) + 185–226 (upsert kho, set hint) — **đây là phần lời nhất về tốc độ** |
| `app/auth/sign-out-action.ts` | 30–35 (gỡ nick khỏi kho), 40 (`clearRestoreHint`) |
| `app/api/auth/login/route.ts` | 174–186 |
| `app/api/auth/reset-password/route.ts` | 164–176 |
| `app/api/auth/session-profile/route.ts` | Field `savedAccounts` trong response |
| `app/[slug]/journey/actions.ts` | 360–380 trong `submitOnboarding` |
| `app/login/page.tsx` | `addAccount` (25–33, 45–47, 62) |
| `app/login/LoginActions.tsx` | Prop `addAccount` + logic 104–130, 152 |
| `app/login/LoginGoogleButton.tsx` | Prop `forceAccountPicker` |
| `lib/auth/google-oauth.ts` | `forceAccountPicker` → bỏ `prompt: "select_account"` (theo D3) |
| `components/auth/HomeLoginCard.tsx`, `components/cins/home-v2/GuestHomeLoginPanel.tsx` | Prop `addAccount` |
| `app/cins-app-nav.css` | Block 1044–1180 (`.app-user-switch*`). Giữ `.tb-user*`, `.app-user-menu*` |

### Database

**Không có migration.** Kho chỉ nằm ở cookie httpOnly `cins-accounts`; không có bảng/cột Supabase riêng. `user_nguoi_dung` chỉ bị đọc, không đổi.

---

## 3. Không cần API mới

Chỉ xóa 2 route (`restore`, `vault-sync`) và bớt 1 field ở `session-profile`. Không thêm endpoint nào.

---

## 4. Các bước thực hiện (thứ tự an toàn, 1 nhánh)

**Phase 1 — Gỡ mặt UI** (người dùng thấy ngay, build vẫn xanh)
1. `UserAccountMenu.tsx`: xóa block switch + state + prop.
2. `CinsAppTopbar.tsx`: bỏ `SessionRestorer` + 3 lời gọi vault; sửa điều kiện hiện nút đăng nhập.
3. `HomeV2TopbarUserMenu.tsx` + `CinsHomeV2Page.tsx`: bỏ `savedAccounts`.
4. `app/cins-app-nav.css`: xóa 1044–1180.

**Phase 2 — Gỡ nơi ghi kho** (auth entry points)

5. `app/auth/callback/route.ts` — gỡ chụp phiên cũ + upsert/hint.
6. `login/route.ts`, `reset-password/route.ts`, `journey/actions.ts`, `sign-out-action.ts`, `session-profile/route.ts`.
7. `AuthSessionRemember.tsx` — bỏ vault-sync.
8. Luồng «Thêm tài khoản»: `login/page.tsx`, `LoginActions.tsx`, `LoginGoogleButton.tsx`, `google-oauth.ts`, `HomeLoginCard.tsx`, `GuestHomeLoginPanel.tsx`.

**Phase 3 — Xóa file chết**

9. Xóa 7 file ở §2. Chạy `rg "account-vault|switch-account-action|SessionRestorer|vault-sync|isDeadRefreshToken"` phải ra 0 kết quả (ngoài docs).
10. `npx tsc --noEmit` + `npm run lint` + `npm run build`.

**Phase 4 — Dọn cookie tồn dư (D4)**
11. Trong `middleware.ts`, **chỉ khi request thực sự mang cookie** (tránh gửi `Set-Cookie` thừa mọi request, hỏng cache CDN):

```ts
if (request.cookies.has("cins-accounts")) response.cookies.delete("cins-accounts");
if (request.cookies.has("cins-restore-hint")) response.cookies.delete("cins-restore-hint");
```

12. Tạo TODO gỡ đoạn này sau ~4 tuần.

**Phase 5 — Tài liệu**
13. `docs/CINS_IMPLEMENTATION.md`: xóa 2 API restore/vault-sync (dòng 17–18) + mục «Kho đa tài khoản» (~493).
14. `docs/PLAN_auth_session_on_dinh.md`: đánh dấu archived, ghi rõ đã thay bằng plan này.
15. `docs/CINS_DECISIONS.md`: ghi quyết định "bỏ multi-account, phiên đơn dựa cookie Supabase chuẩn" + lý do.

---

## 5. Edge cases

| Tình huống | Kết quả sau khi gỡ | Xử lý |
|---|---|---|
| User đang có `cins-accounts` với 2–5 nick | Cookie thành rác, không ai đọc | Phase 4 xóa; kể cả không xóa cũng vô hại (httpOnly, tự hết hạn 60 ngày) |
| User đang ở trạng thái "khách nhưng sắp được restore" ngay lúc deploy | Không còn tự khôi phục → phải đăng nhập lại **một lần** | Chỉ ảnh hưởng số ít user đang kẹt sẵn. User bình thường không bị gì (§0b) |
| Cookie phiên Supabase hết hạn / hỏng | Trước đây restore cứu được; giờ về khách | Đúng hành vi chuẩn. Bug gốc gây hỏng đã vá ở middleware — **không được regress** (§0b) |
| Đang mở `/login` khi đã đăng nhập | Không còn chế độ «thêm tài khoản» | Quyết định: redirect về `/` hay hiện login thường — **cần chốt khi làm Phase 2 bước 8** |
| Đăng xuất | Đơn giản hơn: chỉ `signOut` + revalidate | Kiểm tra không còn sót cookie khiến tự đăng nhập lại |
| Nhiều tab | Không còn tab này switch làm tab kia đổi nick | Cải thiện |
| CSS `.sb-user*` (sidebar) | Không phải của feature này | Giữ nguyên |

---

## 6. Security

- **Được lợi:** bỏ hẳn một cookie chứa **tối đa 5 refresh token** — giảm rõ bề mặt tấn công. Trước đây lộ 1 cookie = lộ nhiều tài khoản.
- Không tạo endpoint mới → không phát sinh bề mặt.
- Cookie `cins-accounts` là httpOnly, client JS không đọc được → xóa an toàn, không cần thông báo bảo mật cho user.
- Kiểm tra kỹ: sau khi gỡ, `sign-out-action.ts` **không** còn đường nào khiến phiên được dựng lại sau khi đăng xuất.

---

## 7. Verify checklist

- [ ] `npx tsc --noEmit` sạch
- [ ] `npm run lint` sạch
- [ ] `npm run build` thành công
- [ ] `rg "cins-accounts|cins-restore-hint|savedAccounts|account-vault"` chỉ còn ở `middleware.ts` (dọn cookie) và docs
- [ ] Đăng nhập Google: đo thời gian từ lúc bấm → tới trang chủ, **so với trước khi gỡ** (mục tiêu chính)
- [ ] Đăng nhập email/mật khẩu chạy đúng
- [ ] Đăng ký mới → onboarding → chốt slug: không lỗi
- [ ] Reset mật khẩu chạy đúng
- [ ] Đăng xuất → về trang khách và **ở yên trạng thái khách** (không tự đăng nhập lại)
- [ ] Topbar khách hiện đúng «Đăng nhập / Đăng ký» ngay lần render đầu, không nháy
- [ ] Menu tài khoản còn đủ: Trang cá nhân, tạo org/cộng đồng, Cài đặt, theme, Đăng xuất
- [ ] Home v2 (`CinsHomeV2Page`) menu user hoạt động
- [ ] Card «Tiếp tục với @nick» ở `/login` vẫn chạy (D2)
- [ ] Test với browser **đang có** cookie `cins-accounts` cũ → không lỗi, cookie bị xóa, **và phiên vẫn còn** (không bị đá ra khách)
- [ ] **Giữ phiên:** đăng nhập → đóng hẳn trình duyệt → mở lại → vẫn đăng nhập (cookie 400 ngày, §0b)
- [ ] **Không regress bug gốc:** mở `/login` khi đang đăng nhập, F5 vài lần, chờ token sát hạn → phiên không chết. Xác nhận `middleware.ts` vẫn sync cookie cho `/login`
- [ ] DevTools Network: không còn request `/api/auth/restore` và `/api/auth/vault-sync`

---

## 8. Ước lượng

23 file (7 xóa, 16 sửa), không migration, không API mới. Phần rủi ro nhất là `app/auth/callback/route.ts` — nên review riêng đoạn đó.

**Model đề xuất cho bước implement:** Grok 4.5, effort Medium (đa file + chạm auth). Làm theo từng Phase, không gộp cả 5 phase vào một lượt.
