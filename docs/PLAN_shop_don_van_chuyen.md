# PLAN — Thông tin đơn vận chuyển (link tracking) trên đơn shop

> **Phase 1 · Planning only** (Opus 5, effort Medium) — không code trong session này.
> **Ngày:** 2026-08-02 · **Trigger:** cột mới trên bảng đơn `ShopDonClient` (`shop-don-sheet`).
> **Liên quan:** DECISIONS *Shop — tự ship, không ĐVVC (2026-07-31)* · `migration_shop_ship_reverse.sql`

---

## 1. Mục tiêu & phạm vi

Sau khi shop tự giao đơn cho ĐVVC bên ngoài (ViettelPost / GHN / GHTK / J&T / SPX…), shop **dán link tracking** vào đơn và lưu. Người mua thấy mục **「Theo dõi đơn hàng」** ngay trong card đơn ở inbox chat.

**Trong phạm vi:** 1 cột DB mới nhóm vận chuyển · API cập nhật · ô nhập ở bảng đơn seller + modal chi tiết · hiển thị cho buyer trong chat card + modal.

**Ngoài phạm vi (không làm):** gọi API carrier, đồng bộ trạng thái vận đơn tự động, webhook, tính phí ship, in vận đơn. Quyết định reverse ĐVVC (2026-07-31) vẫn giữ nguyên — đây chỉ là **ô text do shop tự dán**, không phải integration.

---

## 2. Hiện trạng (đã verify trong code)

| Điểm | Hiện tại |
|---|---|
| Bảng đơn seller | `components/shop/ShopDonClient.tsx` — 9 cột `shop-don-col-*`, **không có inline edit**, click row → `ShopDonDetailModal` |
| API | `app/api/shop/don/[id]/route.ts` PATCH **chỉ nhận `action` enum** (`da_nhan_tien`, `hoan_thanh`, `hoan_tra`, `huy`) — không có PATCH field tự do |
| Data layer | `lib/shop/don-hang.ts` — `DON_SELECT` (danh sách cột cứng), `DonRow`, map → `ShopDonHang` (`lib/shop/types.ts` L456–511) |
| Inbox buyer | Không có inbox riêng — **card đơn trong DM**: `donHangToChatContext()` build `moTa` text → `ChatDonHangCard` parse lại theo dòng |
| Cập nhật card | `bumpDonHangChatMessage()` — update `chat_tin_nhan.ngu_canh` + `tao_luc` + `id_nguoi_gui` ⇒ buyer thấy như tin mới (unread) |
| Cột ship cũ | `dvvc`, `ma_van_don`, `phi_ship`, `van_chuyen_trang_thai`… **đã DROP** (`migration_shop_ship_reverse.sql`) |
| Trạng thái | Enum có `cho_lay_hang`, `dang_giao` nhưng **không action nào chuyển tới** — seller nhảy thẳng `da_nhan_tien` → `hoan_thanh` |
| Auth | Service-role client + check `don.idNguoiBan !== actorId → FORBIDDEN` ở lib (RLS chỉ là lớp 2) |

---

## 3. Database

### 3.1 Cột đề xuất trên `shop_don_hang` (bảng LIVE → cần gate ALTER)

| Cột | Kiểu | Null | Ý nghĩa |
|---|---|---|---|
| `van_chuyen_link` | `TEXT` | ✔ | URL tracking shop dán (http/https, ≤ 500 ký tự) |

**Chỉ 1 cột.** Không thêm `van_chuyen_luc`: thời điểm shop dán link đã có sẵn ở `chat_tin_nhan.tao_luc` (bump) và `ngu_canh.capNhat` — CINs không gọi API carrier nên không có mốc thời gian nào khác của ĐVVC để lưu.

Naming theo convention CINS (tiếng Việt không dấu, prefix nhóm `van_chuyen_`). **Không** tái dùng tên cũ `ma_van_don` / `dvvc` để tránh nhầm với integration ĐVVC đã gỡ.

Tên ĐVVC **suy từ domain** của link (viettelpost · ghn · ghtk · jtexpress · spx · ninjavan…), không lưu cột riêng — theo quyết định «chỉ 1 ô nhập».

Migration idempotent: `supabase/sql/migration_shop_don_van_chuyen.sql` + script `migrate:shop-don-van-chuyen` trong `package.json`.

