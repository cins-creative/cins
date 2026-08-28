# PLAN — Customize card user (nhóm D · popover)

> **Trạng thái:** BUILD Phase D A1 ✅ (2026-08-28) — **theme-only**: accent + surface + cover. Cấu trúc card cố định (cover · avatar · bio · stats Feature/Gallery/Bạn bè · Feature masonry). Không cho custom stats/CTA/layout Feature.
> **Đã chốt:** **A1** (accent + cover pattern/màu + chọn 3 stats + CTA nội bộ + panel Feature; chưa ảnh riêng) · **B1** (giữ bố cục centered, không đổi cover height) · **C1** (không cho ẩn `giai_doan`/`tinh_thanh` trong Customize — thuộc privacy) · **D1** (CTA chỉ route nội bộ) · **E1** (masonry + grid; cols 2–4; limit; defaultOpen) · **F1** (chỉ popover, không áp lên friend card).
> **Vùng DOM:** `.j-user-popover-backdrop` → `.j-user-popover` → `.j-friend-card.j-user-pop-card` (`components/journey/JourneyUserPopover.tsx`) + panel mở rộng `JourneyUserFeaturedExpand`.
> **Tiền lệ:** nhóm A `docs/PLAN_customize_theme.md` (theme hồ sơ) · nhóm E `docs/PLAN_customize_post_card.md` (datebar). Nhóm D là **mục D** trong roadmap §0 của plan theme và giải luôn edge **§7 #7 "popover portal"**.
> **Tab UI đã có stub:** `JourneyEditProfileModal` → Customize → **Card** ("Giao diện thẻ popover khi xem hồ sơ người khác — sắp có").

---

## 0. Card này là gì (và vì sao đáng custom)

Popover là **danh thiếp** của user: xuất hiện ở mọi nơi có tên/avatar — Journey, World feed, cộng đồng, chat, gallery credit, thành viên lớp, mention chip. Người xem chạm tên → thấy card. Đây là bề mặt brand cá nhân **lan xa nhất** trên sàn, hơn cả trang hồ sơ (phải bấm vào mới thấy).

Cấu trúc hiện tại (đọc từ code, không đoán):

| Vùng | DOM | Dữ liệu |
|---|---|---|
| Cover 96px | `.j-friend-cover` (`has-img` khi có ảnh) | `cover_id` hồ sơ; không ảnh → nền chấm radial |
| Avatar 78px | `.j-friend-avatar` | `avatar_id` |
| Tên + tick | `h3` + `VerifiedTick` | `ten_hien_thi`, `da_xac_minh` |
| Meta | `.j-friend-meta` | `giai_doan`, `tinh_thanh` |
| Bạn chung | `.j-friend-mutual` | `useMutualFriends` (thuộc **viewer**) |
| Bio | `.j-friend-bio` (clamp 2 dòng) | `bio` |
| Stats 3 ô | `.j-friend-stats` | `Feature` (`tacPham`) · `Gallery` (`cotMoc`) · `Bạn bè` (`banBe`) |
| Actions | `JourneyUserPopoverActions` | Nhắn tin / Kết bạn / Theo dõi / Journey / Share |
| **Mở rộng Feature** | `JourneyUserFeaturedExpand` → `.j-user-featured-masonry` | `/api/journey/{slug}/gallery-aside` → `pinned` + `featuredCount`; masonry **3 cột**, giữ tỉ lệ gốc (probe ảnh/video) |

Hành vi mở rộng hiện tại: bấm ô **Feature** để xổ/thu; khi mở card thì `featuredOpen` mặc định **bật** nếu `count > 0`; `eager` → fetch ngay lúc mở card.

---

## 1. SSOT scan (DEV_RULES §1) — **không ALTER**

