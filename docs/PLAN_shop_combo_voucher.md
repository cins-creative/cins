# PLAN — Shop: tab «Combo & Voucher»

> Phase: **BUILD xong** (Grok 4.5) · plan 2026-08-07 · build + gap-fill 2026-08-07
> Trigger: tab cấp 1 thứ 6 trên `ShopDashTabs`, gồm 2 tab con **Combo & discount** và **Voucher**.
> Liên quan: `CINS_DEV_RULES.md` §2–§7 · `PLAN_shop_don_van_chuyen.md` (format) · DECISIONS **L33** (shop UGC).
> Migration: `migration_shop_combo_voucher.sql` rồi `migration_shop_don_giam_gia.sql` — **đã chạy** CINs (`npm run migrate:shop-combo-voucher`).
> Test engine: `npm run test:shop-uu-dai`.

---

## 1. Mục tiêu & phạm vi

**Trong scope**

| Hạng mục | Nội dung |
|---|---|
| Tab cấp 1 | «Combo & Voucher» → `/ban-hang/uu-dai` |
| Tab con A | **Combo & discount** — mua đủ tổ hợp → giảm thêm `%` hoặc số tiền cố định. Điều kiện **đa phạm vi**: loại hàng (`shop_nhom`) / mặt hàng (`shop_san_pham`) / biến thể (`shop_bien_the`), trộn tự do trong cùng 1 combo |
| Tab con B | **Voucher** — shop tạo mã, buyer nhập lúc thanh toán; giới hạn số lượng; 2 kiểu design (mặc định hệ thống / design riêng shop) |
| Ví voucher | Buyer **lưu voucher** từ `/cua-hang`; ví hiện trạng thái sống/hết lượt tính runtime |
| Engine giảm giá | Tính **server-side** trong giỏ chung + lúc tạo đơn; client chỉ preview |
| Hub `/cua-hang` | Khu «Săn voucher» — voucher công khai đang chạy, copy mã hoặc lưu vào ví |

**Ngoài scope (phase sau)**

- Voucher toàn sàn do CINs phát hành (hiện chỉ voucher của shop).
- **Giữ chỗ (reserve) lượt voucher khi lưu vào ví** — xem §7, lưu ≠ giữ chỗ.
- Freeship / giảm phí ship (đơn hiện không có `phi_ship` — đã reverse 2026-07-31).

---

## 2. Hiện trạng (đã verify trong code)

| Điểm | Sự thật hiện tại | File |
|---|---|---|
| Tab dashboard | 5 tab, khai báo tập trung ở `TAB_COPY` | `components/shop/ShopDashTabs.tsx:38–71` |
| Shell | `BanHangShell` suy tab từ pathname | `components/shop/BanHangShell.tsx:14–20` |
| Giá 1 dòng | `shopGiaHieuLuc()` = `giaGiam ?? gia` | `lib/shop/types.ts:222–227` |
| Nguồn giá | `shop_bang_gia_dong` (mới nhất) → fallback `shop_nhom.gia_mac_dinh` | `lib/shop/bang-gia.ts:236–274` |
| Giỏ chung | Chỉ lưu `so_luong`; giá resolve **live** mỗi lần đọc | `lib/shop/gio-chung.ts:83–128, 372` |
| Tổng theo seller | `nhom.tongTien += gia × so_luong` | `lib/shop/gio-chung.ts:372` |
| Tạo đơn | `createDonChungForSeller` gọi lại `getGioChung` rồi insert | `lib/shop/don-hang.ts:655–657, 712–716, 743` |
| Server tin client? | **Không** — payload checkout không chứa số tiền | `app/api/shop/gio-chung/don/route.ts` |
| Snapshot CK/QR | `buildThanhToanSnapshot` chứa `tongTien` | `lib/shop/cua-hang.ts:512–528` |
| Phí nền tảng | GMV lấy từ `shop_don_hang.tong_tien` | `lib/shop/phi.ts` |
| Khuyến mãi hiện có | **Chỉ** `shop_bang_gia_dong.gia_giam` (sale per biến thể). Không có bảng voucher/combo | `supabase/sql/migration_shop_bang_gia_gia_giam.sql` |
| Hub `/cua-hang` | Giá hiển thị từ `shop_nhom.gia_mac_dinh`, không có khu khuyến mãi | `lib/shop/cua-hang-listing.ts:116–123` |

**Hệ quả kiến trúc:** vì giá luôn tính lại server-side và không snapshot vào giỏ, engine ưu đãi chỉ cần cắm vào **đúng 2 chỗ**: `getGioChung()` (preview) và `createDonChungForSeller()` (chốt). Không phải sửa rải rác.

---

## 3. Database

### 3.1 Enum mới

