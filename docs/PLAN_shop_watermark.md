# PLAN — Shop: Watermark chống trộm ảnh

> **Phase:** PLAN only (chưa build) · 2026-08-11  
> **Trigger:** User muốn phủ lớp chống copy trên ảnh shop (gallery lớn + hub `/cua-hang`) + tick bật ở Kho; Open image / Save chỉ thấy bản watermark khi làm đủ mức C.  
> **Model plan:** Opus 5 / Medium · **Model build đề xuất:** Phase A–B Composer→Grok · Phase C Grok 4.5 / Medium (Worker + ALTER).  
> Liên quan: `CINS_DEV_RULES.md` §5–§7 (CF Images) · `lib/shop/settings.ts` · `JourneyShopLoaiClient` gallery · `overlay_anh_id` (**không** reuse — đó là overlay trang trí sản phẩm).  
> **ALTER:** có đề xuất cột mới — **báo user trước khi migrate** (DEV_RULES §1 · DECISIONS L34).

---

## 1. Mục tiêu & phạm vi

**Trong scope (hết luôn — 3 mức + 2 tầng cờ + mọi surface công khai)**

| Hạng mục | Nội dung |
|---|---|
| UX chống nhìn trộm | Lớp sọc mờ + chữ watermark = email công khai shop (vd. `hinatavy@cins.vn`) trên ảnh lớn |
| Tick Kho | Bật/tắt «Watermark chống trộm ảnh» trong `ShopKhoClient` / `ShopKhoLoaiMeta` |
| Scope cờ | **Shop-wide** (mặc định) + **override per loại** (`shop_nhom`) |
| Surface | Gallery `JourneyShopLoaiClient` · thumb hub `/cua-hang` · mọi chỗ storefront công khai dùng `shopImageUrl` cho khách |
| Mức A | Overlay CSS + chặn context menu / drag |
| Mức B | Không lộ `<img src>` sạch trên DOM khách (bg / canvas / blob) |
| Mức C | Serve **file đã watermark** (Worker on-demand hoặc bake CF id thứ 2) — Open in new tab / Save = bản có watermark |
| Vòng đời CF | Đổi/xóa ảnh gốc → xóa luôn asset watermark bake (nếu dùng C-bake); pattern giống paste `ShopKhoLoaiMeta` đã xóa ảnh cũ trên CF |

**Ngoài scope**

- Chống screenshot / quay màn hình / DevTools network khi vẫn còn request URL sạch ở mức A–B.
- DRM / encrypted media / blind watermark forensic.
- Watermark video Stream (`video_phu`).
- Watermark ảnh trong bài Journey giới thiệu sản phẩm (album post) — phase sau nếu cần.
- Đổi hành vi `overlay_anh_id` (lớp trang trí loại hàng).

**Cam kết copy UI (bắt buộc):**  
«Giảm copy nhanh trên web — không chống screenshot / công cụ chuyên nghiệp.»

---

## 2. Hiện trạng (đã verify)

| Điểm | Sự thật | Nguồn |
|---|---|---|
| Gallery loại hàng | `<img class="j-shop-loai-gallery-base" src={galleryUrl}>` — URL CF `/public` trần | `JourneyShopLoaiClient.tsx` ~L1282–1308 |
| Overlay sẵn có | `overlayAnhUrl` từ `shop_nhom.overlay_anh_id` — **trang trí**, không phải chống trộm | `storefront.ts` · `nhom.ts` · gallery L1313–1320 |
| Hub listing | `CuaHangListCard` → `ChListingImg` + `anhUrl` | `CuaHangListCard.tsx` |
| URL ảnh shop | `shopImageUrl(id, variant="public")` → `imagedelivery.net/.../{id}/{variant}` | `lib/shop/settings.ts` |
| Opt-in bán hàng | `user_nguoi_dung.ban_hang_bat` · `shop_hien_thi` | `getBanHangSettings` |
| Email sidebar | `email_lien_he` + `visibility_email` trên profile | `lib/journey/profile-page-fetch.ts` |
| Xóa CF | `deleteCloudflareImage` server-only | `lib/cloudflare/delete-image.ts` |
| Paste thay ảnh loại | Upload mới → patch `anhId` → CF xóa id cũ | `ShopKhoLoaiMeta` (corner-paste) |
| CF variants | `public`, `thumbnail`, `grid`, … — **không** có variant watermark sẵn | `cf-image-variants.ts` |

---

## 3. Quyết định thiết kế (chốt trong plan)

