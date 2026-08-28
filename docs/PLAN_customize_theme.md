# PLAN — Customize giao diện cho user & shop

> **Trạng thái:** BUILD Phase 1.6 ✅ (2026-08-28) — neo + ảnh theo device + applyToHome
> **Chốt với user:** roadmap 5 nhóm (+ topbar ngoài phạm vi profile-owner), **Phase 1 nhóm A** + **1.5 ảnh nền** ✅ + **1.6** ✅. Accent viewer đăng nhập khắp site; họa tiết/ảnh nền hồ sơ + home (home = opt-in).
> **Ai được dùng:** **mọi user**, chưa gate billing (chỉ chừa hook).
> **Quyết định đã chốt:** ALTER `user_nguoi_dung.giao_dien` ✅ · preset màu + colorwheel ✅ · pattern nền ✅ · **ảnh nền upload Phase 1.5** ✅ · **draft + Lưu** ✅ · mockup phone/tablet/desktop ✅ · **topbar không custom** ✅
> **Phase 1.6 đã chốt + build:** customs cap **3** · kế thừa ảnh · **bỏ tile** · home theo neo/ảnh **của viewer** + checkbox **Áp dụng trang chủ** (mặc định tắt).

---

## 0. Roadmap 5 nhóm (+ topbar = ngoài phạm vi)

| # | Nhóm | Vùng DOM / component | Phase |
|---|---|---|---|
| **A** | **Theme trang hồ sơ** — màu + pattern (+ ảnh nền sau) | `.cins-journey-page` · `.j-shell` · `.j-tlb` | **NOW** |
| B | Khung & viền avatar | `.j-avatar.j-avatar-editable` (`JourneyAvatarTrigger`), `JourneyVisitorAvatar` | Sau |
| C | Theme shop | `ShopSwitchCard`, `JourneyShopSectionHead`, `.j-shop-sf-*` | Sau |
| D | Card user (popover) | `.j-user-popover-backdrop` (`JourneyUserPopover`) | Sau |
| E | Thanh bài post | `.jcard`, `.jcard-datebar` (`JourneyMilestoneCard`) | Sau |

**Topbar (`#app-topbar` / `.topbar-inner`):** **không custom** — luôn theo chrome hệ thống CINS (light/dark toàn site). Không ghi đè token lên topbar.

**Nguyên tắc:** một SoT cho user, một SoT cho shop. Nhóm B–F thêm **key** vào cùng cột jsonb, **không** tạo cột/bảng mới cho từng nhóm.

---

## 1. SSOT scan (DEV_RULES §1)

### Đang có gì

| Sự thật | Nguồn hiện tại | Kết luận |
|---|---|---|
| Light/dark toàn site | `localStorage` `cins-theme` → `<html data-theme>` | Giữ nguyên, không thêm cột DB trùng |
| Theme thẻ chia sẻ OG | `user_nguoi_dung.theme` (text JSON) · `org_to_chuc.cau_hinh.share_og_theme` | **Khác grain** (ảnh OG) — không nhồi theme UI vào |
| Bố cục trang chủ | `user_nguoi_dung.home_layout` (jsonb) | **Tiền lệ**: cột jsonb chuyên dụng cho một mặt UI |
| Ảnh bìa / avatar | user vs `shop_cua_hang` | **Cố ý tách** — plan này giữ tách |
| Màu voucher | `shop_voucher.design_mau_nen/_mau_chu` | Grain khác, không gộp |

**Không tồn tại** cột nào giữ theme UI của user/shop → phải tạo mới, không có nguồn để reuse.

### ALTER (user đã duyệt)

```sql
-- supabase/sql/migration_user_giao_dien.sql
ALTER TABLE user_nguoi_dung
  ADD COLUMN giao_dien jsonb NOT NULL DEFAULT '{}'::jsonb;
```

- Grain: "tùy chỉnh giao diện hiển thị của chủ thể X" — 1 chủ thể = 1 hàng = 1 cột.
- Không index (luôn đọc kèm hàng hồ sơ theo `id`/`slug`), không trigger, không cột cache.
- `shop_cua_hang.giao_dien` để **Phase C**, không ALTER ở Phase 1.
- Ghi inventory ALTER vào `docs/CINS_DECISIONS.md` **trước** khi chạy migration.
- RLS: kiểm tra policy thực tế của `user_nguoi_dung` trước khi ship, không giả định.