| Sự thật | Nguồn hiện có | Kết luận |
|---|---|---|
| Tùy chỉnh giao diện của user | `user_nguoi_dung.giao_dien` (jsonb) — đã có `theme`, `customs`, `card` | **Cùng grain** → thêm key **`popover`**. Key này đã được **chừa sẵn** trong shape v1 của plan theme §1 |
| Pool ảnh đã upload | `giao_dien.customs` (cap `PROFILE_THEME_CUSTOMS_MAX`) | Dùng **chung pool**, không tạo pool riêng cho popover |
| Ảnh bìa hiển thị | `user_nguoi_dung.cover_id` | **SoT của ảnh bìa** — popover chỉ *chọn dùng hay không*, **cấm** copy ảnh bìa sang jsonb |
| Accent hồ sơ | `giao_dien.theme.accent` / `accentHex` | Popover mặc định **kế thừa** (mode `inheritAccent`), không nhân bản màu |
| Nội dung "Feature" | pin gallery (`gallery-aside`) | **SoT của Feature** — popover chỉ chọn *layout / limit*, **cấm** danh sách pin thứ hai trong `giao_dien` |
| Số liệu stats | `loadUserSocialStatsByIds` | Đã có sẵn (kể cả `toChucXacThuc` hiện **chưa dùng** trên card) |
| Khung avatar | Nhóm B (`avatarFrame`, chưa build) | Popover **kế thừa** nhóm B khi có; **không** tự định nghĩa ring riêng |

Kết luận: **0 migration, 0 cột, 0 bảng.** Chỉ mở rộng jsonb + parser tolerant, đúng luật "một SoT cho user".

---

## 2. Làm được những gì với card này (brainstorm đầy đủ, có đánh giá)

Cột **Giá trị**: tác động brand / mức user thật sự thấy. Cột **Rủi ro**: perf, dễ vỡ, dễ xấu, dễ lộn với hệ khác.

### 2.1 Khung & bề mặt card

| # | Ý tưởng | Giá trị | Rủi ro | Đề xuất |
|---|---|---|---|---|
| 1 | **Viền gradient theo accent** — hiện hardcode `rgba(37,99,235)→rgba(253,232,89)` | Cao (nhận diện tức thì) | Thấp | **Phase 1** |
| 2 | **Nền card**: mặc định / tint accent nhạt / ảnh mờ + `dim` | Cao | Ảnh nền → phải giữ tương phản chữ | **Phase 1** (tint), ảnh → fork D-A |
| 3 | Sheen `::after` (lớp bóng chéo) bật/tắt | Thấp | Thấp | Gộp vào preset "style" |
| 4 | Bán kính / đổ bóng | Rất thấp | Lệch hệ thị giác CINS | **Không** |
| 5 | Bề rộng card (380/420/480) | Thấp | Vỡ responsive | **Không** |

### 2.2 Cover banner (96px)

| # | Ý tưởng | Giá trị | Rủi ro | Đề xuất |
|---|---|---|---|---|
| 6 | **Nguồn cover**: `ảnh bìa hồ sơ` (mặc định) / `ảnh riêng từ customs` / `pattern theo accent` / `màu đặc` | Cao — banner là mảng màu lớn nhất | Ảnh riêng = 1 request khi mở card | **Phase 1** (pattern + màu), ảnh riêng theo fork D-A |
| 7 | **Neo ảnh** (`position.x/y`) như nhóm A/E | Trung bình (mặt người bị crop lệch) | Thấp — helper đã có | Phase 1 nếu bật ảnh |
| 8 | Chiều cao cover (compact 72 / mặc định 96 / tall 128) | Trung bình | Ảnh hưởng `margin-top:-42px` của body → dễ vỡ | Fork D-B |
| 9 | Fade `::after` xuống `--bg-surface` mạnh/nhẹ | Thấp | Thấp | Gộp preset |

### 2.3 Thông tin & bố cục

