# PLAN — Customize thanh bài post (nhóm E)

> **Trạng thái:** BUILD Phase E ✅ + polish (2026-08-28) — nền đặc + `dim` + ảnh `customs`
> **Chốt:** datebar per-author trên World; SoT `giao_dien.card`; ảnh tái dùng pool `customs` (Theme).

---

## 0. Vấn đề sản phẩm

DOM: `.jcard-datebar` trong `JourneyMilestoneCard` (avatar + tên + «22 giờ trước» + badge loại/hiển thị).

Trên **World / trang chủ**, mỗi bài là của user khác → nếu custom theo author thì feed sẽ có **nhiều style khác nhau cùng lúc**. Đó là đúng ý (brand cá nhân lan ra feed), không phải bug của `applyToHome`.

| Bề mặt | Ai quyết định style datebar |
|---|---|
| `/{slug}/journey` bài của chủ trang | **Chủ trang** (`giao_dien.card` của owner) |
| World feed / home | **Tác giả bài** (không phải viewer) |
| Bài bookmark / cộng đồng / org frame | **Chrome hệ thống** (không áp `card` user) — trừ khi fork khác |
| Theme wallpaper nhóm A trên home | Vẫn chỉ khi viewer bật `applyToHome` (không đổi) |

Edge đã ghi trong plan theme §7 #6: «Card user A trong feed B — nhóm E giải riêng» → đúng ticket này.

---

## 1. SSOT

| Sự thật | Nguồn | Kết luận |
|---|---|---|
| Style thanh bài (datebar) | `giao_dien.card` | **Grain mới**, cùng cột jsonb với `theme` / `customs` |
| Accent hồ sơ / shell | `giao_dien.theme.accent` | Không ghi đè lẫn nhau trừ khi user chọn «dùng accent theme» |
| Feed author join | `worldJourneyFeedFetch` → `user_nguoi_dung` (`id, slug, ten_hien_thi, avatar_id`) | Mở rộng select **payload card gọn** (không gửi full wallpaper) |

**Cấm:** cột SQL mới, bảng theme-per-post, denormalize vào `content_cot_moc` (trừ khi sau này cần cache perf — Phase 1 không).

### Shape đề xuất (`giao_dien.card`)

```json
{
  "v": 1,
  "enabled": true,
  "mode": "inheritAccent",
  "accent": null,
  "accentHex": null,
  "dim": 0.35,
  "imageId": null,
  "position": { "x": 0.5, "y": 0.5 }
}
```

| Key | Ý nghĩa |
|---|---|
| `enabled` | Tắt → datebar mặc định CINS (dù đã có accent theme) |
| `mode` | `inheritAccent` = lấy hue từ `theme.accent` · `custom` = dùng `accent` / `accentHex` riêng |
| `dim` | Độ đậm nền đặc / overlay ảnh — cùng thang Theme (`0.2`–`1`) |
| `imageId` | CF Images id trong `giao_dien.customs` (cùng pool Theme); `null` = chỉ màu |
| `position` | Trọng tâm crop ảnh trên datebar (`0..1` → `background-position`) — kéo trên demo |
| `accent` / `accentHex` | Chỉ khi `mode = custom`; cùng whitelist preset + hex như theme |

Parser tolerant: thiếu / hỏng → `{ enabled: false }` · bỏ qua `barStyle` legacy.

---

## 2. Áp dụng CSS (per-card, không cascade shell)

Mỗi card có author theme gắn **inline trên article/card**, không dựa `--j-accent` của viewer shell:

```html
<article class="j-milestone …" data-card-theme style="--j-card-accent: #…">
  <div class="jcard-datebar jcard-datebar--themed jcard-datebar--soft">…</div>
</article>
```

- Scope: `.j-milestone[data-card-theme] .jcard-datebar` (+ modifier `--soft` / `--solid` / `--outline`).
- **Không** đổi cả `.j-m-card` body / media (tránh rainbow card toàn feed). Phase này chỉ datebar.
- Dark mode: cùng rule `color-mix(accent, white …)` như theme A.
- Contrast: tái dùng helper luminance từ `profile-theme.ts` nếu cần.

File CSS: `components/journey/journey-card-theme.css` (tách, không phình `journey.css`).

---

## 3. Data path (World = nhiều author)

1. Batch authors như hiện tại trong `worldJourneyFeedFetch` / `milestones-fetch`.
2. `select` thêm `giao_dien` **hoặc** RPC/view chỉ trả `card` đã normalize — Phase 1: thêm `giao_dien` rồi `parseCardTheme` server-side, chỉ attach **DTO nhỏ** lên milestone:

```ts
authorCardTheme?: {
  accentHex: string;
  dim: number;
  imageUrl: string | null;
} | null;
```

3. `JourneyMilestoneCard` đọc prop → set `data-card-theme` + CSS vars trên wrapper datebar / article.
4. Profile journey: map từ `parseProfileTheme` / `parseCardTheme` của owner (đã có `giao_dien` SSR) — không cần fetch thêm.

**Perf:** một query authors / page (đã có); jsonb parse O(authors unique), không O(posts). Không gửi `customs` / wallpaper lên feed.

---

## 4. UI Customize

Tab **Customize → Bài viết** (stub hiện tại trong `JourneyEditProfileModal`):

- Toggle bật/tắt custom datebar.
- Mode: «Dùng màu theme hồ sơ» | «Màu riêng» (reuse chip preset + colorwheel như Theme).
- Nền đặc + slider **Độ đậm nền** (giống Theme).
- Ảnh upload thực tế — reuse `/api/user/giao-dien/upload` + `customs` (nút «Chỉ màu» để tắt ảnh).
- Preview: mock datebar guest (không full phone).
- **Lưu** cùng PATCH `/api/user/giao-dien` — merge key `card`, không xoá `theme` / `customs`.
- Draft + Save giống Theme.

---

## 5. Edge cases

| # | Tình huống | Xử lý |
|---|---|---|
| 1 | User chưa từng mở tab Bài viết | `enabled: false` → datebar mặc định |
| 2 | `mode: inheritAccent` nhưng theme = `cins` | Datebar vẫn default (không tint xanh CINs thừa) **hoặc** soft CINs — chốt fork |
| 3 | Bài tagged / bookmark / cong-dong | **Không** áp `card` user lên frame nguồn (giữ chip org) |
| 4 | Viewer có accent shell + feed nhiều author | Shell accent ≠ datebar author; không conflict |
| 5 | `giao_dien` null / card hỏng | `null` DTO → không `data-card-theme` |
| 6 | CSS injection | Chỉ preset id + `#RRGGBB` normalize server |
| 7 | Feed cũ cache client | Theme đi kèm payload milestone; refresh page / page tiếp theo |

---

## 6. Security & perf

- Chỉ whitelist accent + enum `barStyle`.
- PATCH: auth + merge jsonb (giống theme).
- Public read: `giao_dien.card` coi là **public branding** (giống avatar/tên) — cần confirm RLS/`giao_dien` đã readable cho anon trên profile/feed joins (đã đọc được cho profile theme public).
- Không upload ảnh riêng cho datebar Phase 1.

---

## 7. Steps BUILD (sau khi chốt fork)

| Step | Nội dung |
|---|---|
| 1 | Lib: `parseCardTheme` / `cardThemeCssVars` / validate PATCH trong `profile-theme.ts` (hoặc `card-theme.ts`) |
| 2 | API PATCH merge `card`; GET trả `card` |
| 3 | Feed + journey fetch: attach `authorCardTheme` |
| 4 | `JourneyMilestoneCard`: apply attrs/vars trên datebar self |
| 5 | CSS `journey-card-theme.css` |
| 6 | UI tab Bài viết + preview |
| 7 | Manual: profile + World feed nhiều author |

---

## 8. Forks — cần user chọn

### Fork A — Độ sâu Phase 1

| | Nội dung |
|---|---|
| **A1 (đề xuất)** | Chỉ datebar: accent (inherit hoặc riêng) + `barStyle` soft/solid/outline |
| **A2** | A1 + tint nhẹ cả viền `.j-m-card` |
| **A3** | Pattern / ảnh strip trên datebar (nặng, dễ ồn feed) |

### Fork B — Default khi user đã có theme hồ sơ nhưng chưa đụng «Bài viết»

| | |
|---|---|
| **B1 (đề xuất)** | Tắt — phải bật trong tab Bài viết (tránh World rainbow ngay sau khi chỉ đổi theme) |
| **B2** | Tự `inheritAccent` khi `theme.accent ≠ cins` |

### Fork C — Loại bài được style

| | |
|---|---|
| **C1 (đề xuất)** | Chỉ datebar **self** (owner chip cá nhân) |
| **C2** | C1 + guest/view datebar cùng author trên feed |
| **C3** | Cả tagged attribution (dễ lẫn với org chrome) |

### Fork D — UX lưu

| | |
|---|---|
| **D1** | Draft + nút Lưu chung Customize (giống Theme) |
| **D2** | Auto-save từng control |

---

## 9. Không làm trong phase này

- Nhóm B avatar frame, C shop, D popover.
- Custom toàn bộ body card / media.
- Topbar.
- Denormalize vào bảng mốc.
