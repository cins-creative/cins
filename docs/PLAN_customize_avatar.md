# PLAN — Customize avatar (nhóm B: khung & viền avatar)

> **Trạng thái:** BUILD Phase B1.1 ✅ (2026-08-28) — preset màu/gradient + overlay ảnh (~15px), bỏ shape/glow/gap/tile
> **Thuộc roadmap:** `docs/PLAN_customize_theme.md` §0 **nhóm B** (`.j-avatar.j-avatar-editable` · `JourneyAvatarTrigger` / `JourneyVisitorAvatar`)
> **Tiền lệ kiến trúc:** nhóm A (theme trang) + nhóm E (`docs/PLAN_customize_post_card.md`, `lib/journey/card-theme.ts`)
> **Ai được dùng:** mọi user, chưa gate billing (chỉ chừa hook `isPremiumPreset`)
> **Chốt B1.1:** (1) preset viền solid/gradient rồi user đổi màu · (2) overlay PNG/GIF absolute expand 15px, `contain` + no-repeat · không tile / shape / glow / độ dày

---

## 0. Có thể làm được gì với custom avatar (brainstorm + xếp hạng)

Avatar là **96px, tròn, một vòng viền trắng** (`journey.css` 220–289). Diện tích nhỏ → mọi thứ thêm vào phải đọc được ở 96px và **32–40px** (feed/popover). Đó là ràng buộc lọc ý tưởng mạnh nhất.

| # | Ý tưởng | Giá trị cho user | Chi phí | Rủi ro | Phán quyết |
|---|---|---|---|---|---|
| 1 | **Vòng viền màu (ring)** — độ dày + màu (kế thừa accent / preset / hex) | Cao — nhận diện tức thì, ăn theo theme đã có | Thấp (1 pseudo-element) | Gần 0 | **Phase B1** |
| 2 | **Ring gradient 2 điểm** (conic/linear) | Cao — “ảnh đại diện có chữ ký” | Thấp | Dễ xấu nếu 2 hex chỏi | **Phase B1**, giới hạn 2 stop |
| 3 | **Khe hở (gap) giữa ring và ảnh** | Trung — kiểu “story ring” | Rất thấp | 0 | **Phase B1** |
| 4 | **Hình dạng** — tròn / squircle / vuông bo / lục giác | Cao — khác biệt lớn nhất về hình khối | Trung (mask + phải sửa 3 chỗ `border-radius: 50%` đang hardcode) | Vỡ ở kích thước nhỏ; lục giác cắt mất mặt người | **Phase B1** với 3 shape; lục giác **cân nhắc bỏ** |
| 5 | **Glow / bóng màu accent** | Trung | Rất thấp | Nhòe trên nền ảnh | **Phase B1**, cap ≤0.6 |
| 6 | **Khung trang trí SVG preset** (vòng lá, khung tranh, tia, ruy băng) do CINs vẽ | Cao — “thứ để chơi”, đúng chất ngành sáng tạo | Trung (cần design asset, inline SVG) | Bão hòa thị giác nếu nhiều | **Phase B2** |
| 7 | **Ring động (quay chậm)** | Thấp–trung | Thấp | Ngốn compositor khi feed có 50 avatar; phản-vanity | **Bỏ** ở B1–B2; nếu làm: chỉ trang hồ sơ + `prefers-reduced-motion` |
| 8 | **Ảnh khung do user upload (PNG trong suốt)** | Trung | Cao (moderation + CF storage + kiểm alpha) | Người dùng tự vẽ tick xanh giả → **phá moat verify** | **Không làm** |
| 9 | **Badge góc tự khai** (“đang nhận job”, “đang tuyển”) | Cao *nếu đúng* | Cao | **SSOT** — “trạng thái nhận việc” là sự thật khác grain, có thể đã có nguồn; badge cosmetic không được kiêm nhiệm | **Tách plan riêng**, không nhồi vào `avatarFrame` |
| 10 | **Khung do hệ thống trao** (curator, học viên đối tác, finalist giải) | Rất cao — hợp moat CINs | Cao | Nếu user tự chọn được → mất giá trị | **Phase B3**, nguồn khác (`user_thanh_vien_to_chuc` / verify), **không** để trong `giao_dien` |
| 11 | **Kiểu khối initials khi chưa có ảnh** (màu nền + font) | Thấp | Thấp | 0 | Ăn theo ring miễn phí, không làm UI riêng |
| 12 | **Neo/zoom ảnh trong khung** | Trung | Trung | Trùng chức năng editor avatar đã có | Chỉ làm nếu `JourneyAvatarEditor` chưa crop được |