```sql
CREATE TYPE public.shop_loai_giam_enum AS ENUM ('phan_tram', 'so_tien');
CREATE TYPE public.shop_voucher_design_enum AS ENUM ('mac_dinh', 'rieng');
CREATE TYPE public.shop_combo_pham_vi_enum AS ENUM ('loai_hang', 'san_pham', 'bien_the');
```

### 3.2 Bảng mới — `shop_combo`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid PK `gen_random_uuid()` | |
| `id_nguoi_dung` | uuid NOT NULL FK → `user_nguoi_dung` | seller |
| `ten` | text NOT NULL | VD «Combo mua 2 tặng giảm» |
| `mo_ta` | text | |
| `loai_giam` | `shop_loai_giam_enum` NOT NULL | |
| `gia_tri` | numeric(18,2) NOT NULL CHECK > 0 | % (1–100) hoặc VND |
| `giam_toi_da` | numeric(18,2) NULL | trần khi `phan_tram` |
| `ap_dung_lap` | boolean NOT NULL DEFAULT false | mua 2× tổ hợp → giảm 2× |
| `bat_dau`, `ket_thuc` | timestamptz NULL | null = không giới hạn |
| `kich_hoat` | boolean NOT NULL DEFAULT true | |
| `thu_tu` | integer NOT NULL DEFAULT 0 | |
| `da_xoa` | boolean NOT NULL DEFAULT false | |
| `tao_luc`, `cap_nhat_luc` | timestamptz DEFAULT now() | |

CHECK: `loai_giam = 'phan_tram'` → `gia_tri <= 100`.

### 3.3 Bảng mới — `shop_combo_dieu_kien` (đa phạm vi)

Một combo có N điều kiện; mỗi điều kiện trỏ tới **loại hàng**, **mặt hàng** hoặc **biến thể**. Trộn tự do: loại×loại, mặt hàng×mặt hàng, loại×mặt hàng đều là dòng của cùng bảng này.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid PK | |
| `id_combo` | uuid NOT NULL FK → `shop_combo` ON DELETE CASCADE | |
| `pham_vi` | `shop_combo_pham_vi_enum` NOT NULL | |
| `id_nhom` | uuid NULL FK → `shop_nhom` | khi `pham_vi = 'loai_hang'` |
| `id_san_pham` | uuid NULL FK → `shop_san_pham` | khi `pham_vi = 'san_pham'` |
| `id_bien_the` | uuid NULL FK → `shop_bien_the` | khi `pham_vi = 'bien_the'` |
| `so_luong` | integer NOT NULL CHECK > 0 | |

```sql
CONSTRAINT shop_combo_dieu_kien_scope_chk CHECK (
  (pham_vi = 'loai_hang'  AND id_nhom IS NOT NULL AND id_san_pham IS NULL AND id_bien_the IS NULL) OR
  (pham_vi = 'san_pham'   AND id_san_pham IS NOT NULL AND id_nhom IS NULL AND id_bien_the IS NULL) OR
  (pham_vi = 'bien_the'   AND id_bien_the IS NOT NULL AND id_nhom IS NULL AND id_san_pham IS NULL)
)
```

**Vì sao 3 cột FK nullable + CHECK, không phải 1 cột `id_muc_tieu` polymorphic:** giữ được FK thật (không mồ côi khi seller xóa mẫu/biến thể) và đúng pattern đã có trong repo — `shop_gio_scope_chk` (`migration_shop_gio_cua_hang.sql`) làm y hệt cho 3 scope giỏ hàng.

Unique riêng từng phạm vi (không dùng UNIQUE gộp vì cột null):

```sql
CREATE UNIQUE INDEX shop_combo_dk_nhom_uk     ON shop_combo_dieu_kien (id_combo, id_nhom)      WHERE id_nhom IS NOT NULL;
CREATE UNIQUE INDEX shop_combo_dk_sp_uk       ON shop_combo_dieu_kien (id_combo, id_san_pham)  WHERE id_san_pham IS NOT NULL;
CREATE UNIQUE INDEX shop_combo_dk_bt_uk       ON shop_combo_dieu_kien (id_combo, id_bien_the)  WHERE id_bien_the IS NOT NULL;
```

Index đọc: `(id_combo)`.

### 3.3b Thuật toán khớp — luật «một unit, một điều kiện, một combo»

Vấn đề thật không nằm ở schema mà ở **điều kiện chồng nhau**: combo «Loại A ×2 + Sản phẩm X ×1» với X thuộc Loại A. Khách bỏ 3 cái X vào giỏ — nếu đếm hai lần, shop mất tiền oan.

Luật bắt buộc, cài trong `lib/shop/uu-dai.ts`:

1. Quy giỏ hàng về **danh sách unit** (mỗi biến thể × số lượng), mỗi unit mang sẵn `idBienThe`, `idSanPham`, `idNhom`.
2. Trong 1 combo, xét điều kiện theo **thứ tự cụ thể → rộng**: `bien_the` → `san_pham` → `loai_hang`. Điều kiện hẹp khó thỏa nhất nên được cấp unit trước; phần dư mới đắp cho điều kiện rộng. Vừa xác định (deterministic), vừa có lợi cho khách.
3. Unit đã cấp cho một điều kiện thì **không tái sử dụng** cho điều kiện khác trong cùng combo, và không cho combo khác (khớp Q1: mỗi món chỉ hưởng 1 combo).
4. Combo chỉ khớp khi **mọi** điều kiện đủ số lượng. `ap_dung_lap = true` → lặp bước 2–3 tới khi không còn thỏa (chặn cứng 20 lần lặp).
5. Nhiều combo cùng khớp → greedy: sắp combo theo tiền giảm giảm dần (ước lượng lần 1), áp lần lượt trên phần unit còn trống.

Validate lúc tạo combo: nếu 2 điều kiện lồng nhau (mặt hàng X nằm trong loại A) → **cho phép nhưng cảnh báo UI** «Điều kiện lồng nhau — mỗi món chỉ tính cho một điều kiện». Không chặn cứng, vì đây là combo hợp lệ ("mua 2 món bất kỳ loại A, trong đó ít nhất 1 phải là X").

### 3.4 Bảng mới — `shop_voucher`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid PK | |
| `id_nguoi_dung` | uuid NOT NULL FK | seller |
| `ma` | text NOT NULL | uppercase, `[A-Z0-9]{3,20}` |
| `ten`, `mo_ta` | text | |
| `loai_giam` | `shop_loai_giam_enum` NOT NULL | |
| `gia_tri` | numeric(18,2) NOT NULL CHECK > 0 | |
| `giam_toi_da` | numeric(18,2) NULL | trần khi `phan_tram` |
| `don_toi_thieu` | numeric(18,2) NOT NULL DEFAULT 0 | so với **tiền hàng trước giảm** |
| `so_luong_tong` | integer NULL | null = không giới hạn |
| `so_luong_da_dung` | integer NOT NULL DEFAULT 0 | |
| `gioi_han_moi_nguoi` | integer NOT NULL DEFAULT 1 | 0 = không giới hạn |
| `bat_dau`, `ket_thuc` | timestamptz NULL | |
| `kich_hoat` | boolean NOT NULL DEFAULT true | |
| `cong_khai` | boolean NOT NULL DEFAULT true | hiện ở `/cua-hang` để "săn" |
| `design_kieu` | `shop_voucher_design_enum` DEFAULT `'mac_dinh'` | |
| `design_anh_id` | text NULL | Cloudflare Images (nền voucher riêng) |
| `design_mau_nen`, `design_mau_chu` | text NULL | hex `#RRGGBB`, validate regex |
| `design_nhan` | text NULL | nhãn ngắn in trên thẻ (≤ 24 ký tự) |
| `da_xoa` | boolean NOT NULL DEFAULT false | |
| `tao_luc`, `cap_nhat_luc` | timestamptz | |

Unique: `CREATE UNIQUE INDEX shop_voucher_ma_uk ON shop_voucher (id_nguoi_dung, ma) WHERE da_xoa = false;`
Index săn voucher: `(cong_khai, kich_hoat, ket_thuc) WHERE da_xoa = false`.

### 3.5 Bảng mới — `shop_voucher_su_dung`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid PK | |
| `id_voucher` | uuid NOT NULL FK → `shop_voucher` | |
| `id_nguoi_dung` | uuid NOT NULL | buyer |
| `id_don_hang` | uuid NOT NULL **UNIQUE** FK → `shop_don_hang` | 1 đơn ≤ 1 voucher |
| `tien_giam` | numeric(18,2) NOT NULL | |
| `tao_luc` | timestamptz | |

Index: `(id_voucher, id_nguoi_dung)` — check `gioi_han_moi_nguoi`.

### 3.5b Bảng mới — `shop_voucher_luu` (ví voucher của buyer)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid PK | |
| `id_voucher` | uuid NOT NULL FK → `shop_voucher` ON DELETE CASCADE | |
| `id_nguoi_dung` | uuid NOT NULL | buyer |
| `tao_luc` | timestamptz DEFAULT now() | |
| UNIQUE | `(id_voucher, id_nguoi_dung)` | lưu lại lần 2 = no-op |

Index: `(id_nguoi_dung, tao_luc DESC)`.

**Lưu ≠ giữ chỗ — và trạng thái không lưu vào DB.** Bảng này chỉ ghi "ai đã nhặt thẻ nào". Mọi trạng thái hiển thị được **tính lúc đọc ví**, không có cột `het_han` / `trang_thai`:

```
conHieuLuc = kich_hoat AND da_xoa = false
             AND (bat_dau IS NULL OR bat_dau <= now())
             AND (ket_thuc IS NULL OR ket_thuc > now())
             AND (so_luong_tong IS NULL OR so_luong_da_dung < so_luong_tong)
             AND (gioi_han_moi_nguoi = 0 OR luotDaDungCuaToi < gioi_han_moi_nguoi)
```

Nhờ vậy đúng yêu cầu: người khác thanh toán hết số lượng → thẻ trong ví mọi người tự chuyển badge «Đã hết lượt» + disable, không cần cron hay job cập nhật. Lý do `so_luong_da_dung` mới là nguồn sự thật duy nhất về lượt: nếu reserve lúc lưu, seller phát 100 mã sẽ bị 100 người "ôm" mà không mua, voucher chết cứng.

Dọn ví: khi đọc, ẩn thẻ đã hết hiệu lực quá **30 ngày** (filter query, không xóa row).

RLS: `USING (id_nguoi_dung = public.current_profile_id())` cho `FOR ALL`.

### 3.6 ⚠️ ALTER bảng cũ — `shop_don_hang` (cần user duyệt, DEV_RULES §1 + rule 6)

| Cột thêm | Kiểu | Ghi chú |
|---|---|---|
| `tong_hang` | numeric(18,2) NULL | tiền hàng **trước** giảm; backfill = `tong_tien` cho đơn cũ |
| `tien_giam_combo` | numeric(18,2) NOT NULL DEFAULT 0 | |
| `tien_giam_voucher` | numeric(18,2) NOT NULL DEFAULT 0 | |
| `id_voucher` | uuid NULL FK → `shop_voucher` ON DELETE SET NULL | |
| `giam_snapshot` | jsonb NULL | tên combo áp dụng, mã voucher, công thức — để hiển thị lại đơn cũ |

**Giữ nguyên ngữ nghĩa `tong_tien` = số tiền buyer thực trả.** Đây là quyết định then chốt: QR/VietQR, `thanh_toan_snapshot.tongTien`, báo cáo doanh thu và phí nền tảng (`lib/shop/phi.ts`) đều đọc `tong_tien` → không phải sửa gì, và phí sàn tự tính trên doanh thu thực. Đơn cũ: `tong_hang = tong_tien`, hai cột giảm = 0 → 0 thay đổi hành vi.

### 3.7 RPC atomic — `shop_dung_voucher`

Theo pattern `migration_shop_tru_kho_atomic.sql`: 1 function `SECURITY DEFINER` nhận `(p_id_voucher, p_id_nguoi_dung, p_id_don_hang, p_tien_giam)`:

```
UPDATE shop_voucher
   SET so_luong_da_dung = so_luong_da_dung + 1
 WHERE id = p_id_voucher
   AND kich_hoat = true AND da_xoa = false
   AND (so_luong_tong IS NULL OR so_luong_da_dung < so_luong_tong)
   AND (bat_dau IS NULL OR bat_dau <= now())
   AND (ket_thuc IS NULL OR ket_thuc > now())
RETURNING 1;
-- 0 row → RAISE 'VOUCHER_HET_LUOT'
INSERT INTO shop_voucher_su_dung (...);
```

`GRANT EXECUTE ... TO service_role`. Chống race 2 buyer giành lượt cuối.

### 3.8 RLS

Seller-owned, copy y `shop_san_pham_owner`:

```sql
CREATE POLICY shop_voucher_owner ON public.shop_voucher
  FOR ALL
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

CREATE POLICY shop_voucher_doc_cong_khai ON public.shop_voucher
  FOR SELECT
  USING (da_xoa = false AND kich_hoat = true AND cong_khai = true);
```

Tương tự cho `shop_combo` (public read khi `kich_hoat`, để buyer thấy gợi ý combo trên storefront). `shop_voucher_su_dung`: chỉ buyer đọc bản ghi của mình + seller đọc theo voucher của mình; ghi chỉ qua service role.

**File migration:** `supabase/sql/migration_shop_combo_voucher.sql` (bảng mới + enum + RPC + RLS) và `supabase/sql/migration_shop_don_giam_gia.sql` (ALTER `shop_don_hang` — tách riêng để duyệt độc lập).

---

## 4. API

### 4.1 Seller — quản lý

| Route | Method | Mục đích |
|---|---|---|
| `/api/shop/combo` | GET | List combo của seller (kèm `dieuKien[]`) |
| `/api/shop/combo` | POST | Tạo combo + điều kiện (transaction) → 201 |
| `/api/shop/combo/[id]` | PATCH | Sửa combo / thay điều kiện |
| `/api/shop/combo/[id]` | DELETE | Soft delete (`da_xoa = true`) |
| `/api/shop/voucher` | GET | List voucher seller (+ `soLuongDaDung`) |
| `/api/shop/voucher` | POST | Tạo → 201; 409 nếu trùng `ma` |
| `/api/shop/voucher/[id]` | PATCH | Sửa (chặn giảm `so_luong_tong` < `so_luong_da_dung`) |
| `/api/shop/voucher/[id]` | DELETE | Soft delete |