```sql
ALTER TABLE public.shop_don_hang
  ADD COLUMN IF NOT EXISTS van_chuyen_link TEXT;
COMMENT ON COLUMN public.shop_don_hang.van_chuyen_link IS
  'Link tracking do shop tự dán (CINs không liên kết ĐVVC).';
```

**Index:** không cần — không filter/sort theo cột này.
**RLS:** không đổi policy; `shop_don_hang_doi_tac` UPDATE đã cho buyer OR seller, guard nghiệp vụ nằm ở server (pattern hiện có).

> ⚠️ **Gate bắt buộc (DEV_RULES §1 + DECISIONS L34):** ALTER trên bảng live → phải user xác nhận + ghi inventory ALTER vào `CINS_DECISIONS.md` **trước** khi chạy migration.

### 3.2 Phương án thay thế (nếu không muốn ALTER)

Nhét vào `thanh_toan_snapshot`-style JSONB — **không khuyến nghị**: cột đó là snapshot thanh toán, semantic sai, khó query/hiển thị. Chọn 3.1.

---

## 4. API

### 4.1 Mở rộng `PATCH /api/shop/don/[id]`

Thêm nhánh action mới, giữ nguyên contract `{ don, chatContext }`:

```jsonc
// request
{ "action": "cap_nhat_van_chuyen", "link": "https://..." }
// link = "" ⇒ xóa thông tin vận chuyển
```

**Validate backend (bắt buộc):**

| Kiểm tra | Xử lý khi sai |
|---|---|
| Actor **là seller** của đơn (`idNguoiBan`) | 403 `FORBIDDEN` |
| `link` parse được bằng `new URL()` | 422 «Link không hợp lệ» |
| Protocol ∈ `{http:, https:}` — **chặn `javascript:`, `data:`** | 422 |
| Độ dài link ≤ 500 (trim, slice) | Cắt / 422 |
| Trạng thái đơn ∈ `{da_nhan_tien, cho_lay_hang, dang_giao, da_giao_tai_su_kien}` — **không** cho sửa khi `huy` / `hoan_thanh` / `hoan_tra` / `nhap` / `cho_xac_nhan` | 422 `INVALID_STATE` |

### 4.1b Auto chuyển `dang_giao` (đã chốt)

Lưu link → tự set `trang_thai = 'dang_giao'`, nhưng **chỉ từ** `da_nhan_tien` hoặc `cho_lay_hang`. Từ `dang_giao` / `da_giao_tai_su_kien` → giữ nguyên trạng thái, chỉ lưu link.

> ⚠️ **`cho_xac_nhan` không được nhảy thẳng `dang_giao`:** `confirmDonHang()` là nơi **trừ kho** (`shop_tru_kho_bien_the`, có thể lỗi `STOCK_INSUFFICIENT`). Bỏ qua bước này sẽ để đơn đang giao mà kho chưa trừ. → Trả 422 kèm thông điệp «Xác nhận đơn trước khi cập nhật vận chuyển».

Xóa link **không** đảo trạng thái về `da_nhan_tien` (một chiều, tránh rối pipeline).

Hàm lib mới trong `lib/shop/don-hang.ts`:

```ts
export async function capNhatVanChuyenDonHang(
  actorId: string, donId: string, link: string | null,
): Promise<ShopDonHang>
```

- Update `van_chuyen_link` (+ `trang_thai` nếu đủ điều kiện §4.1b)
- Gọi `bumpDonHangChatMessage()` **chỉ khi thêm/đổi link**; **xóa link → im lặng** (đã chốt), nhưng vẫn cập nhật DB
- Trả `ShopDonHang` đã map (giống các hàm khác)

### 4.2 Cập nhật `DON_SELECT` + types

- `DON_SELECT` += `van_chuyen_link`
- `DonRow` += `van_chuyen_link: string | null`
- `ShopDonHang` (`lib/shop/types.ts`) += `vanChuyenLink: string | null`

---

## 5. Frontend

### 5.1 Bảng đơn seller — `ShopDonClient.tsx` + `shop-dashboard.css`

Thêm cột **`shop-don-col-vc`** — header «Vận chuyển», đặt **giữa `shop-don-col-loai` và `shop-don-col-sp`** (gần thông tin giao hàng), width ~200px.

