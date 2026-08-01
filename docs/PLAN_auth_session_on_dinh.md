# PLAN: Ổn định phiên đăng nhập & kho tài khoản (`cins-accounts`)

Ngày: 02/08/2026 · Dựa trên điều tra code + source `@supabase/ssr` 0.10.2 / `auth-js` 2.105.1 / Next 16.2.9
Trạng thái: **đã implement Bước 1–5** (2026-08-02). Bước 6 giữ nguyên (không sửa code).
Chốt 02/08/2026: làm **cả Bước 1–5 trong một đợt**; Bước 6 chọn **phương án A** (giữ nguyên hành vi đăng xuất → không sửa code).
Triệu chứng gốc: tài khoản (vd. `@basakila`) thường xuyên mất phiên, mở lại phải đăng nhập Google lại; sau khi «Thêm tài khoản» thì nick cũ biến mất khỏi menu chuyển nhanh.

## Bối cảnh đã xác minh (không suy đoán)

Đọc trực tiếp `node_modules` — bốn dữ kiện quyết định:

| Dữ kiện | Kết luận |
|---|---|
| `@supabase/ssr` ép `maxAge = 400 ngày` ở mọi nhánh ghi cookie | Cookie phiên **không** phải session-cookie; đóng trình duyệt không làm mất phiên → loại giả thuyết này |
| `__loadSession()` tự refresh khi còn `< EXPIRY_MARGIN_MS` (**90 giây**) trước hạn, **kể cả khi** `autoRefreshToken: false` | `getUser()` / `getSession()` đều có thể xoay refresh token ở **bất kỳ** ngữ cảnh nào, gồm RSC |
| `TOKEN_REFRESHED` được `await` đồng bộ trong `_callRefreshToken` | Middleware và Route Handler **ghi được** token vừa xoay → hai nơi này an toàn |
| Server client dùng `lock = lockNoOp` (`navigatorLock` chỉ có ở browser) | Hai client trong cùng một request **có thể refresh song song** không khoá |

Và cơ chế phá phiên: khi refresh lỗi mà **không** phải `AuthRetryableFetchError`, `_callRefreshToken` gọi `_removeSession()` → xoá cookie phiên → user thành khách.

### Nguyên nhân gốc

`middleware.ts` làm đúng: `resolveSession()` gọi `getUser()` rồi ghi cookie đã xoay lên response. Nhưng `isBypassedPath()` cho `/login` đi thẳng qua `NextResponse.next()`, trong khi `/login` là RSC `force-dynamic` và vẫn gọi `getCurrentSessionAndProfile()`. RSC **không được ghi cookie**, và `lib/supabase/server.ts` nuốt lỗi đó trong `try/catch`.

→ Mỗi lần mở `/login` sát hạn token: refresh token bị xoay, **bản mới bị vứt**, trình duyệt giữ bản cũ đã tiêu thụ. Quá khoảng ân hạn tái sử dụng (mặc định 10 giây) là chết hẳn.

Nút «Thêm tài khoản» trong `UserAccountMenu` là `<Link href="/login">` — đi đúng vào path này.

### Chuỗi hỏng hoàn chỉnh

```
mở /login (middleware bỏ qua)
  └─ RSC getCurrentSessionAndProfile() → getUser() → xoay RT1→RT2
       └─ cookieStore.set() ném lỗi trong RSC → nuốt → RT2 mất
            └─ trình duyệt còn RT1 (đã tiêu thụ)
                 └─ refresh kế tiếp lỗi → _removeSession() → mất cookie phiên
                      └─ SessionRestorer → /api/auth/restore dùng token cũ trong kho → cũng lỗi
                           └─ nick bị gỡ khỏi kho + tắt hint → khách → đăng nhập Google lại
```

### File neo

| Vai trò | Path |
|---|---|
| Gác cổng / đồng bộ cookie | `middleware.ts` |
| Client RSC (không ghi được cookie) | `lib/supabase/server.ts` |
| Kho tài khoản | `lib/auth/account-vault.ts` |
| Chuyển nick | `app/auth/switch-account-action.ts` |
| Khôi phục phiên | `app/api/auth/restore/route.ts`, `components/cins/SessionRestorer.tsx` |
| OAuth callback | `app/auth/callback/route.ts` |
| Giữ phiên client | `components/auth/AuthSessionRemember.tsx` |
| Đăng xuất | `app/auth/sign-out-action.ts` |
| Hoàn tất hồ sơ mới | `submitOnboarding` trong `app/[slug]/journey/actions.ts` |

