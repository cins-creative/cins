# PLAN — Phí nền tảng CSĐT (Sepay) + Luồng khách mới → học viên chờ xử lý

> Trạng thái: **Phase A xong (A-1 → A-8)** (2026-08-05). Phase B (lead form) chưa chạy.
> Hai phase độc lập, deploy được riêng.
> Nguồn liên quan: `CINS_DECISIONS.md` L33 (CINs không cầm tiền · phí là doanh thu CINs) · O20 (tỷ lệ phí) · O21 (cron) · `lib/shop/phi.ts` + `lib/shop/gate.ts` (mẫu phí kỳ đã chạy — bám sát).

---

## 0. Quyết định đã chốt với user (2026-08-05)

| Điểm | Chốt |
|---|---|
| Free tier | **Không giới hạn chức năng.** Mọi cơ sở dùng đầy đủ (học viên, điểm danh, phòng học, doanh thu) |
| Tỷ lệ phí | Công khai trước, CINs set theo giai đoạn (khởi điểm **10%** doanh thu học phí ghi nhận) |
| Kích hoạt lần đầu | Khi **phí lũy kế** đạt ngưỡng (khởi điểm **2.000.000₫**) → sinh hóa đơn kỳ đầu |
| Chu kỳ sau đó | Chốt **cuối mỗi tháng**, bắt đầu từ cuối tháng **kế tiếp** tháng kích hoạt (VD kích hoạt 8/3 → chốt 30/4 → 31/5 → 30/6…) |
| Hạn trả | **7 ngày** sau ngày chốt (kỳ 30/4 → hạn 7/5) |
| Quá hạn | Khóa **thêm ghi danh mới**. **Không** cắt phòng học / điểm danh của học viên đang học |
| Thanh toán | Sepay — đối soát chuyển khoản theo mã tham chiếu, tự mở lại quyền khi khớp đủ |
| CK sai mã | Có **khiếu nại** → admin CINs đọc & gán tay vào kỳ |
| Ghi giá thấp để né phí | **Không chống.** Cơ sở tự chịu uy tín (giá nằm trong gói học phí công khai) |
| Khách chưa có tài khoản | **Bắt Google sign-in** mới nhắn được (chống spam). Không làm chat vô danh |
| Form thông tin | **Bắt chọn khóa quan tâm** → tạo ghi danh → vào tab **Chờ xử lý** |

**Bất biến không được phá:** học phí học viên **không** chảy qua CINs. Thứ duy nhất CINs thu là **phí nền tảng do cơ sở trả** (đúng L33 → không phải thu hộ/chi hộ, không cần giấy phép trung gian thanh toán).

### Chốt bổ sung sau khi review plan (2026-08-05)

| # | Câu hỏi treo | Chốt |
|---|---|---|
| 1 | STK nhận phí của CINs | Gom vào **một tab quản trị tài chính** `/admin/tai-chinh`: tỷ lệ %, ngưỡng, STK, thông tin doanh nghiệp CINs. User điền dữ liệu sau → phải là **bảng có UI admin**, không phải env |
| 2 | Credit khi huỷ đơn ở kỳ đã trả | Dùng cột **`dieu_chinh_vnd`** trên `org_phi_ky` |
| 3 | Hóa đơn điện tử | **Chưa làm giai đoạn này**, nhưng thu vào CINs (doanh nghiệp) thì đường nào cũng phải có → **thiết kế sẵn chỗ chứa dữ liệu ngay từ A-1**, chỉ tắt phần xuất |
| 4 | Ngưỡng theo egress phòng học | Cùng chỗ mục 1 — là một tham số trong `/admin/tai-chinh`, mặc định **tắt** |

---

# PHASE A — Phí nền tảng CSĐT

## A1. Database (5 bảng mới, **không ALTER** bảng live)

Đặt tên theo convention `CINS_FOUNDATIONS.md` §4 (tiền tố module + tiếng Việt không dấu).

### `cins_cau_hinh_tai_chinh` — cấu hình nền tảng (nguồn của tab `/admin/tai-chinh`)

Một dòng active (đọc dòng `cap_nhat_luc` mới nhất, mẫu `shop_cau_hinh_phi`). Gom **mọi** tham số tiền của CINs vào đây để user điền một chỗ.

| Nhóm | Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|---|
| khóa | `id` | uuid PK | NO | |
| phí CSĐT | `csdt_ty_le` | numeric(5,4) | NO | 0–1 · khởi điểm `0.1000` |
| | `csdt_nguong_kich_hoat_vnd` | bigint | NO | khởi điểm `2000000` |
| | `csdt_so_ngay_han_tra` | int | NO | default `7` |
| | `csdt_nguong_egress_gb` | int | **YES** | **NULL = tắt** (câu 4) |
| STK nhận phí | `bank_ten` · `bank_so_tk` · `bank_chu_tk` | text | YES | user điền sau; VietQR cần `bank_bin` |
| | `bank_bin` | text | YES | mã BIN ngân hàng cho `buildVietQrImageUrl` |
| DN CINs | `dn_ten_phap_nhan` · `dn_mst` · `dn_dia_chi` · `dn_nguoi_dai_dien` · `dn_email_hoa_don` | text | YES | dữ liệu xuất hóa đơn (câu 3) |
| hóa đơn | `xuat_hoa_don_bat` | boolean | NO | **default false** (giai đoạn này tắt) |
| audit | `cap_nhat_boi` uuid YES · `tao_luc` / `cap_nhat_luc` timestamptz NO | | | |

