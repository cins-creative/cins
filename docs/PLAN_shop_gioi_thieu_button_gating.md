# PLAN — Nút «Giới thiệu sản phẩm»: hiện có điều kiện + highlight khi chưa từng đăng

> Phạm vi: chỉ điều chỉnh **hiển thị / hiệu ứng** nút `shop-kho-loai-gioi-thieu` trong meta của một loại hàng. Không đổi luồng đăng bài, không đổi kiosk, không đổi schema.

## 1. Mục tiêu (từ yêu cầu user)

1. **Chỉ hiện nút** «Giới thiệu sản phẩm» khi **thông tin danh mục hàng đã đầy đủ** (hiện tại nút luôn render, chỉ bị `disabled` khi thiếu ảnh).
2. Nếu loại hàng này **chưa từng có bài giới thiệu nào** → thêm **hiệu ứng highlight** (pulse/glow) để hút mắt user vào nút. Khi đã từng đăng ≥1 bài → tắt highlight.

## 2. Hiện trạng code (đã xác minh)

| Thành phần | File | Ghi chú |
|---|---|---|
| Nút + prop `onGioiThieu`, `gioiThieuDisabledReason`, `gioiThieuKioskWarn`, `gioiThieuBusy` | `components/shop/ShopKhoLoaiHub.tsx` (`ShopKhoLoaiMeta`, ~L559–L1308) | Nút **luôn render** khi có prop `onGioiThieu`; chỉ `disabled` khi thiếu ảnh / đang bận |
| Orchestration + truyền prop | `components/shop/ShopKhoClient.tsx` (~L2435 `onGioiThieuSanPham`, ~L2602 render meta) | `gioiThieuDisabledReason` chỉ yêu cầu **ảnh** + `canCompose` |
| Cảnh báo đầy-đủ (hub) | `lib/shop/gioi-thieu.ts` → `nhomGioiThieuCanhBao(nhom)` | Trả `thieu_anh` / `chua_co_mau` / `chua_co_gia` |
| Trạng thái «đã từng giới thiệu» | `GET /api/shop/groups/[id]/about` → `getGioiThieuCooldown` → `lastAt` | `lastAt != null` ⇒ **đã từng** đăng ≥1 bài (bảng `shop_nhom_gioi_thieu`, 1 dòng/loại). **Không cần đổi schema.** |
| CSS nút | `components/shop/shop-dashboard.css` (`.shop-kho-loai-gioi-thieu`, `.is-warn` ~L2415–L2478) | Chưa có keyframe pulse/glow cho nút này |

**Kết luận quan trọng:** nguồn sự thật «đã từng giới thiệu» đã có sẵn (`shop_nhom_gioi_thieu.tao_luc` → `lastAt`). Không thêm nguồn thứ hai (tuân SSOT rule).

## 3. Định nghĩa «danh mục hàng đã đầy đủ» — CẦN CHỐT

Đề xuất dùng lại `nhomGioiThieuCanhBao(nhom)` cho nhất quán với cảnh báo ở hub. Loại hàng **đầy đủ** khi:

- có **ảnh** (`anhId` hoặc `anhPhuIds`), **và**
- có **≥1 mẫu** (`soMau > 0`), **và**
- có **giá mặc định** (`giaMacDinh != null`).

→ `dayDu = nhomGioiThieuCanhBao(nhom).length === 0`.

Phương án mở rộng (chờ user chọn):
- **A (khuyến nghị):** đúng 3 điều kiện trên.
- **B:** thêm điều kiện kiosk sẵn sàng (`danhGiaGioiThieuKiosk(...) === ok`) — chặt hơn, có thể khiến nút khó hiện.
- **C:** thêm danh mục taxonomy đã xác nhận (`idDanhMuc != null && danhMucXacNhan`).

## 4. Thiết kế thay đổi