### 3.1 Ba mức = 3 phase build tuần tự

| Phase | Tên | Hiệu lực | Effort |
|---|---|---|---|
| **A** | Deterrent UI | Che mắt trên trang; Save/Open tab **vẫn sạch** | Nhỏ |
| **B** | Che DOM `src` | Khó Open image / Save từ `<img>`; Network vẫn có thể lộ URL nếu vẫn fetch sạch | Trung bình |
| **C** | Asset watermark | Save / Open tab / copy URL công khai = **chỉ** bản watermark | Lớn |

Ship A trước (có tick + copy trung thực). B và C bật dần; flag feature có thể `shop_wm_muc` = `a` \| `b` \| `c` (shop-wide) để rollback.

### 3.2 Hai tầng cờ (AND logic)

```
watermark_hien_thi_cho_khach =
  shop.shop_watermark_bat
  AND (nhom.watermark_bat IS NULL ? true : nhom.watermark_bat)
  AND co_email_watermark
```

| Cột (đề xuất) | Bảng | Ý nghĩa |
|---|---|---|
| `shop_watermark_bat` | `user_nguoi_dung` | Master shop-wide (mặc định `false`) |
| `shop_watermark_muc` | `user_nguoi_dung` | `'a' \| 'b' \| 'c'` — mức kỹ thuật đang bật (default `'a'`) |
| `watermark_bat` | `shop_nhom` | `NULL` = theo shop · `true`/`false` = override loại |
| *(C-bake)* `anh_wm_id` / map phụ | xem §4.2 | id CF bản đã đóng watermark |

**UI Kho**

- Shop-wide: block trong card settings / đầu Kho (`ShopKhoClient`) — «Watermark chống trộm ảnh» + select mức (ẩn mức C đến khi infra sẵn).
- Per loại: tick trong `ShopKhoLoaiMeta` — «Dùng watermark (theo shop)» / «Tắt riêng loại này» / «Bật riêng» (3-state → map `NULL`/`false`/`true`).

### 3.3 Nguồn chữ watermark

1. Ưu tiên: `user_nguoi_dung.email_lien_he` khi `visibility_email` cho phép công khai (cùng rule sidebar Journey).  
2. Fallback: không cho **bật** tick nếu thiếu email công khai — toast «Thêm email liên hệ công khai trên Journey trước».  
3. Không dùng email login Auth nếu `visibility_email` ẩn (tránh lộ PII).

### 3.4 Visual

- **Gallery lớn:** sọc chéo semi-transparent + text lặp (email) góc / tiled; `pointer-events: none` trên lớp chữ; không che nút swipe/dots.  
- **Thumb `/cua-hang`:** watermark **nhẹ hơn** (opacity thấp hơn hoặc chỉ sọc, chữ nhỏ) — hoặc chỉ áp dụng từ kích thước ≥ `medium` (config).  
- **Owner / Kho / preview dashboard:** **không** watermark (luôn sạch).  
- Không đụng CSS/HTML của `j-shop-loai-gallery-overlay` (overlay sản phẩm).

### 3.5 Phân biệt «Open image = watermark»

Chỉ **Phase C** đáp ứng đúng. A+B phải ghi rõ trong UI help text.

---

## 4. Database

> **Chưa chạy migration.** Báo cáo user → confirm → mới `ALTER`.

### 4.1 Phase A–B (tối thiểu)

```sql
-- user_nguoi_dung
ALTER TABLE user_nguoi_dung
  ADD COLUMN IF NOT EXISTS shop_watermark_bat boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shop_watermark_muc text NOT NULL DEFAULT 'a'
    CHECK (shop_watermark_muc IN ('a', 'b', 'c'));

-- shop_nhom
ALTER TABLE shop_nhom
  ADD COLUMN IF NOT EXISTS watermark_bat boolean NULL;  -- NULL = inherit shop
```

Index: không cần (đọc theo pk / đã join nhom).

### 4.2 Phase C — chọn **một** chiến lược (đề xuất mặc định: **C1 Worker**)

| | **C1 Worker on-demand** (đề xuất) | **C2 Bake 2 id** |
|---|---|---|
| Lưu DB | Không thêm cột ảnh | Thêm map `anh_id` → `anh_wm_id` (bảng `shop_anh_watermark` hoặc cột JSON) |
| Đổi email | Watermark text đổi ngay | Phải re-bake hàng loạt |
| Chi phí | CPU/cache Worker | 2× storage CF + job xóa |
| Open tab | URL Worker/proxy có wm | URL `imagedelivery` bản wm |
| Xóa ảnh gốc | Không asset phụ | **Bắt buộc** `deleteCloudflareImage(anh_wm_id)` khi xóa/đổi gốc |