**Không** lưu secret ở bảng này. `SEPAY_WEBHOOK_SECRET`, token API Sepay, `CSDT_PHI_CRON_SECRET` vẫn ở env (DEV_RULES §2). Env fallback cho tỷ lệ/ngưỡng khi bảng trống: `CSDT_PHI_TY_LE`, `CSDT_PHI_NGUONG_VND`.

> **Không dùng prefix `payment_`** — FOUNDATIONS §13 giữ `payment_*` cho cổng thanh toán org bán khóa/sự kiện sau này; DECISIONS L33 đã có tiền lệ tránh prefix này cho shop. Đây là **phí nền tảng của chính CINs** nên prefix `cins_`.

### `org_phi_dong` — snapshot phí theo từng đơn học phí

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| `id` | uuid PK | NO | |
| `id_to_chuc` | uuid | NO | FK `org_to_chuc.id` |
| `id_don_hoc_phi` | uuid | YES | **ON DELETE SET NULL** — xem cảnh báo dưới |
| `id_ky` | uuid | YES | FK `org_phi_ky.id` ON DELETE SET NULL |
| `doanh_thu_vnd` | bigint | NO | snapshot `so_tien_vnd` lúc xác nhận |
| `ty_le` | numeric(5,4) | NO | snapshot |
| `phi_vnd` | bigint | NO | `round(doanh_thu × ty_le)` |
| `loai_tru` | boolean | NO | default false |
| `ly_do_loai_tru` | text | YES | |
| `xac_nhan_luc` | timestamptz | NO | mốc `da_nhan_tien` → quyết định kỳ |
| `tao_luc` | timestamptz | NO | |

- **UNIQUE `(id_don_hoc_phi)`** khi không null → idempotent, ghi lại không nhân đôi.
- ⚠️ **Vì sao SET NULL chứ không CASCADE:** `org_don_hoc_phi.id_hoc_vien_lop` là CASCADE về `user_hoc_vien_lop` (DECISIONS 2026-08-04). Nếu `org_phi_dong` cũng CASCADE thì **gỡ ghi danh = xóa phí đã tích** → cơ sở có đường né phí. Snapshot phải sống độc lập; mất liên kết đơn thì vẫn giữ số.
- Index `(id_to_chuc, xac_nhan_luc)`, `(id_ky)`.

### `org_phi_ky` — hóa đơn kỳ (roll-up)

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| `id` | uuid PK | NO | |
| `id_to_chuc` | uuid | NO | FK `org_to_chuc.id` |
| `loai_ky` | text | NO | `kich_hoat` \| `thang` |
| `tu_ngay` / `den_ngay` | date | NO | khoảng phí được gộp |
| `ngay_chot` | date | NO | |
| `han_tra` | date | NO | `ngay_chot + so_ngay_han_tra` |
| `doanh_thu_ghi_nhan_vnd` | bigint | NO | |
| `ty_le` | numeric(5,4) | NO | |
| `phi_phai_tra_vnd` | bigint | NO | trước điều chỉnh |
| `dieu_chinh_vnd` | bigint | NO | default 0 · **âm được** — credit từ đơn huỷ ở kỳ trước (câu 2) |
| `da_tra_vnd` | bigint | NO | default 0 — cộng dồn từ `org_phi_thanh_toan` |
| `trang_thai` | text | NO | `chua_tra` \| `da_tra` \| `qua_han` \| `mien` |
| `ma_tham_chieu` | text | NO | **UNIQUE** — nội dung CK Sepay |
| `so_hoa_don` | text | YES | để trống giai đoạn này (câu 3) |
| `xuat_hoa_don_luc` | timestamptz | YES | |
| `hoa_don_thong_tin` | jsonb | YES | **snapshot** bên mua lúc chốt kỳ — xem §A7 |
| `xac_nhan_boi` / `xac_nhan_luc` | uuid / timestamptz | YES | admin gán tay |
| `tao_luc` / `cap_nhat_luc` | timestamptz | NO | |

**Số tiền phải trả thực tế** = `phi_phai_tra_vnd + dieu_chinh_vnd` (kẹp sàn 0). Mọi chỗ so sánh `da_tra_vnd` phải dùng con số này, không dùng `phi_phai_tra_vnd` trần.

UNIQUE `(id_to_chuc, ngay_chot)`. Index `(trang_thai, han_tra)`.