### Nguyên tắc lọc (rút ra)

1. **Cosmetic không được giả làm credential.** Ring/shape/glow là trang trí; tick xanh, huy hiệu curator, “học viên Sine Art” là **credential** — chỉ hệ thống trao (§7 mục 10). Không cho upload PNG khung vì đó là cửa sau để vẽ tick giả.
2. **Đọc được ở 40px.** Mọi preset phải test ở cỡ popover, không chỉ 96px.
3. **0 request thêm.** Ring/shape/glow = CSS thuần; khung trang trí = inline SVG (giống cách pattern nền dùng gradient).
4. **Không đổi kích thước layout.** Ring vẽ bằng pseudo-element **ngoài** hộp 96px → không CLS, không phá `.j-avatar-edit-ico` (span `inset: 0`).

---

## 1. SSOT scan (DEV_RULES §1 · bắt buộc trước mọi schema)

| Sự thật | Nguồn hiện có | Kết luận |
|---|---|---|
| Tùy chỉnh giao diện của user | `user_nguoi_dung.giao_dien` (jsonb) — key **`avatarFrame` đã reserve** (`profile-theme.ts` 300, giữ khi PATCH 898 + reset 155) | **Dùng đúng key đó** |
| Ảnh avatar | `user_nguoi_dung.avatar_id` → `getAvatarUrl()` | Khác grain (ảnh, không phải khung) — không đụng |
| Theme thẻ chia sẻ OG | `user_nguoi_dung.theme` | Khác grain — OG **không** đọc `avatarFrame` |
| Pool ảnh upload | `giao_dien.customs` (cap `PROFILE_THEME_CUSTOMS_MAX = 9` trong code) | Không dùng cho khung (không upload khung ở B1–B2) |
| Verified / vai trò org | `user_thanh_vien_to_chuc`, luồng verify | **Nguồn của khung được trao** (Phase B3) — không copy vào `giao_dien` |

**Kết luận: KHÔNG ALTER, KHÔNG migration, KHÔNG bảng mới.** Key `avatarFrame` đã có sẵn trong cột jsonb cùng grain. Đây là lý do nhóm B rẻ hơn nhóm A.

---

## 2. Shape jsonb (`giao_dien.avatarFrame`)

```jsonc
{
  "avatarFrame": {
    "v": 1,
    "enabled": false,            // false → render y hệt hôm nay
    "shape": "circle",           // "circle" | "squircle" | "rounded"   (B1)
    "ring": {
      "mode": "inheritAccent",   // "inheritAccent" | "custom" | "none"
      "accent": "cins",          // preset id (dùng khi mode = custom)
      "accentHex": null,         // #RRGGBB khi accent = "custom"
      "style": "solid",          // "solid" | "gradient"
      "hex2": null,              // stop thứ 2 khi style = gradient
      "width": 4,                // px, 2–8
      "gap": 0                   // px, 0–4 (khe hở ring ↔ ảnh)
    },
    "glow": 0,                   // 0–0.6 cường độ bóng màu ring
    "decor": "none"              // B2 — id SVG preset
  }
}
```

- **Parser tolerant** (như `parseCardTheme`): thiếu/hỏng/`v` lạ → default `enabled: false`.
- `enabled: false` là **default an toàn**: người chưa từng mở panel render đúng như hiện tại.
- Không có key nào nhận **chuỗi CSS tự do** → không CSS injection (chỉ id preset + hex `^#[0-9a-f]{6}$`).

### Module mới

`lib/journey/avatar-frame.ts` — mirror y hệt `lib/journey/card-theme.ts`:

| Export | Vai trò |
|---|---|
| `AVATAR_SHAPES`, `AVATAR_RING_MODES`, `AVATAR_RING_STYLES` | Whitelist |
| `DEFAULT_AVATAR_FRAME` | `enabled: false` |
| `parseAvatarFrame(raw)` | Tolerant |
| `serializeAvatarFrame(state)` | Payload DB (bỏ nếu = default) |
| `validateAvatarFramePatchBody(raw)` | 400 khi sai, **không** silently fix |
| `applyAvatarFramePatch(prev, patch)` | Merge nông |
| `resolveAvatarFrameDto(frame, theme)` | DTO công khai (hex đã resolve) — `null` khi tắt/default |
| `avatarFrameFromGiaoDien(raw)` | Parse thẳng từ row (cho feed/popover, kiểu `authorCardThemeFromGiaoDien`) |
| `avatarFrameStyle(dto)` | → CSS vars inline |
| `avatarFrameClass(dto)` | → `"j-avf j-avf-squircle"` … |

