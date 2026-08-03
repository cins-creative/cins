# PLAN — Module «Hàng feature» (gợi ý SP từ shop bạn bè)

> Trạng thái: **BUILT** (2026-08-03) — module `hang_feature` + click → trang loại (`shopLoaiMauHref`).  
> Phạm vi: 1 khối sidebar trang chủ + loader + preview; **không** migration nếu v1 chỉ đọc bảng có sẵn.  
> Nối tiếp: `PLAN_home_custom_modules.md` · `PLAN_home_modules_vai_tro.md`.

---

## 0. Vấn đề

Catalog sidebar thiếu khối **khám phá hàng** (social commerce). User muốn:

1. Thêm mục **«Hàng feature»** — ưu tiên sản phẩm nổi bật từ **shop của bạn bè**.
2. Có cách **roll** sản phẩm mới để không nhìn mãi cùng 3–5 SP → chán.

Mục tiêu: mỗi lần mở trang chủ (hoặc theo cửa sổ thời gian) thấy set SP **quen + mới**, vẫn cảm giác “bạn bè đang bán gì”, không thành feed quảng cáo lạnh.

---

## 1. Fact repo (đã khảo sát)

| Nguồn | Có sẵn |
|---|---|
| Bạn bè | `listFriends(viewerId)` → `user_ket_ban` accepted |
| Shop | `shop_cua_hang` (`id` = `id_nguoi_dung` seller) · `getShopHienThi` |
| SP feature | `shop_san_pham.noi_bat` · `dang_ban` · `da_xoa` · `tao_luc` — `listShopStorefrontItems` đã sort `noi_bat` desc rồi `tao_luc` desc |
| Module pattern | `ModuleId` + `MODULE_META` + `MODULE_REGISTRY` + `loadModulePreview` + limit 1–10 |
| Cap | Buyer discovery **không** cần `co_shop` / `da_mua_hang` |

Chưa có loader “SP từ nhiều shop bạn bè” — cần hàm mới, tránh N+1 (`listShopStorefrontItems` theo từng seller).

---

## 2. Product definition

| | |
|---|---|
| **ModuleId** | `hang_feature` |
| **Nhãn** | Hàng feature |
| **Mô tả catalog** | Sản phẩm nổi bật từ shop bạn bè — đổi dần mỗi lần xem. |
| **Group** | `chung` (khám phá xã hội; không nhét `shop` = hàng đợi bán) |
| **Capability** | Không (`requires` / `requiresAny` trống) — ai cũng thêm được |
| **Default layout** | **Không** inject mặc định — chỉ qua «Thêm khối» (tránh sidebar mới đầy) |
| **hideable** | `true` |
| **defaultSide** | `right` |
| **Limit UI** | 3 mặc định (1–10) — hàng ngang/cards nhỏ trong sidebar |

Mỗi dòng: ảnh · tên SP · giá (nếu có) · tên shop/bạn · link storefront / chi tiết SP.

Empty state: “Chưa có bạn nào mở shop — kết bạn hoặc theo dõi creator bán hàng.” + CTA nhẹ.

---

## 3. Database

**V1 — không bảng mới.** Đọc:

- `user_ket_ban` (friends)
- `shop_cua_hang` (shop public)
- `shop_san_pham` (`noi_bat`, `dang_ban`, …)
- `shop_bien_the` / `shop_bang_gia*` (giá — tái dùng helper storefront nếu gọn)

**V1.5 (tuỳ chọn, nếu roll “đã xem” cần server):**  
`user_home_module_seen` hoặc JSON trong prefs — **chưa làm** trừ khi cookie/local không đủ.

RLS: loader dùng service role như các module home khác; chỉ expose SP `dang_ban` + shop đang hiện.

---

## 4. Ranking & nguồn ứng viên (pool)

Xây **pool** (ví dụ top 40–60) rồi cắt theo `limit`.

### 4.1 Ưu tiên nguồn (waterfall + mix)

| Tầng | Trọng số gợi ý | Điều kiện |
|---|---|---|
| A. Bạn bè · SP `noi_bat` | ~55% | Friend có shop public + SP đang bán + `noi_bat` |
| B. Bạn bè · SP mới (`tao_luc` gần) | ~25% | Cùng shop bạn, chưa lấy ở A |
| C. Discovery fallback | ~20% (hoặc fill đủ `limit`) | Shop public / SP `noi_bat` đang bán — **luôn dùng để lấp** khi A+B thiếu |

0 bạn / 0 shop bạn → **vẫn hiện discovery (C)**; badge/copy phân biệt “Từ bạn bè” vs “Gợi ý thêm” nếu mix.

### 4.2 Đa dạng shop (anti-monopoly)

Trong `limit` slot:

- Tối đa **1–2 SP / shop** (limit=3 → 1/shop; limit≥6 → 2/shop).
- Round-robin theo shop trước khi sort điểm.

### 4.3 Điểm mềm (tie-break)

`score = w_noi_bat + w_recency + w_friend + noise_recent_shown`

Không ML v1.

---

## 5. Chiến lược roll — chống chán (chốt đề xuất)

Ba lớp, **ưu tiên từ nhẹ → nặng**:

### Lớp 1 — Time-bucket seed (bắt buộc, 0 storage)

```
seed = hash(viewerId + "|" + bucket)
bucket = floor(unixHours / N)   // N = 6 → đổi set mỗi 6 giờ
```

Shuffle ổn định pool bằng seed → cùng bucket = cùng thứ tự; sang bucket mới = “lô” mới.  
Reload trong 6h không nhảy lung tung (ít cảm giác random lỗi); sáng hôm sau / chiều khác set.

