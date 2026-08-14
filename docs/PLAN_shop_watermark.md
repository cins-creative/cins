# PLAN — Shop: Decoy + watermark chống copy ảnh

> **Phase A:** đã build 2026-08-14 (decoy + lightbox). B/C chưa làm.  
> **Trigger:** Khách vẫn click xem lớn trong CINs; chuột phải / Open image / Save ra tấm trong suốt; lightbox phủ chữ shop + `cins.vn/{slug}`.  
> **Chốt tư duy (2026-08-14):** Watermark nhìn thấy bị PS/AI xóa dễ — không dựa vào đó làm hàng rào. Phase A chỉ giảm kẻ cắp lười. Screenshot / Inspect / Network **không** chống.  
> Liên quan: `CINS_DEV_RULES.md` §5–§7 (CF Images) · `JourneyShopLoaiClient` gallery · `overlay_anh_id` (**không** reuse — overlay trang trí).  
> **ALTER:** không ở Phase A. Cột tick Kho / mức B–C giữ ở §4 — **chưa migrate**.

---

## 1. Mục tiêu & phạm vi

**Phase A (build lần này)**

| Hạng mục | Nội dung |
|---|---|
| Decoy | Mọi ảnh **sản phẩm** khách thấy: tấm `<img src="/shop-decoy.png">` trên cùng (PNG 1×1 trong suốt) |
| Open image / Save / kéo | Trình duyệt bám decoy → tab trắng / file trong suốt |
| Xem lớn | Chỉ lightbox / preview **trong CINs** — không `window.open(url ảnh)` |
| Chữ phủ | Chỉ khi xem lớn: tên shop + `cins.vn/{ownerSlug}` lặp xoay, phủ kín |
| Catalog / thumb / chip / kiosk ticker | Chỉ decoy, **không** chữ |
| Owner / Kho | Ảnh sạch — không decoy, không chữ |
| Bật/tắt | **Mặc định mọi shop** — không tick Kho ở phase này |

**Ngoài scope Phase A**

- Chống screenshot (`Win+Shift+S`), quay màn, Inspect, tab Network.
- DRM / watermark ẩn forensic.
- Video Stream (`video_phu`).
- Ảnh bài Journey / review / avatar / cover shop (không phải ảnh hàng).
- Đổi hành vi `overlay_anh_id`.
- Ẩn `src` sạch (mức B) / file đã đóng chữ (mức C).

**Cam kết copy (nếu sau này có UI seller):**  
«Giảm copy nhanh trên web — không chống screenshot / công cụ chuyên nghiệp.»

---

## 2. Hiện trạng (đã verify)

| Điểm | Sự thật | Nguồn |
|---|---|---|
| Gallery loại | `<img class="j-shop-loai-gallery-base" src={galleryUrl}>` — CF `/public` trần | `JourneyShopLoaiClient.tsx` |
| Overlay trang trí | `overlayAnhUrl` từ `shop_nhom.overlay_anh_id` — **không** phải chống trộm | gallery + `storefront.ts` |
| Lưới storefront | `<img src={card.anhUrl}>` trong `TypeCard` / `ItemCard` | `JourneyShopStorefront.tsx` |
| Chip mẫu | `<img src={thumb}>` trong `.j-shop-loai-chips--mau` | `JourneyShopLoaiClient.tsx` |
| Kiosk | Thumb ticker + catalog; preview portal đã có (`shop-kiosk-preview`) | `ShopKioskBlock.tsx` |
| Hub `/cua-hang` | `ChListingImg` — cover/avatar shop + thumb hàng | `CuaHangListCard` · `CuaHangListingClient` |
| URL shop công khai | `/{ownerSlug}/shop/{shopSlug}` · Journey `cins.vn/{ownerSlug}` | `lib/shop/cua-hang-href.ts` |

---

## 3. Quyết định thiết kế (chốt 2026-08-14)

### 3.1 Stack 4 lớp (ảnh hàng khách)

Từ dưới lên:

| z | Lớp | Việc |
|---|---|---|
| 0 | Ảnh hàng | Khách thấy. `pointer-events: none` |
| 1 | `overlay_anh_id` (nếu có) | Trang trí. `pointer-events: none` (đã có) |
| 2 | **Decoy** `<img src="/shop-decoy.png">` | Tấm duy nhất nhận chuột phải / kéo / long-press |
| 3 | Chữ CSS (chỉ lightbox / kiosk preview) | `pointer-events: none` |
| 4 | Dots / đóng / swipe chrome | `pointer-events: auto` |

Ảnh hàng **không** được là tấm trên cùng. Decoy là asset tĩnh CINs — không dùng id CF seller.

### 3.2 Hai chế độ

| Chế độ | Surface | Decoy | Chữ |
|---|---|---|---|
| Catalog | Lưới SF · chip mẫu · thumb gallery · more-card · kiosk ticker/catalog thumb · hub hàng | Có | Không |
| Xem lớn | Lightbox trang loại · kiosk `shop-kiosk-preview` | Có | Tên shop + `cins.vn/{slug}` |

Click catalog: giữ navigation / chọn mẫu (không đổi thành lightbox).  
Click gallery loại (tap, không swipe) → lightbox CINs.

### 3.3 Chữ watermark

```
{tenShop} · cins.vn/{ownerSlug}
```

- `tenShop` = `shop.ten` / `sellerName`; thiếu → chỉ URL.
- Không dùng email (tránh PII; plan cũ 2026-08-11 bỏ).
- Owner xem shop mình / Kho: không chữ, không decoy.

### 3.4 Phase sau (chưa làm)

| Phase | Tên | Hiệu lực |
|---|---|---|
| **B** | Che DOM `src` | Canvas / blob / `background-image` — Inspect khó lấy URL sạch hơn |
| **C** | File đã đóng chữ | Open tab / Save / copy URL = bản có watermark (Worker C1 hoặc bake C2) |

Phase A **cố ý** còn URL sạch trên DOM + Network.

### 3.5 Cờ Kho / ALTER

Hoãn. Phase A không cần cột. Nếu sau này muốn seller tắt: quay lại đề xuất §4.

---

## 4. Database

> **Không chạy migration ở Phase A.**

### 4.1 Phase sau (tick Kho) — chỉ khi user yêu cầu

```sql
-- user_nguoi_dung
ALTER TABLE user_nguoi_dung
  ADD COLUMN IF NOT EXISTS shop_watermark_bat boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shop_watermark_muc text NOT NULL DEFAULT 'a'
    CHECK (shop_watermark_muc IN ('a', 'b', 'c'));

-- shop_nhom
ALTER TABLE shop_nhom
  ADD COLUMN IF NOT EXISTS watermark_bat boolean NULL;  -- NULL = inherit shop
```

Báo user trước khi ALTER (DEV_RULES §1 · DECISIONS L34).

### 4.2 Phase C — C1 Worker (đề xuất) vs C2 Bake

Giữ như bản 2026-08-11: C1 on-demand composite; C2 hai id CF. Chưa chọn cho đến khi làm C.

---

## 5. API / Lib

Phase A **không** API mới.

| File | Việc |
|---|---|
| `lib/shop/image-protect.ts` | `SHOP_DECOY_SRC` · `shopProtectWatermarkText({ shopTen, ownerSlug })` |
| `components/shop/ShopImageProtect.tsx` | Wrapper ảnh + decoy + chữ tùy chọn; `ShopImageDecoy` |
| `components/shop/ShopImageLightbox.tsx` | Dialog xem lớn trong CINs |
| `public/shop-decoy.png` | PNG 1×1 trong suốt |

---

## 6. Frontend

### 6.1 `ShopImageProtect`

- `protect===false` (owner): `<img>` thường.
- `protect===true`: ảnh hàng `pointer-events: none` + decoy trên cùng + (nếu `watermarkText`) lớp chữ.
- `fit="fill"` (thumb/card) · `fit="contain"` (lightbox / kiosk preview).
- Không `preventDefault` contextmenu — để Open image bám decoy.

### 6.2 Gắn vào (Phase A)