> ⚠️ **TDZ:** `profile-theme.ts` đã import `card-theme.ts`; `avatar-frame.ts` cũng sẽ bị `profile-theme.ts` import. **Không** import runtime `clamp*` từ `profile-theme` — khai báo clamp cục bộ, đúng như comment ở `card-theme.ts` 23–24.

---

## 3. Kiến trúc render — quyết định khác nhóm A

Nhóm A gắn CSS vars lên **wrapper trang** (`.cins-journey-page`) rồi để cascade lan xuống. **Nhóm B không làm vậy**: gắn vars **inline trực tiếp trên chính node avatar**.

Vì sao:

1. Avatar xuất hiện trong **portal** (`JourneyUserPopover`, `JourneySocialActorsModal`, chat, `ShopDonDetailModal` …) — portal render ra `document.body`, **ngoài cascade** của `.cins-journey-page`. Vars từ wrapper không tới được.
2. Trong feed, avatar của **nhiều người khác nhau** đứng cạnh nhau → không thể có một scope chung; mỗi node phải mang style của chính chủ nó.

```
<button class="j-avatar j-avatar-editable j-avf j-avf-circle"
        style="--j-av-ring: #1A7F57; --j-av-ring-w: 4px; …">
```

### Whitelist CSS vars (7 biến)

| Biến | Dùng cho |
|---|---|
| `--j-av-ring` | màu ring (stop 1) |
| `--j-av-ring-2` | stop 2 khi gradient |
| `--j-av-ring-w` | độ dày (2–8px) |
| `--j-av-gap` | khe hở ring ↔ ảnh (0–4px) |
| `--j-av-radius` | bo góc theo `shape` |
| `--j-av-glow` | alpha bóng |
| `--j-av-decor` | B2 — `url("data:image/svg+xml,…")` inline |

### CSS mới — `components/journey/journey-avatar-frame.css` (~120 dòng)

- Ring = `.j-avf::after { inset: calc(-1 * (var(--j-av-ring-w) + var(--j-av-gap))); border-radius: inherit; }` → **ngoài** hộp 96px, **không** đụng `border: 4px solid var(--bg-surface)` đang có, **không** đụng `.j-avatar-edit-ico` (span thật, `inset: 0`).
- `.j-avatar::before` / `::after` hiện **chưa được dùng** (đã kiểm) → an toàn.
- Gradient ring: `background: conic-gradient(…)` trên `::after` + `mask: radial-gradient(farthest-side, transparent calc(100% - var(--j-av-ring-w)), #000 0)`.
- **Shape** phải đổi cả 3 chỗ đang hardcode `border-radius: 50%`: `.j-avatar`, `.j-avatar img`, `.j-avatar-edit-ico` → thay bằng `var(--j-av-radius, 50%)`. Đây là **sửa duy nhất trong `journey.css`** (3 dòng), phần còn lại nằm ở file mới.
- Dark mode: nâng sáng ring như accent — `color-mix(in srgb, var(--j-av-ring), white 25%)`.
- `@media (prefers-contrast: more)` → bỏ glow + decor, giữ ring solid.
- `@media print` → bỏ glow/decor.

---

## 4. Phạm vi hiển thị (viewer model) — chốt theo giai đoạn

Repo **không có** `components/ui/Avatar.tsx`; ~**85 file** render avatar bằng `<img>` one-off (chi tiết: khảo sát trong session này). Vì vậy “khung avatar khắp site” **không** phải một task, mà là ba.

| Phase | Nơi hiện khung | Component phải sửa | Payload cần thêm | Đánh giá |
|---|---|---|---|---|
| **B1** | Trang hồ sơ `/{slug}` (owner + visitor) | `JourneyAvatarTrigger`, `JourneyVisitorAvatar`, `JourneySidebar` | 0 — `giao_dien` đã fetch sẵn ở `profile-page-fetch.ts` | **Làm ngay.** ~4 file, 0 API đọc mới |
| **B2** | Popover + friend card + hàng actor | `JourneyUserPopover`, `JourneyFriendCard`, `JourneySocialActorRow` | `/api/users/preview` + fetch friends/social trả thêm `avatarFrame` DTO | Làm sau B1. Đây là nơi khung được **người khác** nhìn thấy nhiều nhất → giá trị cao nhất/đồng chi phí |
| **B3** | Feed (`JourneyMilestoneCard`), chat, gallery, comment | ~85 file one-off | Sửa nhiều fetch | **Chưa cam kết.** Điều kiện tiên quyết: tách primitive `UserAvatar` dùng chung (refactor riêng, không nằm trong plan customize) |

