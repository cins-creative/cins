# PLAN — Tối ưu tốc độ trang sự kiện + tab «Quầy sự kiện»

Trạng thái: **Phase 1 đã implement** (bỏ probe · tách hang · viewerProfileId). Phase 2–5 còn lại.

---

## 1. Chẩn đoán (đọc code, không đo production)

### 1.1 Chuỗi round-trip hiện tại của tab Quầy

Với sự kiện có N quầy đã duyệt, tab Quầy là tab **mặc định** (đứng đầu khi `hasQuay`), nên người dùng luôn phải chờ chuỗi này:

1. Server render trang (blocking): `getSuKienByPublicKey` → `demDangKySeThamGia` → `listLoaiVeBySuKienIds` (tuần tự trong `mapPublicDetail`), rồi `getCurrentSessionAndProfile` → `canViewerManageSuKien`. Không có `loading.tsx`, không Suspense ⇒ TTFB gánh hết.
2. Hydrate xong → `SuKienDetailMainTabs` gọi **probe** `GET /api/su-kien/{id}/quay` chỉ để biết `items.length > 0` (`components/co-so/SuKienDetailView.tsx` L130–153). Probe này chạy **toàn bộ pipeline nặng**.
3. Probe trả về → tab bar mới xuất hiện → `ShopQuaySuKienPanel` mount → gọi **lại đúng endpoint đó lần 2** (L610–632), cộng `GET /api/auth/session-profile`.
4. Panel render xong, nếu viewer đã đăng nhập và chuyển sang chế độ «Hàng» → thêm `GET /api/shop/gio-chung`.

⇒ Pipeline nặng nhất chạy **2 lần và tuần tự theo thời gian** (probe phải xong trước khi panel mount rồi mới fetch tiếp). Đây là nguyên nhân số 1 của cảm giác «vào trang là quầy load chậm».

### 1.2 Pipeline nặng: `listQuaySuKien`

`lib/shop/quay.ts` L117–120 chạy song song 2 nhánh:

- `listShopListingCardsByOwnerIds(sellerIds)` — ~6–8 query, đủ để **render card shop** (đã có `catalogHang`, `catalogMau`, `searchHaystack`).
- `loadHangSearchBySeller(sellerIds, items)` — với **mỗi seller** gọi `listShopStorefrontItems({ asOwner: true, limit: 80 })`.

Mỗi lần `listShopStorefrontItems` (`lib/shop/storefront.ts` L75–393) là ~8–10 query, có vòng chunk:

| Bước | Bảng | Ghi chú |
|---|---|---|
| 1 | `shop_san_pham` | phân trang 1000/lần |
| 2 | `shop_nhom` | `.in(id_nhom)` |
| 3 | `shop_bien_the` | chunk 120 |
| 4 | `shop_bang_gia` + 5 `shop_bang_gia_dong` | ma trận giá |
| 6 | `shop_post_hang` | chunk 120 |
| 7 | `content_cot_moc` + 8 `content_tac_pham_thuoc_moc` | resolve href kiosk |
| 9 | `shop_don_hang_dong` (join `shop_don_hang`) | chunk 120, **cộng dồn trong JS** |

⇒ N = 5 seller: **~45–55 query Supabase / 1 lần gọi API**, × 2 lần gọi ⇒ **~90–110 query** trước khi lưới quầy có nội dung.

**Điểm mấu chốt:** toàn bộ `hangSearch` này chỉ dùng cho (a) chế độ xem «Hàng» và (b) search haystack — xem `ShopQuaySuKienPanel` L52, L104. Mà `browseMode` mặc định là **`"shop"`** (L580). Nghĩa là ~80% công việc DB ở lần load đầu là **vô ích với UI đang hiển thị**.

### 1.3 Không có tầng cache nào

- API `app/api/su-kien/[suKienId]/quay/route.ts` không set header cache, không `revalidate`, không `unstable_cache`.
- Client gọi `cache: "no-store"` ở cả probe và panel.
- `getSuKienByPublicKey` **không** bọc React `cache()` ⇒ gọi 2 lần (`generateMetadata` + page body) trên mỗi request standalone.
- Trang dùng `dynamic = "force-dynamic"` ⇒ không có ISR/CDN cache cho phần công khai.

### 1.4 Ảnh & payload