---

## Database

**Không ALTER.** Toàn bộ thay đổi nằm ở cookie, middleware và route/action. Không đụng bảng, cột, enum, RLS.

## API

| Bước | Route | Thay đổi |
|---|---|---|
| 2 | `POST /api/auth/restore` | Phân biệt lỗi tạm với token chết; lỗi tạm → **không** gỡ nick, **không** tắt hint |
| 4 | `GET /auth/callback` | Nhánh `intent === "register"`: ghi nick mới vào kho + bật hint khi profile đã có slug |
| 5 | `POST /api/auth/vault-sync` | **Route mới** — đồng bộ refresh token hiện hành vào kho mỗi khi token xoay |

## Frontend

| Bước | File | Thay đổi |
|---|---|---|
| 5 | `AuthSessionRemember.tsx` | Bỏ refresh theo `focus` / `visibilitychange`; thêm gọi `vault-sync` khi `TOKEN_REFRESHED` |
| 3 | `switch-account-action.ts` | Một client, tuần tự — bỏ `Promise.all` hai GoTrue instance |

Không đổi UI, không đổi design token, không đổi `UserAccountMenu`.

---

## Các bước

### Bước 1 — Middleware gác cả `/login` *(gốc rễ, ưu tiên cao nhất)*

Tách `isBypassedPath` thành hai nhóm:

- **Bỏ qua hoàn toàn** (giữ nguyên `NextResponse.next()`): static, `/maintenance`, `/auth/*`, `/api/auth/*`.
  Lý do giữ `/auth/*` và `/api/auth/*`: các route này tự quản cookie (PKCE verifier, `exchangeCodeForSession`, `restore`). Cho middleware refresh trước sẽ **tiêu thụ refresh token** ngay trước khi route handler cần dùng → tạo lỗi mới.
- **Chỉ đồng bộ phiên** (mới): `/login`, `/login/*` → chạy `resolveSession()` để ghi cookie đã xoay, rồi `return sessionResponse` **trước** khối maintenance và trước check protected.

Điểm cần cẩn thận: phải return trước nhánh `MAINTENANCE_MODE`, nếu không `/login` sẽ bị rewrite sang `/maintenance` khi bật bảo trì — mất khả năng đăng nhập.

Phụ trợ: trong `lib/supabase/server.ts`, đổi thông điệp `console.error` thành cảnh báo có ghi rõ tên cookie và ngữ cảnh, để lần sau phát hiện sớm nếu còn RSC nào ghi cookie hụt.

### Bước 2 — Chỉ gỡ nick khi token chết thật

Thêm `lib/auth/refresh-error.ts`:

```ts
import { isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";

/** Chỉ true khi refresh token thực sự vô hiệu (invalid_grant / revoked / not found). */
export function isDeadRefreshToken(error: AuthError | null): boolean {
  if (!error) return false;
  if (isAuthRetryableFetchError(error)) return false;          // mạng chập → giữ nick
  const status = (error as { status?: number }).status ?? 0;
  if (status === 0 || status >= 500) return false;             // Supabase lỗi → giữ nick
  return true;
}
```

`isAuthRetryableFetchError` được re-export qua `@supabase/supabase-js` (đã xác minh `export * from '@supabase/auth-js'`).

Áp dụng:

- `switch-account-action.ts` — lỗi **tạm**: giữ nguyên kho, giữ nguyên phiên hiện tại, quay lại `returnTo` (không đá về `/login`). Lỗi **chết**: gỡ nick như hiện nay.
- `restore/route.ts` — lỗi **tạm**: dừng vòng `while`, trả `restored: false`, **không** ghi đè kho, **không** `clearRestoreHintOnResponse` (nếu tắt hint thì lần sau sẽ không thử lại nữa).

### Bước 3 — Chuyển nick: một client, tuần tự

Thay khối `Promise.all([getCurrentSessionAndProfile(), supabase.auth.getSession()])` bằng, trên **cùng** một `supabase`:

1. `await supabase.auth.getUser()` — xác thực với Auth server và refresh nếu cần (không dùng mỗi `getSession()` để lấy `auth_user_id`, vì `getSession()` không kiểm chữ ký JWT).
2. `await supabase.auth.getSession()` — lần này `__loadSession` thấy token còn hạn nên **không** refresh lần hai; chỉ để đọc `refresh_token` cất vào kho.
3. Query `user_nguoi_dung` (slug / `ten_hien_thi` / `avatar_id`) bằng chính client đó.

Bỏ import `getCurrentSessionAndProfile` khỏi file này. Kết quả: chỉ còn một GoTrue instance → hết nguy cơ hai lần refresh song song không khoá.

### Bước 4 — Nick đăng ký bằng Google được ghi nhớ

Hiện nhánh `intent === "register"` trong `auth/callback` chỉ giữ lại kho cũ, **không** thêm nick vừa tạo và **không** bật hint. Sửa ở hai chỗ để phủ cả trường hợp trigger `handle_new_user()` chưa kịp chạy:

- **`auth/callback`, nhánh register**: nếu đọc được `profile.slug` → `upsertAccount` + `setRestoreHintOnResponse`.
- **`submitOnboarding`** (Server Action, `app/[slug]/journey/actions.ts`): sau khi lưu hồ sơ thành công → đọc phiên hiện tại, `upsertAccount` + `setRestoreHint()`. Đây là chỗ chắc chắn nhất vì slug đã chốt.

### Bước 5 — Bỏ refresh theo focus, thay bằng đồng bộ kho khi token xoay

Xác minh trước: `createBrowserClient` đặt `autoRefreshToken: isBrowser()` → **true**. Browser đã tự gia hạn theo timer, nên gọi tay theo `focus` là thừa và chỉ làm token xoay dày thêm.

- `AuthSessionRemember.tsx`: gỡ `window.addEventListener("focus", refresh)` và `visibilitychange`.
- Trong `onAuthStateChange`, khi `event === "TOKEN_REFRESHED"` → gọi `POST /api/auth/vault-sync` kiểu fire-and-forget, throttle tối thiểu 30 giây.

Route mới `app/api/auth/vault-sync/route.ts` (`runtime = "nodejs"`, `dynamic = "force-dynamic"`):

1. Tạo route-handler client trên một `carrier` response.
2. `getUser()` — không có user thì trả `{ ok: true, synced: false }`.
3. `getSession()` lấy `refresh_token` hiện hành.
4. Query slug / tên / avatar → `upsertAccount` lên `carrier` + `setRestoreHintOnResponse`.
5. `appendSetCookieHeaders(carrier, response)` — theo đúng khuôn mẫu đã dùng ở `restore` và `login` để không làm hỏng cookie phiên bị chunk.

Đây là mảnh vá gốc cho "kho bị cũ": mỗi lần token xoay, kho được cập nhật ngay thay vì chờ tới lần chuyển nick kế tiếp.

### Bước 6 — ĐÃ CHỐT: giữ nguyên, không sửa code

Mục này từng bị tôi liệt kê như một lỗi. Đọc kỹ lại thì `signOutAction` gọi `clearRestoreHint()` là **có chủ đích**, đúng như comment trong file: đăng xuất xong thì không được tự nhảy sang nick khác còn trong kho.

**Quyết định (02/08/2026): phương án A — giữ nguyên.** Đăng xuất là về trạng thái khách hoàn toàn. Hint tự bật lại khi user chủ động đăng nhập hoặc bấm chuyển nick (`switchAccountAction` đã có `setRestoreHint()`).

Phương án B (giữ hint để tự đăng nhập nick kế tiếp) bị loại: dễ gây bất ngờ và có rủi ro riêng tư trên máy dùng chung.

Không có thay đổi code cho bước này. Giữ lại trong plan để lần sau không ai "sửa nhầm" thành bug.

---

## Edge case cần xử lý

| Tình huống | Xử lý |
|---|---|
| Bật `MAINTENANCE_MODE` | `/login` phải return **trước** nhánh rewrite maintenance, nếu không sẽ không đăng nhập được |
| `/auth/callback` đang exchange PKCE | Giữ bypass hoàn toàn ở middleware — tuyệt đối không refresh chen ngang |
| Supabase 5xx / mất mạng khi chuyển nick | Giữ nick trong kho, ở lại trang cũ, báo lỗi tạm — không đá về `/login` |
| Restore gặp lỗi tạm ở nick đầu kho | Dừng vòng lặp, giữ nguyên kho và hint, thử lại lần sau |
| Nhiều tab cùng mở | `navigatorLock` của browser client đã khử trùng lặp; `vault-sync` throttle 30s nên tối đa vài request thừa |
| Trigger `handle_new_user()` chưa tạo profile | Bước 4 phủ bằng `submitOnboarding` |
| Kho phình cookie | Đã có `MAX_SAVED_ACCOUNTS = 5`; ước lượng ~1 KB base64, còn xa mức 4 KB |
| Nick trong kho bị đổi tên/avatar | Ngoài phạm vi plan này — hiện chỉ cập nhật khi upsert |