| Trạng thái ô | Hiển thị |
|---|---|
| Chưa có link | Nút ghost «+ Dán link» (icon `Truck` — Lucide) |
| Đã có link | Tên ĐVVC suy từ domain (viettelpost / ghn / ghtk / jtexpress / spx…), hover → sửa |
| Đang sửa | `<input type="url">` inline, Enter = lưu, Esc = hủy, blur = lưu |

- Click ô phải `stopPropagation()` — row hiện có `onClick → setDetailId`.
- Optimistic update `setItems` giống `actOne()` (L566–590); lỗi → revert + toast. Lưu ý response có thể đổi `trangThai` sang `dang_giao` ⇒ row nhảy tab, cần merge nguyên object trả về.
- Touch target ≥ 44px, `aria-label` rõ («Link theo dõi đơn {maDon}»).
- Đơn `huy` / `hoan_thanh` / `cho_xac_nhan` → ô read-only (kèm tooltip lý do với `cho_xac_nhan`).
- **Mobile:** bảng thành 10 cột — cột này ẩn dưới breakpoint nhỏ (`@media`), seller dùng modal thay thế. Cần kiểm tra tràn ngang ở 360px.

### 5.2 Modal chi tiết — `ShopDonDetailModal.tsx`

Thêm block **「Thông tin đơn vận chuyển」** ngay dưới block «Thông tin nhận hàng» (~L626):

- **Seller:** input link + nút «Lưu» / «Xóa link» (dùng `patch()` sẵn có ở L255).
- **Buyer:** read-only — nút «Theo dõi đơn hàng» (`target="_blank" rel="noopener noreferrer nofollow"`).
- CSS bổ sung vào `shop-don-detail-modal.css`, tái dùng class `shop-don-detail-nhan*`.

### 5.3 Inbox khách hàng (chat card)

Đây là chỗ buyer thấy — **không tạo inbox mới**, mở rộng luồng card đơn có sẵn:

1. **`donHangToChatContext()`** (`don-hang.ts` L1149) — thêm vào `moTa` khi có link:
   ```
   Theo dõi: https://...
   ```
2. **`ChatDonHangCard.tsx`** — `parseDonHangCard()` bắt thêm prefix `Theo dõi:` → render nút **「Theo dõi đơn hàng」** (icon `Truck`) mở tab mới. Dòng này **không** rơi vào `items[]` (parser hiện đẩy mọi dòng lạ vào items — phải thêm nhánh `continue`).
   Đồng thời `parseDonHangCard` cần nhận trạng thái mới **«Đang giao»** (danh sách legacy L49–56 chưa có) — kiểm tra `SHOP_TRANG_THAI_DON_LABEL` khớp nhãn.
3. **`bumpDonHangChatMessage()`** — không đổi logic, tự đẩy card lên unread khi link thay đổi.
4. **`ChatDonCapNhatNotice`** — cân nhắc nhãn «Shop đã cập nhật vận chuyển» (payload `capNhat` trong `donCapNhatPayload`).
5. Link render trong chat phải sanitize lần nữa ở client (chỉ `http/https`) — defense-in-depth với dữ liệu cũ.
6. `ShopMuaHistory.tsx` (lịch sử mua của buyer): hiện badge/nút theo dõi nếu có link.

**Legacy an toàn:** card cũ không có dòng `Theo dõi:` → parser bỏ qua, không vỡ.

---

## 6. Các bước triển khai (đề xuất chia phase build)

| Bước | Nội dung | File | Model đề xuất |
|---|---|---|---|
| 0 | **Xác nhận ALTER** + ghi inventory DECISIONS | `docs/CINS_DECISIONS.md` | — (user) |
| 1 | Migration + script npm | `supabase/sql/migration_shop_don_van_chuyen.sql`, `package.json` | Grok 4.5 |
| 2 | Lib + API: `DON_SELECT`, `DonRow`, types, `capNhatVanChuyenDonHang`, nhánh PATCH | `lib/shop/don-hang.ts`, `lib/shop/types.ts`, `app/api/shop/don/[id]/route.ts` | Grok 4.5 |
| 3 | Chat context + card buyer | `don-hang.ts` (`donHangToChatContext`), `ChatDonHangCard.tsx` | Grok 4.5 |
| 4 | UI seller: cột bảng + modal + CSS | `ShopDonClient.tsx`, `ShopDonDetailModal.tsx`, 2 file CSS | Composer 2.5 |
| 5 | Verify (§9) | — | — |