**N đề xuất:** `6` giờ (cân bằng “mới” vs “quen thuộc trong phiên làm việc”).

### Lớp 2 — Session / client seen (khuyến nghị UX)

Cookie hoặc `sessionStorage` key `cins-hang-feature-seen`:

- Lưu ~20–40 `spId` đã hiện gần đây.
- Khi fetch (client refresh module) hoặc SSR đọc cookie: **hạ điểm / đẩy xuống** các id đã seen.
- Sau khi render, append id đang hiện.

Không cần DB; TTL 7 ngày.

### Lớp 3 — Nút «Đổi hàng» (optional polish)

Trong card: action nhỏ “Đổi gợi ý” → client gọi lại preview/API với `exclude[]` = ids đang hiện + seen → lấy batch tiếp theo trong cùng pool.  
Giữ user trong trang, không F5.

### Không làm v1

- Personalization ML / “vì bạn đã xem X”.
- Trừ SP đã mua (có thể Phase 2 — cần join `shop_don_hang`).
- Infinite scroll trong sidebar.

---

## 6. API / lib

| | |
|---|---|
| **Lib** | `lib/cins/home-adaptive/hang-feature.ts` → `loadHangFeature(viewerId, { limit, excludeIds?, bucket? })` |
| **Preview** | Case `hang_feature` trong `loadModulePreview` (reuse lib, limit=3 catalog) |
| **SSR module** | `HangFeatureModule` trong `modules/` — gọi `loadHangFeature` + limit từ `moduleItemLimit` |
| **API riêng?** | Không bắt buộc v1 (SSR + existing `/api/home/module-preview`). «Đổi hàng» sau này: `GET /api/home/hang-feature?limit=&exclude=` |

Query sketch (1–2 round-trip):

1. `friendIds = listFriends(viewerId)` (cap ~100).
2. `shop_cua_hang` where `id in friendIds` + đang hiện.
3. `shop_san_pham` where `id_nguoi_dung in shopIds` + `dang_ban` + not deleted; prefer `noi_bat` hoặc `tao_luc` gần; limit cứng pool.
4. Enrich giá/ảnh/slug (batch); score + diversify + seed shuffle; slice `limit`.

Performance: cache ngắn (`unstable_cache` tag `hang-feature:${viewerId}`, revalidate 5–15 phút) — **bucket nằm trong key** để không dính set cũ sau khi sang cửa sổ mới.

---

## 7. Frontend

| File | Việc |
|---|---|
| `persona.ts` | Thêm `hang_feature` vào `ModuleId` |
| `module-meta.ts` | Meta catalog |
| `HomeModuleColumn.tsx` | Registry |
| `modules/HangFeatureModule.tsx` (mới) | Card list / hàng ảnh |
| `module-preview-types.ts` + `module-preview.ts` + LivePreview + MockCard | Preview edit mode |
| CSS | Hàng ngang compact trong `.ha-card` (ảnh vuông nhỏ + 2 dòng chữ) — tái dùng token shop nếu có |

UI: **không** card-in-card thừa; một `ha-card`, list row hoặc strip ảnh. Click → shop/SP của bạn.

---

## 8. Steps implement

1. Lib `loadHangFeature` + unit-ish manual verify (viewer có ≥2 friend shop).
2. Wire `ModuleId` / meta / registry / empty state.
3. Preview API + mock catalog.
4. Roll Lớp 1 (time-bucket) trong lib; Lớp 2 cookie khi module mount (client thin wrapper hoặc header cookie).
5. (Optional) Nút «Đổi hàng» + exclude query.

---

## 9. Edge cases

| Case | Xử lý |
|---|---|
| 0 bạn bè | Empty hoặc fallback C (chốt: **empty rõ** trước; fallback C nếu muốn “luôn có hàng”) |
| Bạn có shop nhưng 0 `noi_bat` | Dùng tầng B (SP mới) |
| 1 shop thống trị | Cap / shop |
| SP hết hàng / tắt bán giữa chừng | Filter `dang_ban`; regenerate pool |
| Viewer là chủ shop | Không ưu tiên SP **của chính mình** trong khối này |
| Limit = 1 | Vẫn diversify theo seed |

---

## 10. Security / privacy

- Chỉ SP public đang bán + shop đang hiện.
- Không lộ giá nội bộ / draft.
- Không list friend IDs ra client ngoài metadata cần thiết (tên shop đã public).

---

## 11. Đã chốt (user 2026-08-03)

| # | Quyết định |
|---|---|
| 1. Fallback | **Luôn hiện discovery** khi thiếu SP bạn bè (fill đủ `limit`) |
| 2. Bucket | **Mỗi 6 giờ** |
| 3. Seen cookie | **Làm v1** (Lớp 2) |
| 4. «Đổi hàng» | **Phase 2** — không làm v1 (xem giải thích dưới) |
| 5. Default layout | Không inject — chỉ «Thêm khối» |

### «Đổi hàng» là gì?

Nút nhỏ trong card (vd. “Đổi gợi ý”): bấm → lấy **batch SP khác** ngay (loại trừ SP đang hiện), không cần đợi hết 6h hay F5.  
Hữu ích khi user chán set hiện tại trong cùng buổi. V1 đã có roll tự động 6h + cookie “đã xem” nên **chưa cần nút**; làm sau nếu thấy thiếu.

---

## 12. Build next

BUILD (Grok): Step 1–4 trong §8 — lib + module + preview + bucket 6h + cookie seen.