**C1 (đề xuất):** route công khai kiểu  
`/api/shop/wm/[imageId]?u=[ownerId]` hoặc CF Worker bind  
→ fetch CF private/origin → composite text email → `Cache-Control` dài + key theo `(imageId, emailHash, muc)`.  
Khách **không** nhận URL `imagedelivery.../public` trên storefront khi `muc=c`.

**C2:** lúc bật C hoặc lúc upload: server vẽ watermark (canvas/sharp trên Node hoặc Worker) → `uploadToCloudflareImages` → lưu `anh_wm_id`. Storefront chỉ trả `shopImageUrl(anh_wm_id)`.

### 4.3 RLS

- Cột trên `user_nguoi_dung` / `shop_nhom`: đọc công khai cùng policy storefront hiện có; ghi chỉ owner (pattern `ban_hang_*`).  
- Bảng bake (nếu C2): service role ghi; client không update trực tiếp.

---

## 5. API / Lib

| Endpoint / lib | Việc |
|---|---|
| `GET/PATCH /api/user/ban-hang` (hoặc mở rộng settings shop) | Đọc/ghi `shop_watermark_bat`, `shop_watermark_muc` |
| `PATCH /api/shop/nhom/[id]` | Thêm `watermarkBat: boolean \| null` |
| `lib/shop/watermark.ts` (mới) | `resolveWatermarkState({ shop, nhom, email })` → `{ active, muc, text }` |
| `shopImageUrl` / storefront DTO | Khi `active && muc==='c'`: trả URL wm (Worker hoặc `anh_wm_id`); owner path giữ URL sạch |
| `lib/shop/cua-hang-listing.ts` · `storefront.ts` | Nhúng `watermark: { active, muc, text }` vào DTO card / detail (tránh N+1: join owner email + flags một lần) |
| Phase C1 | `GET /api/shop/wm/...` hoặc Worker — auth **không** bắt buộc (công khai) nhưng **không** redirect tới bản sạch; rate limit theo IP |
| Xóa ảnh | Mọi chỗ đã `deleteCloudflareImage(anh_id)`: nếu C2, xóa kèm `anh_wm_id` (paste meta, xóa loại, xóa phụ, …) |

**Không** gọi CF delete từ client — giữ server-only (DEV_RULES).

---

## 6. Frontend

### 6.1 Component dùng chung

`components/shop/ShopImageProtect.tsx` (tên gợi ý):

- Props: `srcClean`, `watermark: { active, muc, text } \| null`, `variant: 'gallery' \| 'thumb'`, `alt`, className.
- `muc==='a'`: `<img src={srcClean}>` + overlay CSS sọc/text + `onContextMenu prevent` + `draggable={false}`.
- `muc==='b'`: không set `src` sạch lên img có thể Save — dùng `background-image` / canvas drawImage+fillText / `blob:` đã composite; vẫn có overlay CSS nếu cần.
- `muc==='c'`: `<img src={srcWatermarked}>` (+ overlay CSS tùy chọn cho đồng nhất UX).
- `active===false`: img thường như hiện tại.

### 6.2 Gắn vào

| Surface | File | Ghi chú |
|---|---|---|
| Gallery loại | `JourneyShopLoaiClient.tsx` | Thay `j-shop-loai-gallery-base`; giữ swipe/dots |
| Hub hàng | `CuaHangListCard` / `ChListingImg` | Thumb nhẹ |
| Storefront khác | Mọi `<img>` khách từ `anhUrl` shop | Grep `shopImageUrl` / `anhUrl` public |
| Kho tick | `ShopKhoClient` + `ShopKhoLoaiMeta` | Master + override 3-state |
| CSS | `app/cua-hang/cua-hang-listing.css` · journey shop CSS | Token CINS, không invent palette |

### 6.3 A11y

- Overlay `aria-hidden`.  
- Ảnh vẫn có `alt` hữu ích (tên loại).  
- Không chặn keyboard.  
- Giảm motion: tôn `prefers-reduced-motion` (bỏ animate sọc nếu có).

---

## 7. Steps build