Bước 1–3 nên **một brief**; bước 4 brief riêng (thuần UI).

---

## 7. Edge cases

- **Link rác / không phải carrier:** không whitelist domain (shop dùng đủ loại) — chỉ validate URL + protocol. Hiển thị domain thật cho buyer tự đánh giá.
- **XSS:** chặn `javascript:`/`data:` ở cả server và client; render bằng `<a href>` (không `dangerouslySetInnerHTML`); `rel="noopener noreferrer nofollow"`.
- **Đơn hủy sau khi đã dán link:** giữ link trong DB (audit), UI buyer ẩn nút theo dõi khi `trangThai = huy`.
- **Sửa link nhiều lần:** chỉ bump chat khi link đổi.
- **Xóa link:** gửi `link: ""` → set NULL, **không bump chat** (đã chốt). Card cũ trong inbox vẫn hiện link cho tới lần bump kế — chấp nhận được; nếu muốn sạch thì lần bump sau sẽ tự ghi đè.
- **Đơn `tai_su_kien` / `truc_tiep`:** **vẫn hiện ô**, không bắt buộc nhập (đã chốt) — shop có thể tự đi giao và vẫn muốn dán link nội bộ.
- **Đơn `da_giao_tai_su_kien`:** cho dán link nhưng **không** đổi trạng thái.
- **Buyer không đăng nhập / khách:** không áp dụng, đơn luôn có buyer profile.
- **Race:** hai tab seller sửa cùng lúc — last-write-wins, chấp nhận (không cần optimistic lock).
- **Card chat chưa tồn tại** (đơn cũ): `bumpDonHangChatMessage` đã fallback tạo mới — hoạt động sẵn.

---

## 8. Quyết định đã chốt (2026-08-02)

| # | Câu hỏi | Chốt |
|---|---|---|
| 1 | Vị trí UI | **Cột thứ 10** trong bảng đơn + block trong modal chi tiết |
| 2 | Số ô nhập | **Chỉ 1 ô link** — tên ĐVVC suy từ domain |
| 3 | Auto `dang_giao` | **Có** — chỉ từ `da_nhan_tien` / `cho_lay_hang`; `cho_xac_nhan` bị chặn (kho chưa trừ) |
| 4 | Xóa link | **Im lặng**, không bump chat |
| 5 | Đơn trực tiếp / sự kiện | **Vẫn hiện ô**, không bắt buộc nhập |
| 6 | Nhãn cho buyer | «Theo dõi đơn hàng» |

**Còn treo:** không — ALTER đã chạy 2026-08-02.

---

## 9. Verify sau khi build

- [ ] Migration chạy 2 lần liên tiếp không lỗi (idempotent).
- [ ] Seller dán link → reload bảng vẫn còn; buyer mở chat thấy card có nút «Theo dõi đơn hàng», click mở đúng URL tab mới.
- [ ] Buyer **không** PATCH được `cap_nhat_van_chuyen` (403); user thứ ba cũng 403.
- [ ] `javascript:alert(1)` → 422, không lưu.
- [ ] Đơn `hoan_thanh` / `huy` → 422 khi sửa link. Đơn `cho_xac_nhan` → 422 kèm thông điệp «Xác nhận đơn trước».
- [ ] Lưu link từ `da_nhan_tien` → đơn nhảy sang tab «Đang giao», nút «Hoàn thành» vẫn hoạt động.
- [ ] Xóa link → buyer **không** nhận tin mới.
- [ ] Card đơn **cũ** (chưa có link) render bình thường, `items[]` không lẫn dòng lạ.
- [ ] Sửa ghi chú (link không đổi) → buyer **không** bị đẩy unread.
- [ ] Mobile 360px: bảng không tràn ngang; touch target ≥ 44px.
- [ ] Không `select('*')`; chỉ thêm cột vào `DON_SELECT`.

---

## 10. Tài liệu cần cập nhật khi build xong

| File | Mục |
|---|---|
| `CINS_DECISIONS.md` | LOG «Shop — link tracking tự dán (2026-08-…)» + **inventory ALTER** `shop_don_hang` |
| `CINS_IMPLEMENTATION.md` | API `PATCH /api/shop/don/[id]` action mới · migration mới · script npm |
| `CINS_INSTRUCTION.md` | Dòng «Thay đổi lớn gần đây» nếu coi là mốc |
