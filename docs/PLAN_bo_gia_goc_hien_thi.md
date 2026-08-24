# PLAN — Bỏ "Giá gốc hiển thị / Áp dụng" ở meta loại, card ưu tiên giá gốc thấp nhất

> Trạng thái: **Đã triển khai** (2026-08-23) · Model: Grok 4.5 / Medium.

## 1. Bối cảnh & mục tiêu

Meta loại (`ShopKhoLoaiMeta`) hiện có ô **"Giá gốc hiển thị"** + nút **"Áp dụng"** ghi giá này xuống cột `Giá gốc` của mọi biến thể (`shop_bang_gia_dong.gia`). Ngoài mặt tiền, card bảng giá ưu tiên hiển thị `giaMacDinh` (giá loại) đè lên giá từng mẫu.

**Yêu cầu:**
1. Gỡ tính năng "Giá gốc hiển thị / Áp dụng" khỏi UI meta loại.
2. Sau khi gỡ, các card bảng giá ngoài mặt tiền **ưu tiên hiển thị giá gốc thấp nhất** trong loại (min `shop_bang_gia_dong.gia`), dạng **"Từ 105.000 VND"** khi có nhiều mức giá, hiện đúng số khi chỉ 1 mức.

## 2. Quyết định phạm vi (đã chốt với user)

| Vấn đề | Quyết định |
|---|---|
| Cột DB `shop_nhom.gia_mac_dinh` | **GIỮ NGUYÊN** — làm lưới an toàn checkout (biến thể thiếu dòng giá). Không DROP, không migration. |
| Route `apply-price`, `syncNhomGiaMacDinhToMau`, fallback `bang-gia.ts`, auto-apply mẫu mới | **GIỮ** (server plumbing không đổi). Chỉ gỡ đường **ghi từ UI meta** + đổi **đường hiển thị**. |
| Kiểu hiển thị khi nhiều mức giá | **"Từ X"** (giữ nhãn i18n `shop.from`); 1 mức → số chính xác. |

**Nguồn sự thật giá sau thay đổi:** giá gốc từng mẫu = `shop_bang_gia_dong.gia` (đã là SoT sẵn có, không thêm nguồn mới). Card lấy **min** của giá gốc các mẫu. `gia_mac_dinh` tụt xuống vai trò fallback lặng lẽ, không còn tham gia hiển thị.

## 3. Database

**Không thay đổi schema.** Không CREATE/ALTER/DROP. Cột `shop_nhom.gia_mac_dinh` giữ nguyên (fallback checkout tại `lib/shop/bang-gia.ts:264`).

## 4. Backend / lib — đổi ưu tiên hiển thị (bỏ đè bằng `giaMacDinh`)

### 4.1 `lib/shop/storefront.ts`
- **Card loại** (`listShopStorefrontNhomCards`, ~dòng 556–558): đổi
  - `giaTu: a.giaMacDinh ?? a.giaTu` → `giaTu: a.giaTu`
  - `giaDen: a.giaMacDinh ?? a.giaDen` → `giaDen: a.giaDen`
  - `giaMacDinh: a.giaMacDinh` → `giaMacDinh: null` (ngừng đẩy giá loại vào card; `giaTu/giaDen` đã là min/max giá gốc niêm yết theo dòng 504–512).
- **Detail loại** (~dòng 822–824): đổi
  - `giaTu: giaMacDinh ?? giaTu` → `giaTu: giaTu`
  - `giaDen: giaMacDinh ?? giaDen` → `giaDen: giaDen`
  - `giaMacDinh` trong detail: đặt `null` (hoặc giữ field nhưng không dùng để hiển thị — xem 5.3). Khuyến nghị set `null` để component không cần đổi logic ưu tiên.

> Min/max giá gốc đã được tính sẵn ở dòng 504–512 từ `item.giaGoc ?? item.giaHienThi` (giá niêm yết, không lấy giá giảm) — đúng "giá gốc thấp nhất". Không cần thêm truy vấn.