- Card shop / hàng trong quầy dùng `<img>` thô với URL `imagedelivery.net/{hash}/{id}/public` (`lib/shop/settings.ts`) — biến thể full size, không `width/height` ⇒ layout shift + tải nặng. Cover sự kiện thì đã đúng (`next/image` + `priority`).
- Payload JSON của quầy mang cả `searchHaystack`, `catalogHang`, `catalogMau` và toàn bộ `hangSearch` (tới 80 mẫu/seller) — dư nhiều field cho lần render đầu.

### 1.5 Hai vấn đề phụ cần flag

- **Rò dữ liệu tiềm ẩn:** `loadHangSearchBySeller` gọi `listShopStorefrontItems({ asOwner: true })` (L153) ⇒ **bỏ qua** gate `getShopHienThi`. Viewer công khai nhận catalog của shop chưa công khai / đã tắt bán hàng. Cần xác nhận đây là ý định hay bug (khi tách endpoint ở Phase 1 thì sửa luôn).
- `GET /api/auth/session-profile` là một round-trip chỉ để lấy `viewerProfileId`, trong khi page RSC đã có session.

---

## 2. Phương án (5 phase, ưu tiên theo tỷ lệ lợi ích/rủi ro)

### Phase 1 — Bỏ fetch trùng + tách payload «Hàng» *(win lớn nhất, rủi ro thấp)*

1. **Bỏ probe fetch trong `SuKienDetailMainTabs`.** Thay bằng `quayCount` truyền từ server:
   - Standalone: page RSC chạy 1 query `count` (`shop_quay_su_kien` `head: true, count: exact`, filter `trang_thai = 'da_duyet'`) **song song** với `getSuKienByPublicKey`.
   - Co-so / cộng đồng: batch `quayCount` theo `.in("id_su_kien", ids)` trong API list sự kiện đang có, trả kèm mỗi event.
   - `SuKienDetailMainTabs` nhận `hasQuay` qua prop ⇒ tab bar render ngay trong HTML đầu tiên, hết nhảy layout.
2. **Tách `hangSearch` khỏi payload mặc định.** `listQuaySuKien(id, { includeHang: false })` là default; thêm endpoint `GET /api/su-kien/{id}/quay/hang` chỉ gọi khi user bấm chế độ «Hàng» hoặc bắt đầu gõ search. Panel giữ kết quả trong state để không fetch lại.
   - Khi tách, đổi `asOwner: true` → `asOwner: viewerId === sellerId` để đóng lỗ hổng ở §1.5.
3. **Bỏ `GET /api/auth/session-profile`:** truyền `viewerProfileId` xuống panel qua prop (page/layout đã có session).

**Kỳ vọng:** query cho lần render đầu của tab Quầy giảm từ ~90–110 → **~8–10**; số round-trip HTTP client từ 4 → 1 (rồi 0 sau Phase 3).

### Phase 2 — Cache tầng server + CDN

1. Bọc nhánh **công khai** (`includePending = false`) của `listQuaySuKien` bằng cache có tag: `unstable_cache`/`"use cache"` với tag `quay:su-kien:{id}` và `revalidate ≈ 60`.
   Invalidate bằng `revalidateTag` trong `duyetQuay`, `rutQuay`, `xinLamQuay`.
   *Cần xác nhận:* production chạy **Cloudflare Workers / OpenNext** (không Vercel) → kiểm tra incremental cache handler đang bật trước khi chọn cơ chế; nếu không có, fallback sang cache in-memory ngắn hạn + `s-maxage`.
2. Với request công khai, set `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`; nhánh `pending=1` giữ `no-store`. Client bỏ `cache: "no-store"` ở nhánh công khai.
3. Bọc `getSuKienByPublicKey` bằng React `cache()` để `generateMetadata` + page body dùng chung 1 lần query.

### Phase 3 — Streaming shell + preload dữ liệu quầy

1. Thêm `app/su-kien/[suKienId]/loading.tsx` (skeleton hero + tab bar) và đưa phần phụ thuộc session (RSVP, nút quản lý) vào `<Suspense>` để HTML sự kiện paint trước.
2. **Server-render dữ liệu tab Quầy:** page RSC fetch danh sách card quầy song song với dữ liệu sự kiện, truyền `initialItems` xuống `ShopQuaySuKienPanel`; panel chỉ refetch khi có mutation. ⇒ tab Quầy có nội dung **ngay từ HTML đầu tiên**, 0 round-trip.
3. Song song hoá `mapPublicDetail`: `demDangKySeThamGia` + `listLoaiVeBySuKienIds` gộp `Promise.all` thay vì tuần tự.