Nguyên tắc: **khung đi theo chủ avatar**, không theo viewer, không theo trang (khác `applyToHome` của nhóm A — vì khung là dấu ấn của người, giống `giao_dien.card` của nhóm E).

**Không** đưa khung vào OG image (`app/[slug]/opengraph-image.tsx` dùng `user_nguoi_dung.theme`, hai hệ tách bạch — nhất quán với nhóm A §7 mục 8).

---

## 5. API

Không thêm route mới. Mở rộng route đã có:

| Method | Route | Thay đổi |
|---|---|---|
| `GET` | `/api/user/giao-dien` | Trả thêm `avatarFrame` đã normalize |
| `PATCH` | `/api/user/giao-dien` | Nhận key `avatarFrame` → `validateAvatarFramePatchBody` → `applyAvatarFramePatch`; **merge nông**, không xoá `theme` / `card` / `popover` |
| `DELETE` | `/api/user/giao-dien` | Giữ nguyên hành vi hiện tại (reset theme, **giữ** `avatarFrame`) — nếu muốn “reset khung” thì làm bằng PATCH `{ avatarFrame: { enabled: false } }`, không thêm verb |

Validate server-side: `shape` ∈ 3 id · `mode`/`style` ∈ whitelist · `width` ∈ [2, 8] · `gap` ∈ [0, 4] · `glow` ∈ [0, 0.6] · `accentHex`/`hex2` khớp `^#[0-9a-fA-F]{6}$`. Sai → 400 kèm message tiếng Việt.

`validateThemePatchBody` hiện chặn body rỗng bằng điều kiện `!patch.accent && !patch.background && …` (`profile-theme.ts` 790) → **phải thêm `!patch.avatarFrame`** vào điều kiện đó, nếu không PATCH chỉ có `avatarFrame` sẽ bị 400.

---

## 6. UI — panel chỉnh

- Lấp card **“Khung & viền avatar — sắp có”** trong `JourneyEditProfileModal` (dòng 50–53) bằng panel thật.
- Component mới `components/journey/JourneyAvatarFramePicker.tsx`, **lazy-load** (`next/dynamic`) — khách xem hồ sơ không tải bundle.
- Layout panel:
  1. **Preview thật** — avatar 96px của chính user + một preview 40px cạnh đó (kiểm tra “đọc được ở cỡ nhỏ”, §0 nguyên tắc 2).
  2. Toggle **Bật khung**.
  3. Hàng chọn **hình dạng** (3 ô).
  4. Ring: chọn *Theo màu chủ đề* / *Màu khác* (mở lại preset 10 màu + colorwheel đang dùng ở theme picker) / *Không viền*; toggle Gradient → hiện stop 2.
  5. Slider **độ dày**, **khe hở**, **glow**.
  6. Draft + nút **Lưu** (giống theme picker), lỗi → revert + toast.
- Optimistic: set vars lên node avatar thật để thấy ngay, PATCH nền.
- `< 640px`: bottom-sheet + `padding-bottom: env(safe-area-inset-bottom)`, input `font-size: max(16px, 1rem)` — theo `.cursor/rules/cins-theme-responsive.mdc`.

---

## 7. Edge cases

| # | Tình huống | Xử lý |
|---|---|---|
| 1 | `avatarFrame` = `{}` / null / JSON hỏng / `v` lạ | Parser → `enabled: false` → render y hệt hôm nay |
| 2 | Chưa có ảnh avatar (khối initials) | Ring/shape vẫn áp cho khối initials — nhất quán, không case riêng |
| 3 | `mode: inheritAccent` + theme vẫn CINs mặc định | Vẫn vẽ ring xanh CINs (khác nhóm E vốn trả `null` để tránh tint vô nghĩa) — vì user đã bật `enabled` một cách chủ động |
| 4 | Ring sáng trên nền ảnh sáng (theme có wallpaper) | `.j-avatar` giữ `border: 4px solid var(--bg-surface)` → luôn có lớp tách; ring nằm ngoài lớp đó |
| 5 | Shape ≠ circle + `.j-avatar-edit-ico` (overlay camera) | Icon dùng `var(--j-av-radius)`, không hardcode 50% |
| 6 | Visitor lightbox phóng to ảnh | **Không** áp khung trong lightbox — người xem muốn thấy ảnh gốc |
| 7 | Avatar trong portal | Vars **inline trên node**, không phụ thuộc cascade → an toàn (§3) |
| 8 | Nhiều avatar khác chủ trong feed (B3) | Mỗi node style riêng; không dùng scope chung |
| 9 | Reset theme (`DELETE`) | Khung **không** bị xoá — đã đúng ở code hiện tại |
| 10 | Ring dày 8px ở avatar 32px (B2/B3) | Component nhỏ **clamp** độ dày theo kích thước: `min(var(--j-av-ring-w), 12% * size)` |
| 11 | Gradient 2 hex chỏi nhau | Không auto-sửa; giới hạn 2 stop + preview 40px để user tự thấy |
| 12 | OG / share card | Không đọc `avatarFrame` (§4) |