### 4.1 Backend / dữ liệu
- **Không đổi schema, không đổi API.** Tận dụng `GET /api/shop/groups/[id]/about` (đã tồn tại) để lấy `lastAt`.
- Cân nhắc perf (chờ user chọn):
  - **Cách 1 (ít rủi ro, khuyến nghị):** client `fetch` `/about` khi mở 1 loại (`activeNhomId` đổi). 1 request nhỏ, có thể `AbortController` khi chuyển loại nhanh.
  - **Cách 2 (tối ưu request):** nhét `gioiThieuLastAt` vào payload nhom lúc load kho (`lib/shop/nhom` + API list) để khỏi request lẻ. Rộng hơn, đụng loader — để phase sau nếu cần.

### 4.2 `ShopKhoClient.tsx`
1. Thêm state: `gioiThieuLastAt: string | null` + `gioiThieuAboutLoading: boolean` (theo `activeNhomId`).
2. `useEffect` khi `activeNhomId` đổi: gọi `/api/shop/groups/{id}/about`, set `lastAt`; cleanup bằng `AbortController`. Reset về `null` khi rời loại.
3. Tính `gioiThieuDayDu = useMemo(() => activeNhom ? nhomGioiThieuCanhBao(activeNhom).length === 0 : false, [activeNhom])`.
4. Truyền 2 prop mới xuống `ShopKhoLoaiMeta`:
   - `gioiThieuVisible={gioiThieuDayDu}` (điều kiện **hiện** nút).
   - `gioiThieuChuaCo={gioiThieuLastAt === null && !gioiThieuAboutLoading}` (điều kiện **highlight**).
5. Sau khi publish (listener `COMPOSE_PUBLISHED_EVENT` / `recordGioiThieuAfterPublish` thành công): set `gioiThieuLastAt = new Date().toISOString()` để **tắt highlight tức thì** (optimistic), không cần refetch.

### 4.3 `ShopKhoLoaiHub.tsx` (`ShopKhoLoaiMeta`)
1. Thêm vào `MetaProps`: `gioiThieuVisible?: boolean`, `gioiThieuChuaCo?: boolean`.
2. Điều kiện render nút đổi từ `onGioiThieu ?` → `onGioiThieu && gioiThieuVisible ?`.
   - Khi chưa đầy đủ: **ẩn hẳn** nút (theo yêu cầu «sẽ xuất hiện»). Cảnh báo thiếu gì vẫn hiển thị ở hub card như cũ, không cần thêm ở đây.
3. Thêm class động: `` `shop-kho-loai-gioi-thieu${kioskWarn ? " is-warn" : ""}${gioiThieuChuaCo ? " is-fresh" : ""}` ``.
4. (Tùy chọn) khi `gioiThieuChuaCo`, thêm 1 chip/nhãn nhỏ «Chưa giới thiệu» cạnh nút — chờ user quyết, mặc định **không** thêm, chỉ hiệu ứng.

### 4.4 CSS `shop-dashboard.css`
1. Thêm keyframe glow/pulse (đặt tên theo convention `shop-kho-*`), ví dụ `@keyframes shop-kho-gioi-thieu-pulse` — nhấp nháy border/box-shadow bằng token `--cins-blue`.
2. `.shop-kho-loai-gioi-thieu.is-fresh` → `animation: shop-kho-gioi-thieu-pulse 1.8s ease-in-out infinite;` + nền/đậm hơn để nổi bật.
3. **Ưu tiên `.is-warn` hơn `.is-fresh`** nếu trùng (kiosk cảnh báo màu cam > highlight xanh) — hoặc gộp: khi `is-warn` thì tắt animation để tránh nhiễu.
4. `@media (prefers-reduced-motion: reduce)` → tắt animation, thay bằng viền/box-shadow tĩnh (a11y).
5. Đảm bảo highlight không phá layout `hop-kho-loai-meta-head-actions` (dùng `box-shadow`/`outline`, tránh thay đổi `width/height`).

## 5. Các bước triển khai (đề xuất, mỗi bước 1 commit)

1. **Step 1 — dữ liệu trạng thái:** `ShopKhoClient` fetch `/about` theo `activeNhomId`, thêm state `gioiThieuLastAt` + optimistic sau publish. (No UI change nhìn thấy.)
2. **Step 2 — gating hiển thị:** thêm `gioiThieuVisible` + đổi điều kiện render nút trong `ShopKhoLoaiMeta`; tính `gioiThieuDayDu` bằng `nhomGioiThieuCanhBao`.
3. **Step 3 — highlight:** thêm prop `gioiThieuChuaCo`, class `is-fresh`, keyframe CSS + `prefers-reduced-motion`.
4. **Step 4 — QA + tinh chỉnh** (xem §7).