### Phase 4 — DB: index + bỏ đếm trong JS

1. **Đối chiếu index thật trước khi thêm** (đọc `pg_indexes`, đừng đoán). Ứng viên:
   `shop_quay_su_kien(id_su_kien, trang_thai)`, `shop_san_pham(id_nguoi_dung, da_xoa, dang_ban)`, `shop_bien_the(id_san_pham)`, `shop_bang_gia_dong(id_bang_gia, id_bien_the)`, `shop_post_hang(id_bien_the)`, `shop_don_hang_dong(id_bien_the)`.
2. Thay đoạn kéo toàn bộ `shop_don_hang_dong` về JS để cộng dồn (`storefront.ts` L286–333) bằng **RPC/view aggregate** trả `sum(so_luong)` theo `id_bien_the` với filter trạng thái đơn ⇒ bỏ vòng chunk nặng nhất.
3. Trim payload: chỉ trả field UI cần cho lần render đầu (không gửi `searchHaystack`, `catalogMau` nếu chưa dùng).

### Phase 5 — Ảnh

1. Đổi variant Cloudflare Images cho card shop/hàng: dùng biến thể nhỏ thay `/public`, thêm `width`/`height`, `loading="lazy"`, `decoding="async"`; cân nhắc chuyển sang `next/image`.
2. Ảnh avatar org ở topbar (`SuKienDetailView` L717) đang là `<img>` thô — thêm kích thước cố định để hết CLS.

---

## 3. Thứ tự thực hiện đề xuất

| Bước | Nội dung | File chính | Rủi ro |
|---|---|---|---|
| 1 | Bỏ probe + prop `hasQuay`/`quayCount` | `SuKienDetailView.tsx`, `app/su-kien/[suKienId]/page.tsx`, API list sự kiện | Thấp |
| 2 | Tách endpoint `hangSearch` + sửa `asOwner` | `lib/shop/quay.ts`, `app/api/su-kien/[id]/quay/**`, `ShopQuaySuKienPanel.tsx` | Thấp–TB |
| 3 | Bỏ fetch `session-profile` | `ShopQuaySuKienPanel.tsx` + host props | Thấp |
| 4 | Cache tag + header + `cache()` cho `getSuKienByPublicKey` | `lib/shop/quay.ts`, route, `lib/to-chuc/su-kien.ts` | TB (phải đúng invalidation) |
| 5 | `loading.tsx` + Suspense + `initialItems` SSR | page + host | TB |
| 6 | Index + RPC sold-count | `supabase/sql/`, `storefront.ts` | TB–Cao (đo trước) |
| 7 | Ảnh | `CuaHangListCard`, `QuayHangCatalogView` | Thấp |

Bước 1–3 nên làm trong **một lượt** — đó là phần lấy được ~80% cải thiện.

---

## 4. Edge case cần giữ đúng

- `pending=1` (BTC xem quầy chờ duyệt) phải **luôn fresh**, không cache, không dùng `initialItems` cache chung.
- Sự kiện **không có quầy nào** ⇒ không render tab bar, không gọi endpoint quầy (hiện probe vẫn gọi).
- Search theo tên hàng phải vẫn hoạt động sau khi tách `hangSearch`: khi user gõ mà chưa có dữ liệu hàng → fetch on-demand rồi filter (kèm trạng thái loading nhỏ trong ô search).
- Sau `approve` / `reject` / `rút quầy` ⇒ `revalidateTag` để danh sách công khai không bị stale quá 1 phút.
- Shop `tam_dong` / chưa công khai: giữ đúng hành vi hiện tại ở card, nhưng **không** để lộ catalog qua đường `hangSearch`.
- Panel dùng ở 3 nơi (standalone, co-so, cộng đồng) ⇒ prop mới phải optional để không vỡ call site nào.

---

## 5. Cách verify

1. Trước/sau: đếm số query Supabase mỗi request (log tạm trong `createServiceRoleClient` hoặc `console.time` quanh `listQuaySuKien`).
2. DevTools Network: xác nhận endpoint quầy chỉ gọi **≤1 lần** (0 lần sau Phase 3) khi vào trang.
3. Đo TTFB + thời điểm lưới quầy xuất hiện (Performance panel), so với baseline hiện tại.
4. Kiểm tra hồi quy: BTC vẫn thấy quầy chờ duyệt; approve/reject cập nhật ngay; search theo tên hàng vẫn ra kết quả; sự kiện không có quầy không hiện tab.