`ma_tham_chieu`: `CINS` + 6 ký tự hash ổn định của `id_to_chuc` + `YYMM` của `ngay_chot`, chữ HOA không dấu, ≤ 25 ký tự (giới hạn nội dung CK ngân hàng). VD `CINS7F3A9C2604`.

### `org_phi_thanh_toan` — giao dịch Sepay

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| `id` | uuid PK | NO | |
| `id_ky` | uuid | YES | NULL = **chưa khớp** (CK sai mã) |
| `id_to_chuc` | uuid | YES | suy từ mã nếu khớp được |
| `sepay_id` | text | NO | **UNIQUE** → webhook idempotent |
| `so_tien_vnd` | bigint | NO | |
| `noi_dung` | text | YES | nội dung CK thô |
| `tai_khoan_nguon` | text | YES | **không** lưu full số TK — mask 4 số cuối |
| `nhan_luc` | timestamptz | NO | |
| `gan_boi` / `gan_luc` | uuid / timestamptz | YES | admin gán tay khi sai mã |
| `tao_luc` | timestamptz | NO | |

### `org_phi_khieu_nai` — khiếu nại đối soát

`id` · `id_to_chuc` (FK) · `id_ky` (FK, YES) · `noi_dung` text · `ma_giao_dich` text YES · `bien_lai_anh_id` text YES (Cloudflare Images) · `trang_thai` (`mo` \| `dang_xu_ly` \| `da_xu_ly` \| `tu_choi`) · `phan_hoi_admin` text YES · `nguoi_tao` uuid · `xu_ly_boi` uuid YES · `tao_luc` / `cap_nhat_luc`.

**RLS:** cơ sở đọc dòng của mình (`org_phi_ky`, `org_phi_dong`, `org_phi_khieu_nai`) qua membership org; ghi chỉ founder tier. `org_phi_thanh_toan` + `cins_cau_hinh_tai_chinh` = **admin/service-role only** (client chỉ thấy STK + tỷ lệ qua API `co-so/[id]/phi`, không SELECT trực tiếp) (không expose `tai_khoan_nguon` ra client). Mọi mutation đi qua service role trong route đã guard, đúng mẫu `lib/shop/phi.ts`.

> **Gate quyền (DEV_RULES §3):** đọc = mọi staff có `hoc-phi-doi-soat` ≥ `xem`; trả phí / khiếu nại = **founder tier** (owner/admin) vì là nghĩa vụ tài chính của tổ chức — giống STK nhận tiền đã siết founder-only.

---

## A2. Lib

### `lib/cins/tai-chinh-config.ts` (thay `phi-config.ts` phần cấu hình)
```
getCinsTaiChinh()        // đọc cins_cau_hinh_tai_chinh dòng mới nhất, cache request-scope
  → { csdt: { tyLe, nguongVnd, soNgayHanTra, nguongEgressGb|null },
      bank: { ten, soTk, chuTk, bin } | null,
      doanhNghiep: { tenPhapNhan, mst, diaChi, nguoiDaiDien, emailHoaDon } | null,
      xuatHoaDonBat }
setCinsTaiChinh(patch, actorId)   // insert dòng mới (giữ lịch sử), không UPDATE tại chỗ
```
DB → env → default. **Không** trả secret. Helper số học giữ ở `lib/co-so/phi-config.ts`: `roundVnd`, `maThamChieu(orgId, ngayChot)`, `cuoiThang(d)`, `hanTra(ngayChot, soNgay)`, `tienPhaiTra(ky)` = `max(0, phi_phai_tra_vnd + dieu_chinh_vnd)`.

### `lib/co-so/phi.ts` — lõi tích lũy
```
ghiPhiDongKhiXacNhanDon({ donId, orgId, doanhThuVnd, xacNhanLuc })
```
Gọi **bên trong `xacNhanDonHocPhi()`** (`lib/co-so/don-hoc-phi.ts`) sau khi UPDATE `cho_thanh_toan → da_nhan_tien` thành công — đúng chỗ đã có ổ khóa một-dòng, nên không nhân đôi. Upsert theo `id_don_hoc_phi`; nếu org đã kích hoạt → gắn luôn `id_ky` của kỳ đang mở, chưa kích hoạt → `id_ky = null`.

```
loaiTruPhiDong(donId, lyDo)      // đơn bị huỷ sau khi đã nhận tiền
// kỳ của dòng chưa chốt → recalcKy trừ thẳng.
// kỳ đã 'da_tra' → KHÔNG sửa kỳ cũ (đã có hóa đơn/giao dịch): cộng credit âm
// vào dieu_chinh_vnd của kỳ đang mở + ghi lý do vào ghi_chu kỳ đó.
tinhPhiLuyKeChuaVaoKy(orgId)     // SUM phi_vnd WHERE id_ky IS NULL AND NOT loai_tru
recalcKy(kyId)                   // SUM dòng → doanh_thu + phi_phai_tra
```