Validate: `ma` uppercase 3–20 `[A-Z0-9]`; `phan_tram` → `gia_tri` 1–100; `so_tien` → `gia_tri` > 0; `ket_thuc > bat_dau`; combo phải có ≥ 1 điều kiện và mọi `id_nhom` thuộc seller đó (`truc = 1`, `da_xoa = false`) — nếu không → 422.

### 4.2 Buyer — áp dụng

| Route | Method | Mục đích |
|---|---|---|
| `/api/shop/gio-chung` | GET | **Mở rộng response**: mỗi `nhom` thêm `tongHang`, `giamCombo`, `comboApDung[]`, `tongTien` (sau giảm) |
| `/api/shop/voucher/kiem-tra` | POST | `{ sellerId, ma }` → `{ ok, tienGiam, voucher: {…} }` hoặc lỗi có mã (`VOUCHER_KHONG_TON_TAI` / `HET_HAN` / `HET_LUOT` / `CHUA_DU_TOI_THIEU` / `DA_DUNG` ) |
| `/api/shop/voucher/cong-khai` | GET | `?sellerId=` hoặc không (hub) — voucher công khai đang chạy, cho khu «Săn voucher»; kèm `daLuu` nếu có session |
| `/api/shop/voucher/vi` | GET | Ví của buyer — voucher đã lưu + `conHieuLuc`, `lyDoHetHieuLuc` |
| `/api/shop/voucher/vi` | POST | `{ idVoucher }` → lưu vào ví (idempotent, 200 kể cả đã lưu) |
| `/api/shop/voucher/vi/[id]` | DELETE | Gỡ khỏi ví |
| `/api/shop/gio-chung/don` | POST | **Thêm field** `maVoucher?: string \| null` — server tự tính lại toàn bộ |

**Nguyên tắc:** `/voucher/kiem-tra` chỉ để preview UI. `POST /gio-chung/don` **luôn** validate và tính lại từ đầu; nếu voucher hỏng giữa chừng (hết lượt) → trả 409 + lý do, không âm thầm bỏ giảm giá.

### 4.3 Lib mới — `lib/shop/uu-dai.ts`

Một module thuần, không I/O, dễ test:

```
// Quy dòng giỏ → unit (mỗi unit mang idBienThe / idSanPham / idNhom)
buildUnits(dong: ShopGioChungDong[]): Unit[]

// Khớp đa phạm vi theo luật §3.3b (cụ thể → rộng, một unit một điều kiện)
tinhGiamCombo(units: Unit[], combos: ShopCombo[]): {
  tongHang: number; giamCombo: number;
  apDung: { idCombo, ten, soLan, tien }[]
}

tinhGiamVoucher(tongSauCombo: number, tongHang: number, v: ShopVoucher): number
```

`ShopGioChungDong` hiện đã có `idSanPham` và `idBienThe` (`lib/shop/types.ts:317–323`); cần bổ sung **`idNhom`** vào `resolveBienThe` (`lib/shop/gio-chung.ts:83–128`) để khớp phạm vi loại hàng mà không phải query thêm.

Thứ tự: `tongHang` → trừ combo → trừ voucher → clamp `>= 0` → `tongTien`.
`don_toi_thieu` của voucher so với **`tongHang`** (trước giảm) — đơn giản, dễ giải thích cho buyer.
Làm tròn: `Math.round` về đơn vị đồng ở từng bước.

---

## 5. Frontend

### 5.1 Điều hướng

- Thêm `"uu-dai"` vào `ShopDashTab` + `TAB_COPY` (`href: "/ban-hang/uu-dai"`, label «Combo & Voucher», short «Ưu đãi», icon `TicketPercent` của Lucide).
- `tabFromPath()` trong `BanHangShell.tsx` nhận `/ban-hang/uu-dai`.
- Routes: `app/ban-hang/uu-dai/page.tsx` → `redirect("/ban-hang/uu-dai/combo")`; `…/combo/page.tsx`; `…/voucher/page.tsx`. Cả hai bọc `ShopReadyGate`.
- **Tab con** = 2 link URL (không state) → deep-link + back button đúng. Component `ShopUuDaiSubTabs`, class `.shop-dash-subtabs` / `.shop-dash-subtab` (chưa tồn tại — tạo mới, kế thừa style từ `.shop-kho-nhom-tabs` ở `shop-dashboard.css` ~L727).

### 5.2 Tab con «Combo & discount»

