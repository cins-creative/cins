# LOGIC_TOUCHPOINTS — CINs UI Lab

Registry các chỗ UI lab **đụng logic** web chính. Đọc trước khi apply về production.

Format mỗi dòng:

| ID | Route / file lab | Hành vi thật (web chính) | Mock hiện tại | Bước apply |
|---|---|---|---|---|

---

## Home `/`

| ID | Route / file lab | Hành vi thật | Mock | Apply |
|---|---|---|---|---|
| `home.session-gate` | `src/app/page.tsx`, `HomeLabPage.tsx` | `getCurrentSessionAndProfile()` → guest `GuestHomePage` hoặc `HomeWorldJourneyMain` | Toggle Guest/Logged-in trên LabChrome | Server session; bỏ chrome toggle |
| `home.persona` | `src/mocks/session.ts`, LabChrome select | `resolvePersona(giai_doan)` → module HỌC/LÀM/DẠY; `tim_viec` = seeking | Select `giai_doan` local | Đọc `user_nguoi_dung.giai_doan`; redirect `/onboarding` nếu null |
| `home.guest-data` | `src/mocks/guest-home.ts`, `GuestHomeLab.tsx` | `loadGuestHomeData()` (cache, multi-query) | Fixture tĩnh | Wire `loadGuestHomeData`; giữ shape props view |
| `home.guest-login-panel` | `GuestHomeLab.tsx` aside | `GuestHomeLoginPanel` → `LoginActions` Google OAuth/PKCE | CTA link `/login` lab | Restore `LoginActions` + `/auth/callback` |
| `home.feed` | `LoggedInHomeLab.tsx`, `mocks/logged-in-home.ts` | `fetchWorldJourneyFeedPageCached` + gallery; tab following/explore; infinite scroll; filter | Fixture cards + tab local state | Reconnect feed/gallery fetch, sort, filter chips |
| `home.sidebar-modules` | `LoggedInHomeLab.tsx` Left/RightModules | `HomeModuleColumn` + loaders `lib/cins/home-adaptive/*` | Panel tĩnh theo persona | Restore server modules + fetches |
| `home.follow-org` | `FollowRow` trong `LoggedInHomeLab.tsx` | `OrgFollowButton` / `user_theo_doi` mutation | `useState` toggle | Follow/unfollow API |
| `home.profile-completeness` | module LÀM «Hồ sơ của bạn» | `profile-completeness.ts` | Copy tĩnh ~60% | Tính từ field profile thật |
| `home.compose` | composer row logged-in | `JourneyComposeProvider` + publish `content_cot_moc` | Mở/đóng text mock, không submit | Compose overlay + publish API |
| `home.feed-boost` | (ẩn trên card) | World editorial boost L29 + feed scoring | Không badge (đúng product: ẩn với viewer) | Scoring/boost server-side; UI không nhãn |

---

## Login `/login` (stub)

| ID | Route / file | Hành vi thật | Mock | Apply |
|---|---|---|---|---|
| `login.oauth-google` | `src/app/login/page.tsx` | Supabase Google OAuth PKCE | Nút «Đăng nhập demo» set session lab | OAuth thật; xoá nút demo |

---

## Onboarding `/onboarding` (stub)

| ID | Route / file | Hành vi thật | Mock | Apply |
|---|---|---|---|---|
| `onboarding.giai-doan` | `src/app/onboarding/page.tsx` | Ghi `giai_doan`; Home redirect nếu null | Select local + setAuthenticated | Persist profile; enforce redirect |

---

## Lát cắt sau (chưa implement — dự kiến)

| ID | Slice | Ghi chú |
|---|---|---|
| `gallery.*` | `/gallery` | fetch gallery, CDN variants, masonry |
| `journey.*` | `/journey` | owner fetch, verify, co-author |
| `entity.*` | `/entity` | canonical prose, lens tabs, curator |
| `studio.*` | `/studio` | auth gate, upload, publish |
| `chat.*` | `/chat` | membership, realtime, L28 rooms |

Cập nhật bảng này mỗi khi thêm `LOGIC_TOUCH` mới.