## 6. Edge cases
- Loại vừa đủ điều kiện xong (thêm ảnh/mẫu/giá) → nút xuất hiện; nếu chưa từng đăng → có highlight.
- Đang load `/about` (chưa biết `lastAt`) → **không** bật highlight (tránh nháy sai), để `gioiThieuChuaCo=false` cho tới khi có dữ liệu.
- Chuyển nhanh giữa các loại → hủy request cũ (`AbortController`), tránh set nhầm `lastAt` của loại trước.
- `/about` lỗi/403 → coi như chưa biết ⇒ không highlight, nút vẫn hiện theo `dayDu` (không chặn thao tác).
- Đã publish nhưng `recordGioiThieuAfterPublish` fail (kiosk/audit lỗi) → highlight vẫn nên tắt (đã có bài) → optimistic set `lastAt` ngay sau khi bài đăng thành công, độc lập với audit.
- Đăng lại lần 2+ → `lastAt != null` → **không** highlight (đúng yêu cầu «chưa có lần nào»).
- Kiosk cảnh báo (`is-warn`) đồng thời chưa giới thiệu → ưu tiên `is-warn`, tắt pulse.

## 7. Kiểm thử / verify
- Loại thiếu ảnh/mẫu/giá → **không** thấy nút. Bổ sung đủ → nút hiện.
- Loại đủ + chưa từng đăng → nút hiện + có pulse. Đăng 1 bài → pulse tắt ngay (optimistic), reload trang vẫn tắt (do `lastAt`).
- Loại đủ + đã từng đăng (dữ liệu cũ có dòng `shop_nhom_gioi_thieu`) → nút hiện, **không** pulse.
- Bật OS «reduce motion» → không animation, chỉ viền tĩnh.
- Mobile ≤480px (nhãn nút bị ẩn) → highlight vẫn nhìn thấy trên icon.
- Không có request `/about` thừa khi ở hub (chưa mở loại nào).

## 8. Rủi ro / lưu ý
- Ẩn hẳn nút có thể khiến seller không biết vì sao thiếu → cảnh báo «thiếu gì» ở hub card (`nhomGioiThieuCanhBao`) đã có, giữ nguyên; cân nhắc tooltip ở meta nếu user muốn.
- Nếu chọn phương án B/C, ngưỡng «đầy đủ» chặt hơn → test kỹ để nút không bị ẩn ngoài ý muốn.
- Tuân rule SSOT: không tạo bảng/cột mới; dùng `shop_nhom_gioi_thieu.tao_luc` sẵn có.

## 9. Tham số đã chốt (2026-08-23)
1. **Định nghĩa «đầy đủ» = Phương án A** — `nhomGioiThieuCanhBao(nhom).length === 0` (đủ **ảnh + ≥1 mẫu + giá mặc định**).
2. **Lấy `lastAt` = Cách 1** — client `fetch` `GET /api/shop/groups/[id]/about` khi `activeNhomId` đổi (có `AbortController`), + optimistic set sau publish. Không đụng loader/payload nhom.
3. **Highlight = Glow mạnh** — `.is-fresh` với box-shadow glow xanh (`--cins-blue`) rõ hơn pulse nhẹ; vẫn tôn trọng `prefers-reduced-motion` (tắt animation, giữ viền/box-shadow tĩnh). Không thêm badge.

## 10. Đã build (2026-08-23)
- `ShopKhoClient.tsx` — state `gioiThieuLastAt` / `gioiThieuAboutKnown`, fetch `/about`, `gioiThieuVisible` + `gioiThieuChuaCo`, optimistic sau publish.
- `ShopKhoLoaiHub.tsx` (`ShopKhoLoaiMeta`) — gate `gioiThieuVisible`, class `is-fresh` (không chồng `is-warn`).
- `shop-dashboard.css` — `@keyframes shop-kho-gioi-thieu-glow` + `.is-fresh` + `prefers-reduced-motion`.