| # | Ý tưởng | Giá trị | Rủi ro | Đề xuất |
|---|---|---|---|---|
| 10 | **Chọn 3 ô stats** + thứ tự (Feature · Gallery · Bạn bè · Theo dõi · **Tổ chức xác thực** — data đã có, chưa dùng) | Cao (artist muốn khoe Gallery, mentor muốn khoe xác thực) | Thấp | **Phase 1** |
| 11 | Ẩn hẳn strip stats | Thấp | Mất affordance mở Feature (ô Feature chính là nút xổ) | **Không** — nếu ẩn phải giữ nút xổ khác |
| 12 | Bio: 2 dòng (hiện) / 4 dòng / ẩn | Trung bình | Thấp | Phase 1 (enum) |
| 13 | Layout: **centered** (hiện) / **left-aligned** (avatar trái, tên cạnh) | Cao — đổi hẳn "gương mặt" card | CSS nhiều hơn; phải test 320px | Fork D-B |
| 14 | Font/typography preset (default / display) | Thấp | Rủi ro thị giác toàn sàn | **Không** Phase 1 |
| 15 | **Tagline riêng cho card** (1 dòng ngắn) | Trung bình | ⚠️ **Trùng SoT với `bio`** → tạo nguồn thứ hai của "tự giới thiệu" | **Không** — dùng `bio`; chỉ cho chọn cách hiển thị (#12) |
| 16 | Ẩn "bạn chung" | Thấp | Đây là dữ liệu của **viewer**, không phải brand owner | **Không** |
| 17 | Ẩn `giai_doan` / `tinh_thanh` | Trung bình (quyền riêng tư mềm) | Lẫn với setting privacy thật (nếu có) → cần check trước | Fork D-C |

### 2.4 Hàng hành động

| # | Ý tưởng | Giá trị | Rủi ro | Đề xuất |
|---|---|---|---|---|
| 18 | **Thứ tự nút** + nút nào là "primary" (đầy màu) | Trung bình | Thấp | Phase 1 (nhẹ) |
| 19 | **CTA nội bộ** (1 nút): `Shop của tôi` / `Gallery` / `Journey` / `Cộng đồng` | **Cao** — đúng nhu cầu "artist bán merch" (bio ví dụ: "nhớ vô Gallery của Cá để coi hàng") | Thấp — route nội bộ, không cần moderation | **Phase 1** ✅ |
| 20 | CTA link **ngoài** (tự nhập URL) | Cao cho creator | ⚠️ Spam / phishing / cần rel+noopener + moderation | Fork D-D (đề xuất **hoãn**) |
| 21 | Ẩn nút Nhắn tin / Kết bạn | Trung bình | Đây là **quan hệ xã hội**, không phải style — nếu cho tắt phải nằm ở Cài đặt riêng tư, không phải tab Customize | **Không** (ghi chú sang privacy) |

### 2.5 Panel mở rộng Feature (phần user nhấn mạnh)

| # | Ý tưởng | Giá trị | Rủi ro | Đề xuất |
|---|---|---|---|---|
| 22 | **Layout**: `masonry` (hiện, giữ tỉ lệ gốc) / `grid` vuông crop / `carousel` 1 hàng cuộn ngang / `hero` (1 lớn + 2 nhỏ) | **Cao** — thay đổi cảm nhận portfolio rõ nhất | `hero`/`carousel` = CSS + a11y (cuộn ngang) mới | **Phase 1**: masonry + grid; hero/carousel → fork D-E |
| 23 | **Số cột** 2 / 3 (hiện) / 4 | Trung bình | 4 cột ở 320px quá nhỏ → clamp theo viewport | Phase 1 (kèm clamp) |
| 24 | **Limit** thumb hiển thị (6 / 9 / 12 / tất cả) | Trung bình — hiện phụ thuộc limit 24 của `gallery-aside` | Nhiều thumb = nhiều request ảnh khi mở card | **Phase 1** |
| 25 | **Mặc định mở / thu gọn** khi vừa mở card | Cao — quyết định "card gọn" vs "portfolio ngay" | Mở sẵn = fetch + ảnh ngay (đang `eager`) | **Phase 1** |
| 26 | Hiện tiêu đề / meta overlay trên thumb | Trung bình | Chữ trên ảnh dễ mất tương phản | Fork D-E |
| 27 | Video preview: autoplay muted / chỉ badge play | Trung bình | ⚠️ **Perf + data**: autoplay nhiều video trong 1 card | Phase 1 = **tắt autoplay** làm mặc định |
| 28 | Đổi **nguồn** panel (tự chọn danh sách tác phẩm khác pin) | Trung bình | ⚠️ Tạo **nguồn sự thật thứ hai** của "Feature" | **Không** — Feature = pin gallery, một SoT |
| 29 | Panel cho **shop**: thay Feature bằng sản phẩm nổi bật | Cao với người bán | Scope nhóm C (theme shop) + fetch mới | **Phase D2** |

### 2.6 Chuyển động & chrome

| # | Ý tưởng | Giá trị | Rủi ro | Đề xuất |
|---|---|---|---|---|
| 30 | Hiệu ứng mở: fade (hiện) / scale-in / slide-up | Thấp–TB | Phải tôn trọng `prefers-reduced-motion` | Phase 1 nếu rẻ |
| 31 | Custom **backdrop** (màu/blur) | Thấp | ⚠️ Backdrop là chrome của **viewer**, không thuộc brand owner | **Không** |
| 32 | Custom nút Đóng | Rất thấp | A11y | **Không** |

### 2.7 Gói lại thành "preset" thay vì 20 công tắc

Đề xuất UX: **4–5 preset** ("Mặc định CINS" · "Gallery" — cover pattern + panel grid mở sẵn · "Tối giản" — không cover ảnh, panel thu gọn · "Studio" — nền tint + hero panel) + phần **Nâng cao** để tinh chỉnh. Giảm tải quyết định, giữ chất lượng thị giác — cùng triết lý "chỉ preset id, không CSS tự do" của nhóm A.

---

## 3. Shape `giao_dien.popover` (v1, tolerant)

```jsonc
{
  "popover": {
    "v": 1,
    "enabled": false,              // false → card mặc định CINS (giống nhóm E B1)
    "preset": "default",           // "default" | "gallery" | "minimal" | "studio"
    "mode": "inheritAccent",       // "inheritAccent" | "custom" | "none"
    "accent": "cins",
    "accentHex": null,             // chỉ khi accent = "custom"
    "surface": { "kind": "plain", "dim": 0.35 },   // "plain" | "tint" | "image"
    "cover": {
      "kind": "profile",           // "profile" | "pattern" | "solid" | "image"
      "patternId": "dots",
      "imageId": null,             // ∈ customs
      "position": { "x": 0.5, "y": 0.5 },
      "dim": 0.35
    },
    "info": { "bio": "clamp2", "meta": true },      // bio: "clamp2"|"clamp4"|"hidden"
    "stats": ["feature", "gallery", "banBe"],       // đúng 3, từ whitelist 5 id
    "actions": { "primary": "message", "cta": null }, // cta: null|"shop"|"gallery"|"journey"
    "featured": {
      "layout": "masonry",         // "masonry" | "grid"
      "cols": 3,                   // 2 | 3 | 4
      "limit": 9,                  // 6 | 9 | 12 | 0 (=tất cả trong aside)
      "defaultOpen": true,
      "autoplayVideo": false
    }
  }
}
```

Parser: thiếu/hỏng → `{ enabled: false }`; key lạ → bỏ qua; `stats` sai độ dài/không thuộc whitelist → về default; `imageId` không thuộc `customs` → `null`. Không bao giờ throw.

---

## 4. Data path — mấu chốt kỹ thuật của nhóm D

Popover **không** có `giao_dien` trong tay: nó fetch `/api/users/preview?slug=` (service role) rồi cache client 60s (`lib/journey/user-preview-cache.ts`). Vì vậy:

1. `app/api/users/preview/route.ts`: `select` thêm `giao_dien` → **normalize server-side** → trả DTO nhỏ:

```ts
popoverTheme?: {
  accentHex: string | null;
  surface: { kind: "plain" | "tint" | "image"; dim: number; imageUrl: string | null };
  cover: { kind: "profile" | "pattern" | "solid" | "image"; patternCss: string | null;
           imageUrl: string | null; position: { x: number; y: number }; dim: number };
  info: { bio: "clamp2" | "clamp4" | "hidden"; meta: boolean };
  stats: Array<"feature" | "gallery" | "banBe" | "follow" | "verifiedOrg">;
  actions: { primary: string; cta: { kind: string; href: string; label: string } | null };
  featured: { layout: string; cols: number; limit: number; defaultOpen: boolean; autoplayVideo: boolean };
} | null   // null khi enabled = false → 0 byte thừa cho user chưa custom
```

2. `UserPreviewProfile` (+ cache) mang thêm field này — **cùng TTL 60s**, không thêm request nào. `enabled: false` → không gửi gì.
3. **Portal**: `createPortal(document.body)` nằm ngoài cascade shell → vars phải **inline trên `.j-user-popover`**, không dựa `:root`/shell. Đây chính là cách giải edge `PLAN_customize_theme.md §7 #7`.
4. `fallbackName` path (chưa fetch xong): **không** có theme → render mặc định, tránh nhảy màu. Khi profile về mới gắn vars (một lần, đúng lúc card đã hiện).
5. **Không** gửi `customs` / wallpaper hồ sơ xuống preview payload.

**Perf:** +1 cột jsonb trong 1 query đã có (không N+1); parse O(1)/lần mở card. Ảnh cover/surface chỉ tải khi card mở → không đụng LCP trang. Panel Feature giữ nguyên 1 request `gallery-aside` như hiện tại; `limit` chỉ **giảm** số thumb.

---

## 5. CSS

File mới `components/journey/journey-user-popover-theme.css` (~120–180 dòng). **Không** sửa `journey-user-popover.css` quá scope, **không** đụng `journey.css`.

- Scope: `.j-user-popover[data-pop-theme]` + `[data-pop-preset]`, `[data-pop-layout]`.
- Ghi đè whitelist var: `--j-pop-accent`, `--j-pop-surface-dim`, `--j-pop-cover-image`, `--j-pop-cover-pos`, `--j-pop-featured-cols`. **Cấm** ghi `--ink-*`, `--bg-surface`.
- **Rò rỉ cần chặn:** `journey-user-popover.css` dùng chung selector cho `JourneyOrgPopover` (`.j-org-pop-card`) và `.j-friend-card` còn dùng ở `JourneyFriendCard` (danh sách bạn bè). Rule mới phải bám `[data-pop-theme]` → org card và friend grid **không** ăn theme user.
- Dark mode: `color-mix(accent, white 25%)` như nhóm A/E; ảnh cover `dim +0.15`.
- Responsive (theo `.cursor/rules/cins-theme-responsive.mdc`): `cols` clamp — `<380px` tối đa 2 cột; card `width: min(420px, 100%)` giữ nguyên; panel `max-height` để card vẫn scroll trong `90vh`; `prefers-reduced-motion` tắt hiệu ứng mở; `prefers-contrast: more` → bỏ ảnh, về token gốc.

---

## 6. API & UI

- **PATCH `/api/user/giao-dien`**: nhận `popover` (merge nông — **giữ** `theme` / `customs` / `card`). Validate whitelist: preset/mode/accent id · hex `#RRGGBB` normalize · `patternId` ∈ `PROFILE_PATTERN_IDS` · `imageId` ∈ `customs` **của chính user** · `stats` đúng 3 id không trùng · `cta` ∈ enum nội bộ · số → clamp. Sai → 400, không sửa im lặng.
- **GET** trả thêm `popover` đã normalize (cho panel edit).
- Upload ảnh: **reuse** `/api/user/giao-dien/upload` + pool `customs` — không endpoint mới.
- **UI**: `components/journey/JourneyPopoverPicker.tsx` gắn vào tab **Card** (stub sẵn). Preview = **card thật** render inline với DTO draft (không mockup phone) + nút "Xem như người khác". Draft + **Lưu** giống Theme; lazy-load qua `next/dynamic`.

---

## 7. Edge cases

| # | Tình huống | Xử lý |
|---|---|---|
| 1 | `enabled: false` / `giao_dien` null / JSON hỏng | DTO `null` → card y hệt hôm nay |
| 2 | Card hiện trong shell của viewer có accent khác | Card **luôn** theo owner (là danh thiếp của owner); accent shell viewer không ghi đè — hai vars khác tên |
| 3 | Portal ngoài cascade | Vars inline trên `.j-user-popover` (§4.3) |
| 4 | Chưa fetch xong (`fallbackName`) | Không theme → không nhảy màu |
| 5 | `cover.kind = "profile"` nhưng user chưa có ảnh bìa | Fallback pattern chấm hiện tại |
| 6 | Ảnh CF 404 | Luôn set `background-color` trước `background-image` |
| 7 | Xoá ảnh trong `customs` đang được popover dùng | Chuyển `cover.kind` → `pattern` trước khi xoá (như nhóm A #10) |
| 8 | User bật 4 cột nhưng chỉ có 2 Feature | Grid tự co, không để ô trống rỗng |
| 9 | `limit` > số pin thật | Hiện đúng số có; `featuredCount` ở ô stats vẫn là **tổng thật** |
| 10 | `defaultOpen: true` nhưng 0 Feature | Panel không mở (giữ logic `count > 0` hiện có) |
| 11 | Card trong `AdminBanThaoJourneyPreview` / chat / mention chip | Cùng một component + cùng DTO → nhất quán; không cần fork |
| 12 | Org popover (`JourneyOrgPopover`) | Không nhận theme user (§5) |
| 13 | Tương phản kém (accent tối trên nền tối) | Helper luminance sẵn trong `profile-theme.ts` |
| 14 | Print | `@media print` bỏ nền/ảnh |
| 15 | Viewer bị block / ẩn hồ sơ | Không đổi logic hiện tại; theme không lộ thông tin thêm |

---

## 8. Forks — **đã chốt** (2026-08-28)

Chốt: **A1 · B1 · C1 · D1 · E1 · F1** (đều là phương án đề xuất). Hệ quả cho shape §3:

- `surface.kind` Phase 1 chỉ `plain` | `tint` (bỏ `image`); `cover.kind` chỉ `profile` | `pattern` | `solid` — `image` + `cover.position` giữ trong parser nhưng **chưa mở UI** (A2 sau).
- `info.meta` luôn `true`, không render control (C1) — giữ key để không phá v1.
- `actions.cta` enum nội bộ: `null` | `shop` | `gallery` | `journey` | `congDong`.
- `featured.layout` chỉ `masonry` | `grid`; `overlay` chưa có.
- Không đổi `JourneyFriendCard` (F1) — rule CSS bắt buộc bám `[data-pop-theme]`.

### Fork D-A — Độ sâu Phase 1
| | Nội dung |
|---|---|
| **A1 (đề xuất)** | Accent + cover (pattern/solid) + stats chọn 3 + CTA nội bộ + panel Feature (layout/cols/limit/defaultOpen). **Chưa** ảnh riêng |
| A2 | A1 + ảnh cover / nền card từ `customs` (+ neo) |
| A3 | A2 + layout left-aligned + hero panel (nhiều CSS, nhiều rủi ro responsive) |

### Fork D-B — Đổi bố cục hay chỉ đổi màu
| | |
|---|---|
| **B1 (đề xuất)** | Giữ bố cục centered; chỉ màu/cover/stats/panel |
| B2 | Cho phép `layout: left` + cover height (rủi ro `margin-top:-42px`) |

### Fork D-C — Ẩn `giai_doan` / `tinh_thanh`
| | |
|---|---|
| **C1 (đề xuất)** | Không cho ẩn ở tab Customize (đây là privacy, không phải style) |
| C2 | Cho ẩn trong `popover.info.meta` |

### Fork D-D — CTA
| | |
|---|---|
| **D1 (đề xuất)** | Chỉ CTA **nội bộ** (Shop / Gallery / Journey / Cộng đồng) |
| D2 | Cho URL ngoài (cần rel/noopener + moderation + báo cáo) |

### Fork D-E — Panel Feature Phase 1
| | |
|---|---|
| **E1 (đề xuất)** | `masonry` (hiện) + `grid` vuông; cols 2–4; limit; defaultOpen |
| E2 | E1 + `hero` / `carousel` |
| E3 | E2 + overlay tiêu đề trên thumb |

### Fork D-F — Bề mặt khác có ăn theme không
| | |
|---|---|
| **F1 (đề xuất)** | Chỉ popover |
| F2 | Popover + `JourneyFriendCard` (danh sách bạn bè) — dễ thành "rainbow grid" |

---

## 9. Steps BUILD (sau khi chốt forks)

| Step | Nội dung | File |
|---|---|---|
| 1 | Lib `lib/journey/popover-theme.ts`: types · `parsePopoverTheme` · `serialize` · `validatePopoverPatchBody` · `resolvePopoverThemeDto` · `popoverThemeStyle` | mới |
| 2 | API: GET/PATCH `popover` (merge jsonb, không xoá `theme`/`card`/`customs`) | `app/api/user/giao-dien/route.ts` |
| 3 | Preview API + cache: `select giao_dien` → DTO `popoverTheme` | `app/api/users/preview/route.ts`, `lib/journey/user-preview-cache.ts` |
| 4 | `JourneyUserPopover`: gắn `data-pop-*` + vars inline; áp `stats` / `info` / `actions` / CTA | `components/journey/JourneyUserPopover.tsx` (+ `…PopoverActions`) |
| 5 | `JourneyUserFeaturedExpand`: prop `layout` / `cols` / `limit` / `autoplayVideo` (default = hành vi hôm nay) | `components/journey/JourneyUserFeaturedExpand.tsx`, `journey-user-featured.css` |
| 6 | CSS `journey-user-popover-theme.css` + dark + chặn rò org/friend card | mới |
| 7 | UI tab **Card** + preset + preview card thật + Lưu | `JourneyPopoverPicker.tsx`, `JourneyEditProfileModal.tsx` |
| 8 | Manual: 320→2560 · dark · 0 Feature · CF 404 · org popover · chat/cộng đồng/admin preview | — |

**Chia brief:** Step 1–3 (backend) → Step 4–6 (frontend) → Step 7 (UI panel) → Step 8 (pass). Model build: **Grok 4.5 · Medium**.

---

## 10. Security & performance

- Chỉ **preset id / enum / số clamp / hex normalize** — không nhận chuỗi CSS ⇒ không CSS injection.
- `imageId` phải ∈ `customs` của chính user ⇒ không mượn ảnh người khác.
- CTA Phase 1 chỉ route nội bộ ⇒ không phải bề mặt phishing (fork D-D2 mới cần moderation).
- PATCH: auth `auth.uid()` + RLS + merge đọc–sửa–ghi để không xoá key nhóm khác.
- `giao_dien.popover` coi là **public branding** (như avatar/tên) — cần confirm `giao_dien` đã readable cho anon trên join preview (service role nên OK, vẫn phải kiểm RLS trước ship).
- Không thêm cache layer; đi cùng payload preview (TTL 60s sẵn có).

---

## 11. Không làm trong nhóm D

- Nhóm B khung avatar (popover **kế thừa** khi có), nhóm C shop, topbar.
- Backdrop / nút Đóng / bề rộng card.
- Nguồn Feature thứ hai; tagline riêng; ẩn nút quan hệ xã hội (thuộc privacy).
- Panel sản phẩm shop → Phase D2 (#29).