### 4.2 `lib/shop/cua-hang-listing.ts` (hub `/cua-hang`) — ⚠ cần xử lý riêng
- `mapNhomToHang` (~dòng 126–134) hiện lấy `giaHienThi: parseGiaMacDinh(r.gia_mac_dinh)` **trực tiếp** từ cột loại → sẽ sai sau khi ngừng dùng `gia_mac_dinh` để hiển thị.
- **Việc cần làm:** cho card loại ở hub lấy **min giá gốc các mẫu** thay vì `gia_mac_dinh`. Kiểm tra query nguồn (`NhomCatalogRow`) xem đã có sẵn min giá mẫu chưa; nếu chưa, bổ sung aggregate min `shop_bang_gia_dong.gia` theo `id_nhom` (giống cách `storefront.ts` gom min/max). Xem thêm `attachMauGiaFromNhom` (~552–581) để không double-count.
- Đây là điểm **rủi ro cao nhất** của plan — cần đọc kỹ query listing khi build (một bước riêng).

## 5. Frontend

### 5.1 `components/shop/ShopKhoLoaiHub.tsx` — `ShopKhoLoaiMeta` (gỡ UI + logic giá)
Gỡ:
- **JSX:** `label.shop-kho-loai-meta-gia` + hàng input/nút (dòng **1420–1450**) và `applyMsg` note (**1452–1454**). Giữ `label.shop-kho-loai-meta-name`.
- **State:** `gia`, `applying`, `applyMsg` (612–613, 608–610); ref `giaDirtyRef` (657).
- **Hàm:** `applyGia` (815–865); `giaInputValue` (582) nếu không còn dùng.
- **`saveMetaChanges`** (781–802): bỏ nhánh parse `gia` + `body.giaMacDinh` (787–799). Chỉ còn `nhan` + `moTa`.
- **`patch`** (749): bỏ dòng `setGia(giaInputValue(...))`.
- **useEffect:** bỏ 689–692 (setGia theo `giaMacDinh`), 694–696 (reset `applyMsg`); trong 683–687 bỏ `giaDirtyRef.current = false`.
- **`metaDirty`** (1142–1159): bỏ so sánh `gia`/`giaBaseline` + deps `gia`, `nhom.giaMacDinh`, `suggestedGiaMacDinh`.
- **Prop `suggestedGiaMacDinh`:** bỏ khỏi `MetaProps` (559–580) + destructure (594).
- **Import:** bỏ `parseGiaInput` (37) nếu hết dùng trong file.

### 5.2 `components/shop/ShopKhoClient.tsx`
- Bỏ tính `suggestedGiaMacDinh` (~612–637) và bỏ prop truyền vào `ShopKhoLoaiMeta` (~2602–2630).
- **Tooltip cột "Giá gốc"** (3265–3272): sửa câu readonly `"Giá gốc riêng của mẫu — «Áp dụng» ở meta loại sẽ ghi đè cả cột"` → bỏ vế «Áp dụng» (vd. `"Giá gốc riêng của mẫu"`).
- **GIỮ:** đọc/ghi `shop_bang_gia_dong.gia` per biến thể (SoT), fallback `baseDraftForProduct` (873–896), auto-apply mẫu mới (1296–1305) — vẫn hợp lệ vì cột `gia_mac_dinh` còn.

### 5.3 `components/journey/JourneyShopStorefront.tsx`
- `giaLabel` (123–132): bỏ nhánh `card.giaMacDinh != null ? formatGia(card.giaMacDinh)`; bắt đầu từ `card.giaTu` → "Từ X" khi `giaDen !== giaTu`, else số, else `shop.noPrice`. (Nếu đã set `giaMacDinh: null` ở 4.1 thì logic hiện tại tự chạy đúng — vẫn nên đơn giản hoá.)

### 5.4 `components/journey/JourneyShopLoaiClient.tsx`
- `loaiGiaLabel` (725–757): bỏ nhánh `detail.giaMacDinh != null` (kind "loai"/giá loại). Giữ:
  - Nhánh `selectedBt?.giaHienThi` (giá mẫu đang chọn — đúng, giá thật của mẫu).
  - Nhánh `detail.giaTu` → range "Từ X" (min/max giá gốc).