### Shape jsonb (v1, forward-compatible)

```jsonc
{
  "v": 1,
  "theme": {
    "accent": "mint",                 // 1 trong 16 preset id (§2.1)
    "background": {
      "kind": "pattern",              // "none" | "pattern" | "image"
      "patternId": "dots",            // khi kind = "pattern"
      "imageId": "abc123",            // khi kind = "image" (Cloudflare Images)
      "fit": "cover",                 // "cover" | "tile"
      "dim": 0.35                     // 0.2–1, độ đậm nền (UI); lớp phủ CSS = 1 − dim
    },
  },
  "customs": [                        // ảnh nền đã upload, cap 6 (§2.3)
    { "imageId": "abc123", "createdAt": "2026-08-28T…" }
  ],
  "avatarFrame": { },                 // nhóm B — thêm sau, không phá v1
  "card": { },                        // nhóm E
  "popover": { }                      // nhóm D
}
```

Parser **tolerant**: thiếu key → default; `v` lạ → coi như `{}` (về theme gốc).

---

## 2. Nội dung customize (nhóm A)

### 2.1 — 16 preset màu accent

Mỗi preset = **một hue neo**, hệ tự sinh `-dark` / `-soft` bằng `color-mix()`. Không cho nhập hex tự do ở Phase 1 (giữ chất lượng thị giác toàn sàn).

| # | id | Nhãn | Neo |
|---|---|---|---|
| 1 | `cins` | CINs Blue (mặc định) | `--cins-blue` #1F74C9 |
| 2 | `sky` | Xanh trời | #38A3F5 |
| 3 | `teal` | Xanh ngọc | #0E9F9F |
| 4 | `mint` | Bạc hà | `--cins-mint-dark` #1A7F57 |
| 5 | `forest` | Xanh rừng | #2F7A3E |
| 6 | `lime` | Cốm | #6A9E1F |
| 7 | `sun` | Nắng | #C99A00 (từ `--cins-yellow`) |
| 8 | `orange` | Cam | `--cins-orange` #FDAD4C → ink #B4620A |
| 9 | `coral` | San hô | #E4633F |
| 10 | `rose` | Hồng đào | #D94A72 |
| 11 | `berry` | Mâm xôi | #B03A6E |
| 12 | `violet` | Tím | `--cins-violet` #BB89F8 → ink #7A45C4 |
| 13 | `indigo` | Chàm | #4B54C6 |
| 14 | `slate` | Xám đá | #4A5160 |
| 15 | `mocha` | Nâu sữa | #8A6242 |
| 16 | `ink` | Mực đen | #1B1F2A |

**Ràng buộc:** preset lưu hue neo dùng cho **light**; ở dark mode hệ tự nâng sáng (`color-mix(accent, white 25%)`) thay vì dùng màu neo — xem §6.

### 2.2 — Pattern nền (preset)

Tái dùng đúng cơ chế đã có trong `lib/journey/share-og-theme.ts` (`patternImage` + `patternSize` sinh bằng gradient CSS, không cần file ảnh): `paper` · `dots` · `grid` · `diagonal` · `crosshatch` · `confetti` · `blueprint` · `none`.

Lợi ích: **0 request ảnh**, pattern tự nhuộm theo accent (`color-mix` với accent), tự đảo ở dark mode. Đây là lựa chọn mặc định nên đẩy user vào.

### 2.3 — Ảnh nền do user upload ✅ **Phase 1.5**

- `POST /api/user/giao-dien/upload` → `prepareImageFileForCloudflareUpload` (giống `/api/post-image/upload`) rồi CF Images; prepend `customs` (cap 6); **không** đổi `theme.background` (client chọn rồi Lưu PATCH).
- Không giới hạn 5MB cứng: nguồn ≤40MB được nén xuống dưới trần CF (~10MB); lớn hơn / nén thất bại → 413.
- CSS: `--j-bg-image-sm` / `--j-bg-image` / `--j-bg-image-md` đều variant **`public` (1920×1080)** — không `gridsm` (400px, vỡ nét trên full-bleed).
- UI: hàng thumb + slider dim + Phủ kín/Lặp ô + **JourneyThemeDevicePreview** (375 / 768 / 1280).

---

## 3. Kiến trúc CSS — điểm mấu chốt