- Danh sách card combo: tên · badge điều kiện (`Loại A ×2 + Mẫu X ×1`, icon khác nhau theo phạm vi) · mức giảm · trạng thái (Đang chạy / Hẹn giờ / Tắt) · toggle `kich_hoat`.
- Dialog tạo/sửa: mỗi dòng điều kiện có **selector phạm vi 3 lựa chọn** (Loại hàng / Mặt hàng / Biến thể) → dropdown tương ứng (`shop_nhom` truc 1 · `shop_san_pham` · `shop_bien_the` của seller) + ô số lượng; nút «Thêm điều kiện». Radio `%` / `Số tiền`; ô trần giảm (chỉ hiện khi `%`); checkbox «Áp dụng bội số»; khoảng thời gian.
- Cảnh báo inline khi phát hiện điều kiện lồng nhau (§3.3b bước validate) — vàng, không chặn submit.
- Preview realtime: «Khách mua đủ → giảm ~X ₫ (ước tính theo giá mặc định)».

### 5.3 Tab con «Voucher»

- Grid **thẻ voucher render đúng như buyer nhìn thấy** — component dùng chung `ShopVoucherCard` (`kieu="mac_dinh" | "rieng"`).
  - `mac_dinh`: token CINS (`--cins-orange` nền, `--radius-md`), răng cưa 2 bên, mã in đậm.
  - `rieng`: nền `design_anh_id` (Cloudflare) hoặc `design_mau_nen`, chữ `design_mau_chu`, nhãn `design_nhan`. Vẫn giữ khung/tỉ lệ chuẩn để layout hub không vỡ.
- Thanh tiến trình `so_luong_da_dung / so_luong_tong`.
- Dialog tạo: mã (nút «Tạo mã ngẫu nhiên»), loại giảm, giá trị, trần, đơn tối thiểu, số lượng, giới hạn mỗi người, thời gian, toggle «Hiện ở trang /cua-hang», và khối **Design** (chọn Mặc định / Riêng → upload ảnh + 2 color picker + live preview thẻ).

### 5.4 Buyer

| Nơi | Thay đổi |
|---|---|
| `ShopGioChungGroup` checkout panel (`components/shop/ShopGioChungButton.tsx` ~`:1346`, trước block «Chuyển khoản tới») | Dòng «Tiền hàng» → «Giảm combo» → khối voucher: **dropdown «Voucher đã lưu»** (lọc voucher của đúng seller đó, kèm badge hết lượt/chưa đủ tối thiểu) + ô nhập mã thủ công → chip mã đã áp + nút gỡ → «Cần thanh toán» đậm |
| QR VietQR (`:996`, `:1047`) + `tongCk` | Dùng số **sau giảm** — bắt buộc, nếu lệch buyer chuyển sai tiền |
| Submit (`:998–1014`) | Gửi kèm `maVoucher`; nếu server trả 409 voucher hỏng → hiện lỗi, giữ giỏ, không tạo đơn |
| Storefront loại hàng | Badge «Combo: mua kèm Loại C ×1 giảm 10%» (đọc từ `/api/shop/cua-hang/mat-hang`, phase 2 nếu cần cắt scope) |
| Chi tiết đơn (buyer + seller) | Hiện dòng giảm từ `giam_snapshot` |

### 5.5 Hub `/cua-hang` — «Săn voucher» + ví

Section mới phía trên grid cửa hàng: carousel ngang các `ShopVoucherCard` công khai đang chạy (mọi shop), mỗi thẻ có tên shop + nút **Lưu** (chuyển thành «Đã lưu» sau khi POST) + **Copy mã** + link tới storefront. Data từ `/api/shop/voucher/cong-khai`, giới hạn 20, sort `ket_thuc` gần nhất. Mobile: scroll ngang, snap, touch ≥ 44px.

**Ví voucher** — tab/toggle «Voucher của tôi» ngay cạnh section trên (chưa đăng nhập → ẩn). Grid `ShopVoucherCard` trạng thái:

| Trạng thái | Hiển thị |
|---|---|
| Còn hiệu lực | Thẻ màu đầy đủ + «Dùng ngay» → storefront shop |
| Hết lượt (`so_luong_da_dung >= so_luong_tong`) | Grayscale + badge «Đã hết lượt» + disable |
| Hết hạn thời gian | Grayscale + badge «Hết hạn» |
| Bạn đã dùng đủ lượt cá nhân | Badge «Bạn đã dùng» |

Trạng thái do server tính (§3.5b), client chỉ render — tránh lệch múi giờ / cache cũ.

### 5.6 Cache client

Thêm vào `lib/shop/client-fetch-cache.ts` bằng `createCachedResource`: `prefetchUuDai` (TTL 60s), đăng ký trong `invalidateShopClientCaches()`, gắn `onDataPrefetch={prefetchUuDai}` vào `TabLink` mới và vào vòng background-warm ở `ShopDashTabs.tsx:578–586`.