### `lib/co-so/phi-ky.ts` — vòng đời kỳ
```
ensureKyKichHoat(orgId)   // phí lũy kế ≥ ngưỡng → tạo ky loai='kich_hoat', gom mọi dòng id_ky IS NULL
ensureKyThang(orgId, now) // sau kích hoạt: tạo kỳ tháng đã đến ngày chốt (bù nhiều tháng nếu bỏ lỡ)
capNhatTrangThaiKy(orgId) // quá hạn → qua_han; đủ tiền → da_tra
```

**Quy tắc mốc chốt** (khớp ví dụ user): `ngay_kich_hoat = ngày tạo kỳ kích hoạt` (8/3). Kỳ tháng đầu: `tu_ngay = ngay_kich_hoat + 1`, `ngay_chot = cuối tháng (thang(ngay_kich_hoat) + 1)` → 30/4. Sau đó mỗi kỳ `tu_ngay = ngay_chot trước + 1`, `ngay_chot = cuối tháng kế tiếp`. `phi_phai_tra = 0` → `trang_thai = 'mien'` (không bắt CK 0₫).

### `lib/co-so/phi-gate.ts`
```
getCsdtPhiGate(orgId) → {
  trangThai: 'hoat_dong' | 'canh_bao' | 'khoa_ghi_danh',
  kyQuaHan, tongNoVnd, hanTraGanNhat, maThamChieu
}
assertCoTheThemGhiDanh(orgId)   // throw CSDT_PHI_QUA_HAN
```
- `canh_bao`: có kỳ `chua_tra` chưa tới hạn.
- `khoa_ghi_danh`: có kỳ `qua_han`.
- **Không cron cũng đúng:** hàm này gọi `ensureKyThang` + `capNhatTrangThaiKy` **lazy** trước khi trả kết quả (đúng mẫu lazy-purge TTL vừa làm cho tab Chờ xử lý). Cron chỉ để **thông báo**, không phải để đúng logic.

### `lib/co-so/phi-sepay.ts`
`xuLyWebhookSepay(payload)` → upsert theo `sepay_id`; parse `noi_dung` tìm `CINS[A-Z0-9]{10}` → khớp `org_phi_ky.ma_tham_chieu`; cộng `da_tra_vnd`; `da_tra_vnd ≥ phi_phai_tra_vnd` → `da_tra` + thông báo + gate tự mở. Không khớp → lưu `id_ky = null` cho admin đối soát.

---

## A3. API

| Route | Method | Quyền | Việc |
|---|---|---|---|
| `co-so/[id]/phi` | GET | staff `hoc-phi-doi-soat` ≥ xem | Gate + danh sách kỳ + phí lũy kế đang chạy + mã CK kỳ đang nợ |
| `co-so/[id]/phi/khieu-nai` | POST | founder | Mở khiếu nại (nội dung + mã GD + ảnh biên lai) |
| `co-so/[id]/phi/khieu-nai` | GET | founder | Danh sách khiếu nại + phản hồi |
| `webhook/sepay` | POST | `xacThucBearerSecret(req, "SEPAY_WEBHOOK_SECRET")` | Ghi giao dịch, khớp mã, mở gate |
| `internal/csdt-phi/chot-ky` | POST | `xacThucBearerSecret(req, "CSDT_PHI_CRON_SECRET")` | Quét mọi org: `ensureKyKichHoat` + `ensureKyThang` + thông báo (Workers cron sau) — **route thực tế:** `POST /api/noi-bo/csdt-phi/chot-ky` |
| `admin/csdt-phi` | GET | admin CINs | Kỳ chờ/quá hạn · giao dịch chưa khớp · khiếu nại mở |
| `admin/csdt-phi/gan-giao-dich` | POST | admin CINs | Gán giao dịch sai mã vào kỳ (ghi `gan_boi`) |
| `admin/tai-chinh` | GET | `canManageUsers` (super_admin \| admin) | Toàn bộ `cins_cau_hinh_tai_chinh` + lịch sử thay đổi |
| `admin/tai-chinh` | PATCH | **super_admin only** | Sửa tỷ lệ / ngưỡng / STK / thông tin DN / ngưỡng egress → insert dòng mới (kỳ & dòng phí **đã ghi không đổi**) |

**Chèn gate** (chỉ 2 chỗ sinh ghi danh mới):
- `POST /api/co-so/[id]/hoc-vien` (thêm ghi danh) → `assertCoTheThemGhiDanh` → 402 + `{ error, gate }`.
- Route đăng ký khóa phía học viên (`…/khoa-hoc/[khoaId]/dang-ky`) → cùng gate, message hướng về cơ sở.
- **Không** gate: `xac-nhan`, `thu-tien-mat`, `don-chat`, điểm danh, phòng học, giáo trình. Học viên đang học không bị ảnh hưởng, và cơ sở vẫn thu được tiền của HV cũ (nếu chặn cả thu tiền thì họ càng không có tiền trả phí).

---

## A4. Frontend