`journey.css` (**25.595 dòng**) + `journey-shop-view.css` (**5.365 dòng**) đã dùng token toàn cục chứ không hardcode màu. Vì CSS custom property kế thừa theo cascade, chỉ cần **ghi đè một nhóm token nhỏ trên phần tử scope** là cả 30k dòng đổi theo — **không sửa file CSS lớn**.

### Whitelist token (đúng 8 biến)

| Biến | Ảnh hưởng | Nguồn |
|---|---|---|
| `--cins-blue` | accent: link, chip active, nút primary, `--j-tagged` | preset accent |
| `--cins-blue-dark` | hover/pressed | dẫn xuất |
| `--cins-blue-soft` | nền tonal, tab chọn | dẫn xuất |
| `--border` | viền phân cách | dẫn xuất |
| `--j-bg-image` | pattern hoặc ảnh nền | §2.2 / §2.3 |
| `--j-bg-size` | tile size của pattern | preset |
| `--j-bg-dim` | độ phủ lớp tối | `background.dim` |
| `--j-bg-attach` | `scroll` (xem §4 — **không** dùng `fixed`) | hệ thống |

**Cấm** user set `--ink-*`, `--neutral-*`, `--bg-surface` → tránh tự tạo giao diện không đọc được.

### Nơi gắn

```
main.cins-main
  └── .cins-journey-page[data-profile-theme]   ← inline style vars (SSR)
       └── .j-shell                              ← accent + pattern/ảnh nền
```

Scope **chỉ** `.cins-journey-page` — topbar nằm ngoài, không nhận vars. Server render đặt `style` + `data-profile-theme` — **không** inject `<style>` tag.

---

## 4. Responsive — hợp đồng bắt buộc

> Sẽ tách thành rule riêng: `.cursor/rules/cins-theme-responsive.mdc` (Step 0). Skill nền: `.agents/skills/responsive-craft/SKILL.md`.

Theme đụng **nền toàn trang**, là nơi responsive hay vỡ nhất. Hợp đồng:

| Chủ đề | Luật |
|---|---|
| **Escalation** | Intrinsic CSS → container query → media query. Theme Phase 1 **không được** thêm media query layout mới; chỉ dùng `clamp()` + biến |
| **Ảnh nền mobile** (Phase 1.5) | `< 768px`: dùng **variant Cloudflare nhỏ hơn** qua `image-set()`; không tải bản desktop trên máy 375px |
| **`background-attachment`** | **Cấm `fixed`** — iOS Safari repaint giật + phá `position: sticky` của `.j-sidebar` |
| **`100vh`** | Dùng `100svh`/`dvh` có fallback `vh`. `.cins-journey-page` hiện dùng `calc(100vh - var(--j-topbar-h))` → phải chuyển sang `dvh` khi chạm |
| **Sticky** | `.j-sidebar` và `.j-shop-sf-section-head` đang sticky. Không được thêm `overflow: hidden` hay `transform` lên tổ tiên. Dùng `overflow: clip` |
| **Tương phản mobile** | Ở `< 768px` sidebar xếp chồng lên nền → `--j-bg-dim` tự **+0.1** để chữ vẫn đọc được |
| **Panel chọn theme** | `< 640px` render dạng bottom-sheet, không popover; input `font-size: max(16px, 1rem)` (chặn iOS zoom) |
| **Safe area** | Bottom-sheet phải `padding-bottom: env(safe-area-inset-bottom)` |
| **Reduced data / contrast** | `prefers-contrast: more` → bỏ ảnh nền, về token gốc |
| **Dải test** | Kéo mượt 320 → 2560px; chốt tại 375 / 768 / 1024 / 1440 / 1920 |

---

## 5. API

| Method | Route | Vai trò |
|---|---|---|
| `GET` | `/api/user/giao-dien` | State đã normalize (cho panel edit) |
| `PATCH` | `/api/user/giao-dien` | Ghi `theme` (merge nông — **giữ** key nhóm B–F) |
| `DELETE` | `/api/user/giao-dien` | Reset default |
| `POST` | `/api/user/giao-dien/upload` | ✅ Phase 1.5 — upload ảnh nền → CF Images, push `customs` |

Theo pattern `app/api/user/home-layout/route.ts` + `app/api/share-theme/upload/route.ts`.

- **Không** thêm endpoint đọc public: theme đi kèm dữ liệu hồ sơ đã fetch sẵn → 0 round-trip thêm cho người xem.
- Validate server: `accent` ∈ 16 id · `patternId` ∈ danh sách · `imageId` phải nằm trong `customs` của chính user · `dim` ∈ [0, 1] · `kind` ∈ enum. Sai → 400, không silently fix.