| Surface | File | Mode |
|---|---|---|
| Gallery loại + tap xem lớn | `JourneyShopLoaiClient.tsx` | Decoy chung trên gallery (không bọc từng frame swipe) + lightbox |
| Thumb gallery | cùng file | Decoy |
| Chip mẫu | cùng file | Decoy |
| More-card loại khác | cùng file | Decoy |
| Lưới storefront | `JourneyShopStorefront.tsx` | Decoy; `protect={!isOwner}` |
| Kiosk ticker / catalog / preview | `ShopKioskBlock.tsx` | Decoy; preview + chữ |
| Hub thumb hàng | `ChListingImg` `protect` · `CuaHangListCard` · `HangHitCard` | Decoy; **không** cover/avatar shop |

### 6.3 A11y

- Decoy + chữ `aria-hidden`.
- Ảnh hàng giữ `alt` hữu ích khi lightbox; thumb catalog `alt=""` nếu card đã có tên.
- Không chặn keyboard. Dots / đóng lightbox vẫn bấm được.
- `prefers-reduced-motion`: không animate chữ.

---

## 7. Steps build

| Step | Nội dung | Done khi |
|---|---|---|
| **A0** | Cập nhật plan này (decoy, mặc định mọi shop, chữ = shop + slug) | ✅ |
| **A1** | `shop-decoy.png` + `image-protect.ts` + `ShopImageProtect` + CSS | ✅ |
| **A2** | Lightbox trang loại | ✅ |
| **A3** | Gắn decoy: SF · chip · kiosk · hub hàng | ✅ |
| **A4** | Docs IMPLEMENTATION + DECISIONS LOG — hỏi user | |

**Không** làm B/C trong PR này.

---

## 8. Edge cases

| Case | Xử lý |
|---|---|
| Swipe gallery | Decoy đứng yên; frame dưới animate; tap (dx/dy nhỏ) mới mở lightbox |
| Video phụ | Không decoy trên iframe |
| `overlay_anh_id` | Dưới decoy, trên ảnh hàng |
| Owner | `protect=false` |
| Thumb / chip | Decoy; click vẫn chọn mẫu / vào loại |
| Hub cover + avatar | Không decoy |
| Ảnh đánh giá | Không decoy |
| Inspect / Network | Còn URL sạch — chấp nhận Phase A |
| `Win+Shift+S` | Không biết, không chặn |
| OG / crawler | Không đổi (bot không chuột phải) |

---

## 9. Security & performance

- Decoy 1 file tĩnh — cache CDN, không API.
- Không expose token CF.
- Lazy load ảnh hàng giữ nguyên.
- Overlay CSS không tăng LCP đáng kể.
- Không N+1: chữ lấy `shop.ten` + `ownerSlug` đã có trên client.

---

## 10. Verify checklist (Phase A)

- [ ] Khách: chuột phải gallery / lưới / chip / kiosk / thumb hub hàng → Open image = `/shop-decoy.png` (trắng).
- [ ] Khách: tap gallery loại → lightbox trong CINs, chữ shop + `cins.vn/{slug}` phủ.
- [ ] Khách: kiosk bấm thumb → preview có decoy + chữ.
- [ ] Swipe gallery vẫn đổi ảnh; dots vẫn bấm.
- [ ] `overlay_anh_id` vẫn hiện dưới decoy.
- [ ] Owner xem shop mình: ảnh sạch, không decoy/chữ.
- [ ] Cover/avatar shop trên `/cua-hang` không decoy.
- [ ] Video gallery không vỡ.

---

## 11. Câu hỏi treo

1. **C1 vs C2** khi làm mức C — mặc định C1.  
2. Seller có được tắt decoy sau này không — chưa; Phase A bắt buộc.  
3. Thumb hub: chỉ decoy (đã chốt), không chữ.

---

## 12. Handoff

Phase A = Step A1–A3. Không ALTER. Không đụng `overlay_anh_id`.  
Sau ship: hỏi cập nhật `CINS_IMPLEMENTATION.md` + `CINS_DECISIONS.md` LOG.