**Trang mới `/co-so/[slug]/quan-ly/phi`** (nav trong nhóm Doanh thu):
- Thẻ trạng thái: `Đang miễn phí — đã tích X₫ / ngưỡng Y₫` (progress) hoặc `Nợ kỳ 30/4: Z₫ · hạn 7/5`.
- Khối thanh toán: STK CINs + **mã tham chiếu** (nút copy) + QR VietQR có `amountVnd` (lưu ý DECISIONS: `buildVietQrImageUrl` đã hỗ trợ `amountVnd`, chỉ chưa truyền ở checkout shop — ở đây phải truyền).
- Bảng kỳ: kỳ · khoảng · doanh thu ghi nhận · tỷ lệ · phí · đã trả · trạng thái.
- Nút **Khiếu nại** khi đã CK mà kỳ chưa `da_tra`.
- Copy công khai tỷ lệ: “Phí nền tảng = 10% doanh thu học phí **ghi nhận trên CINs**. Học phí học viên chuyển thẳng cho cơ sở — CINs không giữ tiền.”

**Banner gate** trong `/quan-ly` (layout dashboard): `qua_han` → banner đỏ “Đã khóa thêm ghi danh mới — thanh toán kỳ 30/4 để mở lại”, kèm link trang Phí. `canh_bao` → banner vàng.

**`HocVienQuanLyClient`**: khi gate `khoa_ghi_danh` → disable nút **Thêm ghi danh** + tooltip lý do; nếu API trả 402 thì hiện thông báo kèm link trang Phí. Các nút khác giữ nguyên.

**Admin `/admin/csdt-phi`**: 3 tab — Kỳ (chờ/quá hạn) · Giao dịch chưa khớp (gán tay) · Khiếu nại (đọc, phản hồi, gán).

### Admin `/admin/tai-chinh` — nơi user điền mọi thứ về tiền (câu 1 + 4)

Vào sidebar nhóm **Hệ thống** (cạnh `/admin/cai-dat`), map trong `docs/cursor_map_admin.md`. Một trang, 4 khối form, mỗi khối lưu độc lập:

| Khối | Trường | Ảnh hưởng |
|---|---|---|
| **Tỷ lệ & ngưỡng** | `csdt_ty_le` (nhập theo %, lưu decimal) · `csdt_nguong_kich_hoat_vnd` · `csdt_so_ngay_han_tra` | Chỉ áp cho **kỳ/dòng phí tạo sau** khi lưu |
| **Hạ tầng phòng học** | `csdt_nguong_egress_gb` — để trống = **tắt** | Giai đoạn này để trống; khi bật sẽ là điều kiện *thứ hai* kích hoạt kỳ |
| **STK nhận phí** | `bank_ten` · `bank_bin` (select danh sách BIN) · `bank_so_tk` · `bank_chu_tk` | Hiện ở trang Phí của cơ sở + sinh QR VietQR |
| **Doanh nghiệp CINs** | `dn_ten_phap_nhan` · `dn_mst` · `dn_dia_chi` · `dn_nguoi_dai_dien` · `dn_email_hoa_don` · cờ `xuat_hoa_don_bat` | Bên bán trên hóa đơn (§A7) |

Guard: xem = `canManageUsers`; sửa = **super_admin**. Mọi lần lưu insert dòng mới → có lịch sử ai đổi gì lúc nào (bắt buộc `ghi_chu` khi đổi tỷ lệ/ngưỡng, giống mẫu lưu phiên bản công thức feed L30).

Trang Phí của cơ sở đọc STK qua `GET co-so/[id]/phi`; nếu chưa điền STK → **ẩn khối thanh toán**, hiện “CINs đang cập nhật thông tin thanh toán” và **không** đặt kỳ sang `qua_han` trong thời gian đó (không thể đòi tiền khi chưa có chỗ nhận).

---

## A7. Hóa đơn — thiết kế trước, chưa bật (câu 3)

Giai đoạn này `xuat_hoa_don_bat = false`, **không** viết code xuất hóa đơn. Nhưng vì phí nền tảng là doanh thu của pháp nhân CINs, sau này chắc chắn phải xuất hóa đơn GTGT điện tử cho từng kỳ → thứ phải làm **ngay từ A-1** là **giữ đủ dữ liệu để xuất bù**, vì dữ liệu bên mua có thể đổi (cơ sở đổi tên/MST) và không thể tái tạo về sau:

1. **Bên bán** — lấy từ `cins_cau_hinh_tai_chinh` (`dn_*`).
2. **Bên mua** — cơ sở khai trong `/co-so/[slug]/quan-ly/co-so`: `ten_phap_nhan`, `mst`, `dia_chi`, `email_nhan_hoa_don` lưu ở **`org_to_chuc.cau_hinh.hoa_don`** (JSONB — **không ALTER**, cùng cách đã dùng cho `hoc_vien_cho_ttl_ngay`). Không bắt buộc điền ở giai đoạn free; bắt buộc từ lúc kỳ đầu tiên kích hoạt.
3. **Snapshot lúc chốt kỳ** — `org_phi_ky.hoa_don_thong_tin` jsonb ghi bản copy `{ ben_mua, ben_ban, dich_vu, so_luong: 1, don_gia_vnd, thue_suat: null }` tại thời điểm tạo kỳ. Đây là điểm quan trọng nhất: hóa đơn phải phản ánh thông tin **lúc phát sinh**, không phải lúc xuất.
4. **Chỗ điền số hóa đơn** — `so_hoa_don` + `xuat_hoa_don_luc` để trống; khi chưa có tích hợp nhà cung cấp HĐĐT thì kế toán xuất ngoài hệ thống rồi nhập số vào `/admin/csdt-phi` (thêm 1 input, không cần đổi schema).
5. **Diễn giải dịch vụ** cố định, không nhắc học phí: `"Phí sử dụng nền tảng CINs kỳ <tu_ngay>–<ngay_chot>"`. Tránh mọi câu chữ khiến giao dịch trông như thu hộ học phí (giữ L33).
6. **Thuế** — thuế suất và thời điểm xuất (theo lần thu tiền hay theo kỳ) là câu hỏi cho kế toán/thuế, **không tự quyết trong code**; schema để `thue_suat` nullable nên chốt sau không phải migrate.
7. `dieu_chinh_vnd` âm ở kỳ sau, **không sửa kỳ đã `da_tra`** — chính là để hóa đơn đã xuất không bao giờ phải điều chỉnh/hủy.

---

## A5. Thứ tự thi công (Phase A)

1. **A-1** ✅ Migration 5 bảng + RLS + seed (10% / 2tr / 7 ngày · STK & DN trống · `xuat_hoa_don_bat = false`). File: `migration_csdt_phi_nen_tang.sql` · `npm run migrate:csdt-phi` (đã chạy 2026-08-05).
2. **A-1b** ✅ Tab `/admin/tai-chinh` + `lib/cins/tai-chinh-config.ts` + `GET/PATCH /api/admin/tai-chinh` (2026-08-05). User điền STK/DN tại đây.
3. **A-2** ✅ `lib/co-so/phi.ts` + `phi-config.ts` + hook `xacNhanDonHocPhi` (sau ổ khóa flip đơn). Idempotent theo `id_don_hoc_phi`; lỗi ghi phí không chặn xác nhận HV.
4. **A-3** ✅ `lib/co-so/phi-ky.ts` + `phi-gate.ts` — lazy `ensureKyKichHoat` / `ensureKyThang` / `capNhatTrangThaiKy`; gate `hoat_dong|canh_bao|khoa_ghi_danh`; hoãn `qua_han` khi chưa có STK. Hook kích hoạt sau `ghiPhiDong`.
5. **A-4** ✅ `GET /api/co-so/[id]/phi` + `/quan-ly/phi` (nav «Phí CINs») — progress miễn phí / nợ / STK+QR+copy mã · bảng kỳ. Chưa gate.
6. **A-5** ✅ Gate trong `createGhiDanh` + `POST hoc-vien` → 402 · banner `CsdtPhiGateBanner` trên quan-ly · disable «Thêm ghi danh». (Chưa có route tự đăng ký khóa HV — gate sẵn ở lib khi Phase B/form thêm.)
7. **A-6** ✅ Webhook Sepay + `phi-sepay.ts` + `POST /api/webhook/sepay` (Bearer/`Apikey` + `SEPAY_WEBHOOK_SECRET`). Idempotent `sepay_id`; khớp `CINS[A-Z0-9]{10}` → cộng `da_tra_vnd` → đủ thì `da_tra` + noti founders.
8. **A-7** ✅ Khiếu nại founder (`GET/POST …/phi/khieu-nai`) + `/admin/csdt-phi` (3 tab: kỳ nợ · GD chưa khớp + gán tay · khiếu nại) + nhập `so_hoa_don`.
9. **A-8** ✅ `POST /api/noi-bo/csdt-phi/chot-ky` (`CSDT_PHI_CRON_SECRET`) + `phi-cron.ts` — quét org có dòng/kỳ, ensure kích hoạt/tháng, `qua_han`, noti `csdt_phi_den_han` / `csdt_phi_qua_han`. Workers cron cấu hình sau (O21).

---

## A6. Edge case (Phase A)