---

## 8. Security & performance

- **Không CSS injection**: chỉ id preset + hex regex; không nhận chuỗi CSS, không nhận `url()` từ client (decor B2 là SVG **inline trong code**, id whitelist).
- **Không upload**: B1–B2 không thêm ảnh → không tốn CF Images, không cần moderation (§0 mục 8).
- **Không mượn credential**: khung tự chọn tuyệt đối không dùng hình tick / vòng nguyệt quế / chữ “Verified”; bộ decor B2 phải được review với tiêu chí này.
- Ghi: kiểm `auth.uid()` ở route handler **và** dựa RLS `user_nguoi_dung`; merge đọc–sửa–ghi để không xoá key nhóm khác.
- Perf: 0 request thêm, 0 byte ảnh, ring/glow chỉ chạm paint (không layout) → **0 CLS**. B2 chỉ thêm vài field vào payload JSON đã có, không query mới, không N+1.
- Bundle: picker lazy-load; `journey-avatar-frame.css` ~120 dòng, không đụng `journey.css` (25.6k dòng) ngoài 3 dòng `border-radius`.

---

## 9. Steps build

### Phase B1 — trang hồ sơ

| Step | Nội dung | File | Model đề xuất |
|---|---|---|---|
| 1 | `lib/journey/avatar-frame.ts` — types, parse, serialize, validate, patch, DTO, style/class helper | mới | Grok 4.5 · Medium |
| 2 | Wire vào `profile-theme.ts` (parse/serialize/apply đã có chỗ reserve) + PATCH `/api/user/giao-dien` (**nhớ** nới điều kiện body rỗng dòng 790) | `lib/journey/profile-theme.ts`, `app/api/user/giao-dien/route.ts` | Grok 4.5 · Medium |
| 3 | CSS: file mới + đổi 3 `border-radius: 50%` → `var(--j-av-radius, 50%)` | `components/journey/journey-avatar-frame.css`, `app/[slug]/journey/journey.css` | Grok 4.5 · Medium |
| 4 | Render: `JourneyAvatarTrigger` / `JourneyVisitorAvatar` nhận prop `frame` (DTO); `JourneySidebar` truyền xuống | 3 file | Composer 2.5 · Low |
| 5 | Picker + lấp card “sắp có” | `JourneyAvatarFramePicker.tsx`, `JourneyEditProfileModal.tsx` | Grok 4.5 · Medium |
| 6 | Pass responsive 320→2560 + kiểm dark mode / reduced-contrast / print | — | Composer 2.5 · Low |
| 7 | Ghi DECISIONS (không ALTER — chỉ chốt shape jsonb + quyết định “cosmetic ≠ credential”) | `docs/CINS_DECISIONS.md` | — |

### Phase B2 — popover / friend card / actor row

| Step | Nội dung |
|---|---|
| 1 | `/api/users/preview` + fetch friends/social trả `avatarFrame` DTO (`avatarFrameFromGiaoDien`) |
| 2 | `JourneyUserPopover`, `JourneyFriendCard`, `JourneySocialActorRow` áp class + vars inline |
| 3 | Clamp độ dày theo kích thước avatar nhỏ (§7 mục 10) |

### Phase B2.5 — decor SVG preset (tùy chọn)

Cần **design asset** trước code: 4–6 khung, mỗi khung phải đọc được ở 40px và không mô phỏng credential.

### Phase B3 — khung được trao (chỉ khi có quyết định sản phẩm)

Nguồn **không** phải `giao_dien` (user không tự set được). Cần chốt: ai trao, hết hạn không, hiện ở đâu. Mở câu hỏi ở DECISIONS trước, không code.

---

## 10. Câu còn treo — đã chốt khi build B1 (2026-08-28)

1. **Lục giác:** bỏ — chỉ `circle` / `squircle` / `rounded`.
2. **Phạm vi:** B1 trước; B2 (popover/friend/actor) sau khi feedback.
3. **Ring `inheritAccent`:** theo accent theme trang hồ sơ.
4. **Decor SVG:** chưa — dừng ở ring/shape/glow.
5. **Badge / khung được trao:** để sau, plan riêng.