---

## 6. Các bước triển khai

| Bước | Nội dung | File chính | Model đề xuất |
|---|---|---|---|
| 1 | Migration 5 bảng mới + 3 enum + RPC + RLS | `supabase/sql/migration_shop_combo_voucher.sql` | Grok 4.5 (Medium) |
| 2 | ⚠️ Migration ALTER `shop_don_hang` (**sau khi user duyệt**) | `supabase/sql/migration_shop_don_giam_gia.sql` | Grok 4.5 |
| 3 | Types + lib server: `ShopCombo`, `ShopVoucher`; `lib/shop/combo.ts`, `lib/shop/voucher.ts`, **`lib/shop/uu-dai.ts` (matcher đa phạm vi §3.3b — nên có unit test)** | `lib/shop/*` | Grok 4.5 |
| 4 | API seller CRUD combo + voucher + ví buyer | `app/api/shop/combo/**`, `app/api/shop/voucher/**` | Grok 4.5 |
| 5 | Cắm engine: `getGioChung` + `createDonChungForSeller` + `buildThanhToanSnapshot` + `/voucher/kiem-tra` | `lib/shop/gio-chung.ts`, `lib/shop/don-hang.ts` | Grok 4.5 (High — đụng tiền) |
| 6 | UI dashboard: tab + 2 tab con + dialog + `ShopVoucherCard` + CSS | `components/shop/**`, `app/ban-hang/uu-dai/**` | Composer 2.5 → Grok nếu >2 file phức tạp |
| 7 | UI buyer checkout: ô voucher + tổng sau giảm + QR | `components/shop/ShopGioChungButton.tsx` | Grok 4.5 |
| 8 | Hub «Săn voucher» + ví voucher ở `/cua-hang` | `components/shop/CuaHang*`, `app/cua-hang/*.css` | Composer 2.5 |

Một brief = một bước. Bước 5 và 7 phải đi liền nhau (nếu chỉ làm 5, buyer chưa thấy giảm; nếu chỉ làm 7, client tính khác server).

---

## 7. Edge cases

| Tình huống | Xử lý |
|---|---|
| Giỏ đổi sau khi đã nhập voucher (bỏ bớt hàng → dưới `don_toi_thieu`) | `getGioChung` trả `voucherKhongConHopLe` → UI tự gỡ chip + báo |
| 2 buyer giành lượt voucher cuối | RPC atomic §3.7 → người sau nhận 409 `VOUCHER_HET_LUOT` |
| Đơn bị **hủy** | Xóa `shop_voucher_su_dung` + `so_luong_da_dung - 1` (trong cùng transaction hủy đơn ở `lib/shop/don-hang.ts`). Ghi rõ: hoàn lượt cả khi seller hủy lẫn buyer hủy |
| Nhiều combo cùng khớp | Chọn **tổ hợp cho tổng giảm lớn nhất**, mỗi món chỉ tính cho 1 combo (greedy, tối đa 20 combo/shop để chặn bùng nổ tổ hợp) — §3.3b bước 5 |
| **Điều kiện lồng nhau** (mặt hàng X thuộc loại A, combo yêu cầu cả hai) | Luật «một unit một điều kiện», gán cụ thể → rộng (§3.3b). Cho phép tạo, cảnh báo vàng ở dialog |
| Combo trộn loại hàng + biến thể của **cùng một mẫu** | Vẫn đúng theo luật trên; biến thể được cấp trước |
| Seller xóa mẫu/biến thể đang là điều kiện combo | FK thật + `da_xoa` → combo hiện badge «Điều kiện lỗi», engine bỏ qua combo đó |
| Buyer lưu voucher rồi người khác dùng hết lượt | Ví tính runtime → badge «Đã hết lượt», disable. **Lưu không giữ chỗ** (§3.5b) |
| Voucher bị seller xóa sau khi buyer đã lưu | `ON DELETE CASCADE` trên `shop_voucher_luu` + soft delete → biến khỏi ví |
| Buyer lưu voucher của shop A, checkout shop B | Dropdown ví ở checkout lọc theo `sellerId` của nhóm; nhập tay mã shop khác → 422 `VOUCHER_KHAC_SHOP` |
| Combo + voucher chồng nhau | Cho phép; combo trước, voucher sau, clamp `>= 0` |
| Giảm > tổng tiền (số tiền cố định lớn) | Clamp `tongTien = 0`; cảnh báo seller khi tạo |
| Loại hàng trong combo bị xóa | Combo tự vô hiệu (join `shop_nhom.da_xoa = false`); dashboard hiện badge «Điều kiện lỗi» |
| Voucher hết hạn giữa lúc thanh toán | Server tính lại lúc `POST don` → 409, không tạo đơn giá sai |
| Đơn cũ trước migration | `tong_hang` backfill = `tong_tien`, `giam_snapshot = null` → UI ẩn dòng giảm |
| Phí nền tảng | Tính trên `tong_tien` (sau giảm) — seller chịu giảm, sàn không thu phí trên phần đã giảm. Xác nhận ở §8 Q3 |
| Giá `gia_giam` (sale bảng giá) đã có sẵn | Là **giá gốc dòng**, combo/voucher chồng lên trên. Không đổi |
| Import Shopee / kiosk / quầy sự kiện | Đều đi qua giỏ chung → tự hưởng ưu đãi, không cần sửa |