| Case | Xử lý |
|---|---|
| Đơn `da_nhan_tien` rồi **huỷ** | `loaiTruPhiDong` → `recalcKy`. Kỳ đã `da_tra` → **không hoàn tiền**, cộng credit âm vào `dieu_chinh_vnd` của kỳ đang mở |
| Chưa điền STK trong `/admin/tai-chinh` | Ẩn khối thanh toán, **hoãn** chuyển `qua_han` (không khóa ghi danh vì lỗi của CINs) |
| Gỡ ghi danh (CASCADE xóa đơn) | `org_phi_dong.id_don_hoc_phi` SET NULL, số phí **giữ nguyên** |
| Bỏ lỡ nhiều tháng (không ai mở dashboard) | `ensureKyThang` tạo **bù toàn bộ** kỳ đã tới hạn theo thứ tự |
| CK thừa | `da_tra_vnd > phi_phai_tra` → `da_tra`, phần dư ghi nhận và trừ kỳ sau |
| CK sai mã | `id_ky = null` → khiếu nại → admin gán |
| Cùng lúc 2 webhook trùng | UNIQUE `sepay_id` |
| Đổi tỷ lệ giữa kỳ | Dòng phí snapshot `ty_le` lúc ghi → kỳ cũ không đổi. Kỳ hiển thị `ty_le` bình quân |
| Org bị xóa / đổi loại | `ma_tham_chieu` vẫn giữ; kỳ đọc theo `id_to_chuc` |
| Múi giờ | Mốc chốt theo **VN (UTC+7)** — dùng `todayYmdVn()` đã có trong `lib/co-so/ky-hoc.ts`, không dùng UTC như `shop/phi-config` |
| Trả xong đúng hạn nhưng webhook chậm | Gate mở ngay khi webhook khớp; hạn trả tính theo `nhan_luc` của giao dịch, không phải lúc xử lý |

---

# PHASE B — Khách mới → học viên chờ xử lý

## B1. Luồng đích

1. Khách vào `/co-so/sine-art`, bấm **Nhắn tin** → chưa đăng nhập thì `openAuthModal` (đã có sẵn `useAuthGate` trong `TruongUserChatLauncher`) → **Google 1 tap** → quay lại đúng trang, mở phòng tư vấn `1_org`.
2. Khách hỏi tự do. Staff bấm **Gửi form thông tin** trong `TinNhanQuanLyClient` → card hệ thống trong phòng.
3. Khách bấm card → modal form: **Tên · SĐT · Giai đoạn · Khóa quan tâm (bắt buộc)** (+ lớp nếu khóa có lớp đang mở).
4. Submit → cập nhật profile (`ten_hien_thi`, `so_dien_thoai`, `giai_doan`) + tạo **ghi danh** (`user_hoc_vien_lop`, chưa có kỳ) → xuất hiện ở tab **Chờ xử lý**.
5. Modal đóng, **giữ nguyên phòng chat**, org gửi tin tự động: *“Sine Art cảm ơn bạn đã gửi thông tin, tụi mình sẽ liên hệ bạn qua SĐT hoặc qua chatbox này nhé.”*

> Đổi so với ý ban đầu: **không** điều hướng sang trang cá nhân. Mục tiêu lúc đó là tiếp tục hội thoại; nhảy trang làm đứt mạch và mất ngữ cảnh chat. Muốn giới thiệu Journey thì thêm 1 card gợi ý trong chat.

## B2. Database — **không bảng mới, không ALTER**

- Profile: `user_nguoi_dung.ten_hien_thi`, `so_dien_thoai`, `giai_doan` (cột đã có; kiểm tra tên cột SĐT trực tiếp trên DB trước khi code).
- Ghi danh: `user_hoc_vien_lop` (`id_nguoi_dung`, `id_khoa_hoc`, `id_lop_hoc` nullable, `trang_thai='da_dang_ky'`) — chính là nguồn tab Chờ xử lý.
- Card + tin tự động: `chat_tin_nhan.ngu_canh` (JSON) — thêm 2 `loai` mới, không đổi schema:
  - `ngu_canh.loai = 'form_thong_tin'` → `{ orgId, orgTen, trangThai: 'cho' | 'da_gui', khoaGoiY?: string[] }`
  - Tin cảm ơn = tin org thường (`sendOrgMessageToStudent`), không cần loại riêng.
- Type mới trong `lib/chat/types.ts`: `ChatFormThongTinCard` + field `formThongTin?: ChatFormThongTinCard | null` trên `ChatMessage` (mẫu `phongLop`, `lopBai` đã có).

## B3. API

| Route | Method | Quyền | Việc |
|---|---|---|---|
| `co-so/[id]/tin-nhan/form-thong-tin` | POST | staff `hoc-vien` ≥ sua | Gửi card form vào phòng `1_org` với 1 học viên. **Idempotent**: phòng đã có card `cho` chưa điền → không gửi thêm |
| `co-so/[id]/form-thong-tin` | POST | **user đang đăng nhập** (chính chủ) | Nhận `{ tenHienThi, soDienThoai, giaiDoan, khoaId, lopId? }` → validate → update profile → `createGhiDanh` → đổi card sang `da_gui` → gửi tin cảm ơn từ org |
| `co-so/[id]/khoa-hoc/dang-mo` | GET | user đăng nhập | Danh sách khóa + lớp đang mở để render dropdown trong form (public-safe: chỉ tên/slug) |

Validate backend: tên 1–80 ký tự; SĐT VN chuẩn hoá `^0\d{9,10}$` (bỏ khoảng trắng); `giaiDoan` ∈ enum `giai_doan_enum`; `khoaId` **phải thuộc org này**; `lopId` (nếu có) phải thuộc `khoaId`. Rate limit: tối đa 1 submit / user / org / 60s và ghi danh trùng `(id_nguoi_dung, id_khoa_hoc)` → trả về ghi danh cũ, không lỗi (bảng có UNIQUE theo cặp này).