### 5.5 CSS (tùy chọn)
- Class không còn dùng: `.shop-kho-loai-meta-gia`, `.shop-kho-loai-gia-row`, `.shop-kho-loai-gia-apply`, `.shop-kho-loai-gia-note`. Có thể để lại (vô hại) hoặc dọn ở bước cuối.

## 6. Rà soát consumer khác của `giaMacDinh` (kiểm tra nhất quán, không bắt buộc đổi)
Grep còn `giaMacDinh` ở: `lib/shop/gioi-thieu.ts`, `components/shop/ShopAttachHangModal.tsx`, `lib/shop/gio-chung.ts`, `lib/shop/shop-loai-og-fetch.ts`.
- **Giỏ/checkout** (`gio-chung.ts`, `bang-gia.ts`): tính tiền theo `shop_bang_gia_dong` thật, `giaMacDinh` chỉ fallback → **giữ nguyên**.
- **OG image** (`shop-loai-og-fetch.ts`), **Attach modal** (`ShopAttachHangModal.tsx`): nếu hiển thị giá loại cho user, cân nhắc đổi sang min giá gốc cho nhất quán. → Đánh dấu **review khi build**, không nằm trong core.

## 7. Các bước triển khai (thứ tự)
1. **UI meta:** gỡ ô/nút + state/handler ở `ShopKhoLoaiHub.tsx`; sửa `saveMetaChanges`, `metaDirty`, props (5.1).
2. **ShopKhoClient:** gỡ `suggestedGiaMacDinh` + sửa tooltip (5.2). → Build/lint xanh, kho vẫn sửa giá per-mẫu.
3. **Hiển thị storefront + loai detail:** `storefront.ts` (4.1) + 2 component journey (5.3, 5.4). → Card hiện "Từ X" (min giá gốc).
4. **Hub `/cua-hang`:** xử lý `cua-hang-listing.ts` (4.2) — bước riêng, đọc kỹ query.
5. **Rà consumer phụ** (mục 6) — quyết định đổi hay giữ.
6. **Dọn CSS** (tùy chọn) + cập nhật `docs/CINS_DECISIONS.md` ghi quyết định "meta loại không còn set giá; card dùng min giá gốc; `gia_mac_dinh` chỉ fallback".

## 8. Edge cases
- **Loại chưa mẫu nào có giá:** `giaTu` null → card hiện `shop.noPrice`. OK.
- **Legacy loại đã có `gia_mac_dinh` + mẫu chưa có dòng giá:** card sẽ null (không đè bằng giaMacDinh nữa) → khuyến nghị hiển thị noPrice; checkout vẫn an toàn nhờ fallback `bang-gia.ts`. Có thể để `apply-price`/auto-apply legacy vá dần khi seller thêm mẫu.
- **Mẫu 1 giá vs nhiều giá:** `giaTu === giaDen` → số; khác → "Từ X".
- **Auto-apply mẫu mới:** loại legacy còn `gia_mac_dinh` vẫn seed giá mẫu mới → hợp lệ; loại mới không có → mẫu để trống, seller nhập per-mẫu (đúng mô hình mới).

## 9. Rủi ro & verify
- **Rủi ro:** (a) `/cua-hang` listing thiếu min giá (mục 4.2); (b) sót một surface còn ưu tiên `giaMacDinh` → giá lệch giữa các trang. → Grep lại `giaMacDinh` sau khi sửa để chắc mọi surface hiển thị đã đồng bộ.
- **Verify (thủ công):**
  1. Kho → meta loại: không còn ô "Giá gốc hiển thị"/"Áp dụng"; sửa tên/mô tả + Lưu vẫn chạy.
  2. Kho grid: cột "Giá gốc" vẫn sửa được per-mẫu; tooltip không nhắc «Áp dụng».
  3. Storefront (`JourneyShopStorefront`), loại detail (`JourneyShopLoaiClient`), hub `/cua-hang`: card hiện **min giá gốc** ("Từ X" khi nhiều mức).
  4. Thêm mẫu giá thấp hơn → card tự cập nhật xuống mức thấp nhất.
  5. Thêm vào giỏ + checkout: tính tiền đúng theo giá mẫu, không vỡ.
- **Không** chạy migration; **không** đụng logic checkout/tính tiền.