---

## 8. Quyết định đã chốt (user duyệt 2026-08-07)

| # | Câu hỏi | Chốt |
|---|---|---|
| Q1 | Nhiều combo khớp cùng lúc | **Chọn tổ hợp giảm nhiều nhất, mỗi món chỉ dùng 1 lần** |
| Q2 | Số voucher / đơn | **1** — `UNIQUE(id_don_hang)` trên `shop_voucher_su_dung` |
| Q3 | Phí nền tảng | **Sau giảm** — tính trên `tong_tien`, không sửa `lib/shop/phi.ts` |
| Q4 | Săn voucher | **Có ví voucher** (`shop_voucher_luu`); lưu **không giữ chỗ**, hết lượt → thẻ trong ví tự vô hiệu (tính runtime) |
| Q5 | ALTER `shop_don_hang` (§3.6) | **Duyệt** — thêm 5 cột, giữ nguyên nghĩa `tong_tien` = tiền buyer trả |
| Q6 | Phạm vi điều kiện combo | **Đa phạm vi**: loại hàng / mặt hàng / biến thể, trộn tự do (§3.3 + §3.3b) |

---

## 9. Verify sau khi build

- [ ] Tạo combo A×2 + C×1 giảm 10% → thêm đúng số lượng vào giỏ → giỏ hiện «Giảm combo», tổng đúng.
- [ ] Bỏ 1 món khỏi giỏ → giảm biến mất ngay, QR đổi theo.
- [ ] `ap_dung_lap = true`, mua A×4 + C×2 → giảm ×2.
- [ ] **Combo lồng nhau:** điều kiện «Loại A ×2 + Mẫu X ×1» (X ∈ A), giỏ có X×3 → khớp đúng **1 lần** (1 unit cho mẫu X, 2 unit còn lại cho loại A), không đếm hai lần.
- [ ] Combo trộn «Biến thể X-đỏ ×1 + Loại B ×1» khớp đúng; đổi sang X-xanh thì không khớp.
- [ ] Xóa mẫu đang là điều kiện → combo hiện «Điều kiện lỗi», giỏ không còn giảm.
- [ ] **Ví:** lưu voucher ở `/cua-hang` → hiện trong ví; tài khoản khác dùng hết lượt cuối → refresh ví thấy «Đã hết lượt» + disable, không cần thao tác gì thêm.
- [ ] Voucher trong ví của shop A không xuất hiện ở dropdown checkout shop B.
- [ ] Voucher `so_luong_tong = 1`: 2 tab cùng submit → 1 đơn thành công, 1 nhận 409, `so_luong_da_dung = 1`.
- [ ] `gioi_han_moi_nguoi = 1`: buyer dùng lần 2 → chặn.
- [ ] Voucher `don_toi_thieu` chưa đạt → báo lỗi rõ, không cho áp.
- [ ] Số trên QR VietQR = `tong_tien` = số ở dòng «Cần thanh toán» = `thanh_toan_snapshot.tongTien`.
- [ ] Hủy đơn → lượt voucher được hoàn.
- [ ] Đơn cũ (trước migration) mở lên bình thường, báo cáo doanh thu không đổi số.
- [ ] Voucher design riêng render đúng ở dashboard, checkout và `/cua-hang`; ảnh lỗi → fallback design mặc định.
- [ ] Mobile 360px: tab con không tràn, ô nhập mã + nút Áp dụng ≥ 44px.
- [ ] RLS: buyer không đọc được voucher `cong_khai = false` của shop khác; không sửa được `so_luong_da_dung`.

---

## 10. Tài liệu cần cập nhật khi build xong

| File | Mục |
|---|---|
| `docs/CINS_IMPLEMENTATION.md` | API `/api/shop/combo`, `/api/shop/voucher*`; lib `uu-dai.ts`; file SQL mới |
| `docs/CINS_DECISIONS.md` | LOG «Shop — combo & voucher (2026-08-…)» + chốt Q1–Q6 + inventory ALTER `shop_don_hang` |
| `docs/CINS_INSTRUCTION.md` | Mục «Thay đổi lớn gần đây» + số bảng logic (+4) |