## B4. Frontend

- **`TinNhanQuanLyClient`** (phía staff): nút **Gửi form thông tin** ở toolbar hội thoại + trạng thái “Đã gửi form · chờ điền”.
- **`CinsChatOverlay`**: render card `form_thong_tin` — tiêu đề “Thông tin học viên”, mô tả ngắn, nút **Điền thông tin** (ẩn nút khi `da_gui`, hiện “Đã gửi ✓”).
- **`CoSoFormThongTinModal`** (mới, client): dùng lại đúng field/UI của `JourneyEditProfileModal` (`j-edit-*` class: `ep-name`, `ep-sdt`, chips giai đoạn) + thêm select **Khóa quan tâm**. Ghi rõ dòng đồng ý: *“Sine Art sẽ thấy tên, SĐT và giai đoạn của bạn để liên hệ tư vấn.”*
- **Tab Chờ xử lý**: thêm nhãn nguồn `Từ chat` cho ghi danh sinh từ form (suy từ việc ghi danh chưa có đơn nào + có phòng `1_org`; nếu muốn chắc thì để Phase B2 sau, **không** thêm cột lúc này).

## B5. Thứ tự thi công (Phase B)

1. **B-1** Kiểm tra tên cột SĐT + enum `giai_doan_enum` trên DB thật. Bổ sung type `ChatFormThongTinCard`.
2. **B-2** `GET khoa-hoc/dang-mo` + `POST co-so/[id]/form-thong-tin` (chưa có UI, test bằng curl).
3. **B-3** `POST tin-nhan/form-thong-tin` (staff gửi card) + render card trong overlay.
4. **B-4** `CoSoFormThongTinModal` + nối submit + tin cảm ơn tự động.
5. **B-5** Nút phía staff trong `TinNhanQuanLyClient` + trạng thái card.
6. **B-6** Rà lại tab Chờ xử lý: TTL tự gỡ (14 ngày) có ảnh hưởng lead không → xem Edge dưới.

## B6. Edge case (Phase B)

| Case | Xử lý |
|---|---|
| **TTL tự gỡ xóa lead** | Lead giờ **là ghi danh thật** nên TTL 14 ngày sẽ gỡ nếu chưa thu tiền. Đây là hành vi **đúng** (dọn phễu nguội) — nhưng phải nói rõ trong UI cấu hình TTL: “gồm cả khách gửi form chưa đóng tiền”. Nếu user muốn giữ lead lâu hơn thì tăng TTL, không cần code thêm |
| Khách chưa từng có tài khoản | Google sign-in → trigger `handle_new_user` tạo profile → chưa có `giai_doan` nên bình thường bị redirect `/onboarding`. **Phải bỏ qua redirect này khi đang trong luồng chat org** (form trong chat đã thay onboarding) — kiểm tra `HomeWorldJourneyMain` chỉ redirect ở trang chủ, xác nhận không chặn `/co-so/*` |
| Khách bỏ dở form | Card giữ `cho`; staff gửi lại không tạo card mới (idempotent) |
| Khách sửa lại thông tin | Cho submit lại: update profile, ghi danh trùng → giữ nguyên, không nhân đôi |
| Chọn khóa không có lớp đang mở | `id_lop_hoc = null` (ghi danh liên tục — hợp lệ theo FOUNDATIONS) |
| Spam mở phòng tư vấn | Rate limit số phòng `1_org` mới / user / ngày; org cần nút chặn user (đề xuất Phase sau, không nằm trong plan này) |
| Gate phí đang `khoa_ghi_danh` | Form submit sẽ **fail 402**. Xử lý: vẫn lưu profile + gửi tin cảm ơn, **không** tạo ghi danh, và báo staff trong chat “chưa tạo được ghi danh — cơ sở đang nợ phí”. Tránh im lặng mất lead |
| SĐT là PII | Không log; không trả về cho user khác; chỉ staff org có quyền `hoc-vien` đọc |

---

## Câu treo — đã chốt hết 4 câu (xem §0). Còn lại chờ dữ liệu / bên ngoài

| Việc | Ai làm | Chặn bước nào |
|---|---|---|
| Điền STK + BIN + chủ TK, thông tin pháp nhân CINs | User, trong `/admin/tai-chinh` sau khi A-1b xong | Khối thanh toán ở A-4 (không chặn migration) |
| Tài khoản Sepay + `SEPAY_WEBHOOK_SECRET` | User tạo, đưa vào env | A-6 |
| Thuế suất & thời điểm xuất HĐĐT, nhà cung cấp hóa đơn | Kế toán CINs | Không chặn — `xuat_hoa_don_bat = false`, schema đã chừa chỗ (§A7) |
| Số GB egress coi là "nhiều" | User, khi có số liệu thật từ phòng học | Không chặn — `csdt_nguong_egress_gb` để NULL |