---

## 6. Frontend

### 6.1 Đọc (SSR — không nháy)

- Thêm `giao_dien` vào select của `lib/journey/profile-page-fetch.ts` (+1 cột, không N+1).
- Module mới `lib/journey/profile-theme.ts`:
  - `PROFILE_ACCENTS` (16 preset) · `PROFILE_PATTERNS` (8 pattern)
  - `parseProfileTheme(raw)` — tolerant + default
  - `profileThemeCssVars(state, mode)` — sinh 8 biến, dẫn xuất bằng `color-mix()`
  - `profileBgImageSet(imageId)` — `image-set()` 2 variant CF (mobile / desktop)
  - `isPremiumPreset(id)` — hook billing, Phase 1 luôn `false`
- `JourneyProfilePageLoader` / wrapper `.cins-journey-page` nhận vars qua prop → `style` + `data-profile-theme`. **Không** gắn lên `CinsShell` (tránh rò sang topbar).

### 6.2 Ghi (panel chỉnh)

- `components/journey/JourneyThemePicker.tsx`, mở từ "Chỉnh sửa hồ sơ".
- **Tách nhãn rõ** với `JourneyShareThemePicker` (theme thẻ chia sẻ) — hai thứ khác nhau, dễ nhầm.
- Preview live (optimistic set vars lên DOM), PATCH nền, lỗi → revert + toast.
- Lazy-load (`next/dynamic`) — khách xem trang không tải bundle panel.

### 6.3 CSS mới

`components/journey/journey-theme.css` (~150–200 dòng): rule cho `.cins-journey-page[data-profile-theme]` + nhánh dark + picker/bottom-sheet. **Không đụng** `journey.css`. **Không** style topbar.

---

## 7. Edge cases

| # | Tình huống | Xử lý |
|---|---|---|
| 1 | **Dark mode + theme user** | Nền OLED **không** bị ghi đè; accent tự sáng `color-mix(accent, white 25%)`; ảnh nền `dim` tự +0.15 |
| 2 | **Tương phản kém** | Server tính luminance; contrast < 4.5:1 với `--bg-surface` → tự dịch accent (có ghi trong doc, không "sửa im lặng" khó hiểu) |
| 3 | `giao_dien` = `{}` / null / JSON hỏng | `parseProfileTheme` → default, render y hệt hôm nay |
| 4 | **Ảnh nền chết / CF 404** | `background-color` fallback luôn set trước `background-image` → không bao giờ trắng trơn |
| 5 | **Ảnh nền quá nặng / animated GIF** | Nén sharp như post-image (≤40MB nguồn → ≤~10MB); GIF động → frame đầu; không serve bản gốc |
| 6 | **Card user A hiện trong Gallery/feed B** | Phase 1 theme **không rò** ra ngoài trang hồ sơ (scope theo `.cins-shell[data-profile-theme]` của route `/{slug}`). Nhóm E giải riêng |
| 7 | **Popover portal (nhóm D)** | Ghi nhận: portal nằm ngoài cascade → phải truyền vars vào portal root |
| 8 | **OG image / share card** | Không đọc `giao_dien`; vẫn dùng `user_nguoi_dung.theme`. Hai hệ tách bạch |
| 9 | **Trang shop `/{slug}/shop/{shopSlug}`** | Phase 1 kế thừa theme user; Phase C mới cho shop override |
| 10 | **Xoá ảnh trong `customs` đang được dùng** | Chuyển `background.kind` → `pattern` trước khi xoá, không để trỏ ảnh mồ côi |
| 11 | **Print** | `@media print` → bỏ nền, giữ chữ đen |

---

## 8. Security & performance

- Màu **chỉ nhận id preset** (không chuỗi CSS tự do) → **không thể CSS injection**. Ảnh nền chỉ nhận `imageId`, URL do server dựng từ account hash.
- `imageId` phải thuộc `customs` của chính user → không mượn ảnh người khác qua PATCH.
- Ghi: kiểm `auth.uid()` ở route handler **và** dựa RLS; không tin id từ client.
- Merge jsonb đọc–sửa–ghi (hoặc `jsonb_set`) để PATCH nhóm A **không xoá** key nhóm B–F.
- Ảnh nền: `loading` không áp dụng cho CSS background → phải chọn variant đúng kích thước, nếu không sẽ **hại LCP trang công khai**. Đây là rủi ro perf lớn nhất của Phase 1.
- Không thêm cache layer; theme đi cùng dữ liệu hồ sơ.