## Bảo mật

- `cins-accounts` chứa refresh token nên giữ nguyên `httpOnly` + `secure` (prod) + `sameSite=lax`. Route `vault-sync` **không** trả token ra client, chỉ trả `{ ok, synced }`.
- `vault-sync` không nhận bất kỳ input nào từ body; chỉ thao tác trên phiên của chính request. Không có tham số `slug` do client truyền vào — tránh biến nó thành công cụ ghi kho tuỳ ý.
- Bước 3 vẫn dùng `getUser()` (verify chữ ký với Auth server) để lấy `auth_user_id`; `getSession()` chỉ để đọc refresh token của chính mình, không dùng cho phân quyền — theo `CINS_DEV_RULES` §6.
- Không log refresh token ở bất kỳ đâu, kể cả khi debug lỗi refresh.

## Thứ tự thực hiện

Chốt: làm **cả Bước 1–5 trong một đợt**, theo đúng thứ tự 1 → 2 → 3 → 4 → 5.

Thứ tự này không tuỳ tiện: Bước 1 chặn nguồn sinh token chết, Bước 2 ngăn hậu quả lan sang kho, Bước 3 gỡ nguy cơ refresh song song. Ba bước đầu độc lập nhau nên có thể commit riêng. Bước 5 thêm route mới nên để cuối, và phải xong Bước 1 trước thì `vault-sync` mới có ý nghĩa (đồng bộ một token đã chết thì vô dụng).

Bước 6 không phát sinh code.

## Nghiệm thu

Test thủ công, mỗi mục làm trên cả dev (`npm run host`) và preview:

1. Đăng nhập, đợi qua mốc hết hạn access token (hoặc hạ TTL tạm thời), mở thẳng `/login` → phải **vẫn còn phiên**, và điều hướng tiếp không bị đá ra.
2. Đang ở nick A → «Thêm tài khoản» → đăng nhập Google nick B → mở menu: **A vẫn nằm trong danh sách chuyển nhanh**.
3. Chuyển A ↔ B vài lượt, mỗi lượt cách nhau > 1 giờ (hoặc ép xoay token) → không lượt nào rơi về `/login`.
4. Ngắt mạng rồi bấm chuyển nick → báo lỗi tạm, **nick không bị gỡ** khỏi kho; nối mạng lại chuyển được ngay.
5. Xoá cookie phiên (giữ `cins-accounts`) → tải lại → `SessionRestorer` khôi phục đúng nick gần nhất.
6. Đăng ký nick mới bằng Google → hoàn tất onboarding → nick mới có mặt trong kho.
7. Mở 2–3 tab, chuyển qua lại giữa các tab trong 2 giờ → không tab nào bị đăng xuất.
8. Bật `MAINTENANCE_MODE = true` → `/login` vẫn vào được.

## Rủi ro đã lường

- `/login` nay thêm một lần `getUser()` ở middleware → chậm hơn vài chục ms. Chấp nhận được, và trang này vốn đã gọi `getCurrentSessionAndProfile()`.
- `vault-sync` thêm khoảng một request mỗi tab mỗi giờ. Không đáng kể.
- Nếu dự án Supabase đang đặt `refresh_token_reuse_interval = 0`, Bước 3 là bắt buộc chứ không phải tuỳ chọn — nên kiểm tra giá trị này trên Dashboard trước khi làm.

## Cập nhật tài liệu sau khi implement

- `docs/CINS_IMPLEMENTATION.md` — bảng API auth: thêm `auth/vault-sync`; mục *Journey & auth*: ghi lại việc middleware nay đồng bộ phiên trên `/login`.
- `docs/CINS_DECISIONS.md` — chỉ khi chọn phương án **B** ở Bước 6 (đổi hành vi đăng xuất).