| Step | Nội dung | Model | Done khi |
|---|---|---|---|
| **0** | Confirm ALTER §4.1 + chọn C1 vs C2 | — | User OK |
| **1** | Migration + types + `resolveWatermarkState` | Grok | Cột tồn tại; unit logic inherit |
| **2** | API PATCH shop-wide + per nhom | Grok | curl 401/403/200 |
| **3** | UI tick Kho + copy trung thực | Composer | Bật/tắt persist |
| **4** | Phase A: `ShopImageProtect` + gallery + listing | Composer/Grok | Sọc + email trên gallery khi bật |
| **5** | Phase B: ẩn `src` sạch trên DOM khách | Grok | Open image không ra file sạch dễ dàng |
| **6** | Phase C (C1 hoặc C2) + wire DTO URL | Grok | Open tab = file có wm |
| **7** | Vòng đời xóa CF (C2) / cache purge (C1) khớp paste/xóa ảnh | Grok | Đổi ảnh không orphan wm |
| **8** | Docs: IMPLEMENTATION + DECISIONS LOG; hỏi cập nhật | — | |

Một PR/phase: **không** gộp Step 6 vào cùng PR Step 4 trừ khi user yêu cầu.

---

## 8. Edge cases

| Case | Xử lý |
|---|---|
| Chưa có email công khai | Không cho bật master; nếu đang bật mà user ẩn email → `active=false` + banner Kho |
| `watermark_bat=false` trên 1 loại | Loại đó sạch dù shop bật |
| Owner xem shop mình | Luôn sạch (kể cả mức C) |
| `overlay_anh_id` + watermark | Cả hai: base (±wm) rồi overlay trang trí trên cùng |
| Video phụ | Không wm (ngoài scope) |
| Ảnh phụ / swipe gallery | Mỗi frame áp cùng rule |
| Đổi email (C1) | Cache key đổi → wm chữ mới |
| Đổi email (C2) | Job re-bake hoặc đánh dấu stale → fallback C1 tạm |
| Tắt mức C → A | Storefront lại dùng URL sạch + overlay |
| Bot/crawler OG | OG/share có thể giữ thumb sạch hoặc wm nhẹ — **chốt:** thumb OG **có** wm nếu shop bật (tránh leak sạch qua OG) |
| Right-click «Inspect» | Không chống được ở A–B; C chỉ bảo vệ URL public |

---

## 9. Security & performance

- Không expose `CLOUDFLARE_IMAGES_API_TOKEN` ra client.  
- Phase C1: rate limit + cache CDN; không proxy arbitrary URL (chỉ `imageId` thuộc shop / allowlist).  
- Validate `imageId` format CF trước khi fetch.  
- Listing: gói `watermark` vào DTO sẵn có — **không** N+1 query email.  
- Lazy load giữ nguyên; overlay không tăng LCP đáng kể (CSS).  
- C2: mọi hard-delete ảnh gốc phải xóa wm id (cùng rule media hard-delete DEV_RULES).

---

## 10. Verify checklist (sau build)

- [ ] Shop tắt wm → gallery/listing như cũ.  
- [ ] Shop bật A + có email → gallery có sọc + email; listing nhẹ hơn.  
- [ ] Loại override tắt → loại đó sạch.  
- [ ] Chuột phải trên gallery bị chặn menu (A+).  
- [ ] Mức B: không có `imagedelivery.../public` trên attribute `src` của img khách (hoặc chỉ blob).  
- [ ] Mức C: Open in new tab = ảnh có watermark.  
- [ ] Owner Kho / paste thay ảnh: CF xóa cũ (+ wm id nếu C2).  
- [ ] Ẩn email công khai → wm ngừng active, không lộ email.  
- [ ] `overlay_anh_id` vẫn hoạt động độc lập.

---

## 11. Câu hỏi treo (chỉ còn nếu user đổi ý)

1. **C1 Worker vs C2 Bake** — plan mặc định **C1**. Đổi C2 nếu muốn URL thuần `imagedelivery` và chấp nhận re-bake.  
2. Thumb `/cua-hang`: wm nhẹ **hay** tắt hẳn tới khi mở trang loại? (plan mặc định: **nhẹ**).  
3. `shop_watermark_muc` cho seller tự chọn A/B/C hay CINs lock theo rollout? (plan: seller chọn khi feature flag CINs mở đủ mức).

---

## 12. Handoff build

Paste plan này + ghi rõ: «chỉ Step 1–4 (Phase A)» hoặc «hết Step 1–7».  
Trước Step 1: confirm ALTER §4.1.  
Không đụng `overlay_anh_id`.  
Cập nhật `docs/CINS_IMPLEMENTATION.md` (API/lib) + `CINS_DECISIONS.md` LOG sau khi chốt/migrate.