---

## 9. Steps thực thi Phase 1

| Step | Nội dung | File | UI? |
|---|---|---|---|
| 0 | ✅ Rule responsive theme | `.cursor/rules/cins-theme-responsive.mdc` | Không |
| 0b | ✅ Inventory ALTER | `docs/CINS_DECISIONS.md` | Không |
| 1 | ✅ Migration | `supabase/sql/migration_user_giao_dien.sql` · `npm run migrate:giao-dien` | Không |
| 2 | ✅ Lib preset/pattern/parse/vars | `lib/journey/profile-theme.ts` | Không |
| 3 | ✅ API GET/PATCH/DELETE | `app/api/user/giao-dien/route.ts` | Không |
| 4 | ✅ Fetch + gắn vars SSR | `profile-page-fetch.ts`, `JourneyProfilePageLoader.tsx` | Có |
| 5 | ✅ Panel chọn theme + preview live | `JourneyThemePicker.tsx`, `journey-theme.css`, EditProfileModal | Có |
| 6 | ✅ Dark mode + contrast (CSS color-mix) | `journey-theme.css` | Có |
| 7 | ⬜ Pass responsive 320→2560 (manual) | — | Có |

**Chia brief build:** Step 1–3 (backend — Grok 4.5 / Medium) → Step 4–6 (frontend — Grok 4.5 / Medium) → Step 7 (responsive pass — Composer 2.5 / Low).

---

## 10. Phase 1.5 — ảnh nền ✅ (2026-08-28)

- Upload + customs + PATCH image + CSS variants + mockup thiết bị trong picker.

## 11. Phase 1.6 — neo ảnh + ảnh theo thiết bị + opt-in home ✅ (2026-08-28)

> **Nhu cầu:** mockup phone/tablet/desktop — kéo neo vùng ảnh; upload ảnh riêng từng device; bỏ tile; trang chủ chỉ nhận theme khi user bật checkbox (theme home = của **chính viewer**, không của chủ profile đang xem).

### 11.1 SSOT

| Sự thật | Nguồn | Kết luận |
|---|---|---|
| Ảnh nền + dim + neo | `giao_dien.theme.background` | **Cùng grain** — mở rộng key, **không** cột mới |
| Pool ảnh đã upload | `giao_dien.customs` | 1 pool; mỗi device trỏ `imageId` ∈ customs |
| Có áp theme lên home không | `giao_dien.theme.applyToHome` | Cùng cột jsonb |

**Không ALTER.** Parser tolerant.

### 11.2 Cap `customs` = **3** (giải thích)

Phase 1.5 chọn **6** chỉ để user thử nhiều ảnh rồi chọn, không phải “3 device × 2”. Với ảnh-theo-device:

| Cap | Ý nghĩa |
|---|---|
| **3** ✅ | Tối đa **một ảnh đang dùng / device** (phone·tablet·desktop). Đủ; gọn storage CF. Upload thứ 4 → thay slot cũ (prepend + cắt còn 3), hoặc bắt “xóa / thay ảnh đang gắn”. |
| 6 / 9 | Headroom giữ ảnh cũ không dùng — **không cần** nếu UI thay-in-place theo tab. |

Ba device **có thể dùng chung một `imageId`** (kế thừa default) → thực tế thường chỉ 1 ảnh trong customs.

### 11.3 Shape (backward-compatible)

```jsonc
{
  "v": 1,
  "theme": {
    "accent": "mint",
    "applyToHome": false,             // ✅ chốt: mặc định TẮT — hồ sơ có theme, home sạch
    "background": {
      "kind": "image",                // "none" | "pattern" | "image"
      "imageId": "abc",               // mặc định (fallback mọi device)
      "dim": 0.35,
      "position": { "x": 0.5, "y": 0.5 }, // 0–1 → background-position %
      "devices": {
        "phone":   { "imageId": "xyz", "position": { "x": 0.5, "y": 0.25 } },
        "tablet":  { "imageId": null,  "position": { "x": 0.45, "y": 0.5 } },
        "desktop": { "imageId": null,  "position": { "x": 0.6, "y": 0.4 } }
      }
    }
  },
  "customs": [ { "imageId": "abc", "createdAt": "…" } ]  // cap 3
}
```

| Field | Ý nghĩa |
|---|---|
| `applyToHome` | `true` → shell home của **chính user đó** nhận accent/pattern/ảnh+neo. `false` → home dùng chrome CINS (không nền tùy chỉnh). |
| `position.x/y` | Trọng tâm khung (0 = trái/trên … 1 = phải/dưới) |
| `devices.*.imageId` | `null` / thiếu → kế thừa `background.imageId` |
| `devices.*.position` | thiếu → kế thừa `background.position` |

**Bỏ `fit` / tile:** luôn `background-size: cover` + `no-repeat` khi `kind=image`. State cũ `fit:"tile"` → parser normalize thành cover + bỏ tile UI.

### 11.4 Ai thấy theme ở đâu (viewer model)

| Màn hình | Theme nào? |
|---|---|
| Home / World Journey của **user A đang đăng nhập** | Theme **A** chỉ khi `A.applyToHome === true`; không thì mặc định CINS |
| Home của **user B** | Theme **B** (nếu B bật applyToHome) — **không bao giờ** vẽ theme A |
| Trang cá nhân / Journey `/{slugA}` | Luôn theme **chủ hồ sơ A** (accent + nền + neo), kể cả khi viewer là B |
| Trang cá nhân của B | Theme B |

Checkbox copy gợi ý: **“Áp dụng giao diện này lên trang chủ của tôi”** (phụ: “Người khác không thấy theme của bạn trên trang chủ họ.”).

### 11.5 CSS / breakpoint

| Device picker | Viewport | Ảnh | Position |
|---|---|---|---|
| phone | `< 768px` | `--j-bg-image-sm` (phone \|\| default, `public`) | `--j-bg-position-sm` |
| tablet | `768 – 1199.98px` | `--j-bg-image-md` (tablet \|\| default, `public`) | `--j-bg-position-md` |
| desktop | `≥ 1200px` | `--j-bg-image` (desktop \|\| default, `public`) | `--j-bg-position` |

Shell home: chỉ set vars khi `applyToHome` + cùng resolve device như trên. Hồ sơ: luôn set (không phụ thuộc checkbox).

### 11.6 UI

1. **Điểm neo** trên mockup (pointer + touch) khi `kind=image` — cập nhật `devices[tab].position` (hoặc default nếu chưa có key device).
2. **Upload theo tab** → customs (cap 3) → `devices[tab].imageId`; nếu chưa có default `imageId` thì đồng thời set default.
3. **Kế thừa ảnh mặc định** → `devices[tab].imageId = null`.
4. Checkbox `applyToHome` trong panel theme (gần chân hoặc trên demo).
5. **Gỡ UI** “Phủ kín / Lặp ô”.

### 11.7 API

- PATCH: `position`, `devices`, `applyToHome`; mọi `imageId` ∈ customs; bỏ validate `fit`.
- Upload: cap **3**; khi đầy + ảnh mới → drop cuối pool **chỉ nếu** không còn device/default nào trỏ (nếu còn trỏ → 409 hoặc thay đúng slot device đang edit).
- Migration mềm: `PROFILE_THEME_CUSTOMS_MAX = 3`; hàng đã có >3 giữ nguyên đến lần ghi tới rồi cắt (hoặc cắt ngay lúc parse — chọn cắt lúc **ghi** để không mất ảnh đang xem).

### 11.8 Steps build

| Step | Nội dung |
|---|---|
| 1 | Parser + CssVars + PATCH (`position`, `devices`, `applyToHome`); bỏ tile; cap 3 |
| 2 | CSS breakpoint ảnh/position; shell tôn trọng `applyToHome` |
| 3 | Mockup kéo neo + upload/gán theo tab; checkbox home; gỡ fit UI |
| 4 | DECISIONS + rule responsive (nếu cần ghi `applyToHome`) |

**Model build:** Grok 4.5 · Medium.

### 11.9 Đã chốt (2026-08-28)

1. Cap customs = **3** (không 6/9).
2. Device thiếu ảnh riêng → kế thừa default — OK.
3. **Bỏ tile** — chỉ cover + neo.
4. Home: neo/ảnh theo **viewer**; checkbox **Áp dụng trang chủ** mặc định **tắt**.

---

## 12. Câu còn treo

*(không — Phase 1.6 đã build)*
