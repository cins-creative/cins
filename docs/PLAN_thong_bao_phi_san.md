# PLAN — Điều khoản bán hàng + lịch công bố phí sàn

> Trạng thái: **đã ship** (2026-08-07) — terms A · Settings B · bảng thông báo · trang công khai shop/CSĐT · admin CRUD.
> Liên quan: `lib/shop/terms.ts` · L33 (`CINS_DECISIONS.md`) · `AdminTaiChinhScreen` khối «Phí shop» · `PLAN_thanh_toan_tai_cau_truc.md` · O20.
>
> ### Đã chốt với user (2026-08-07)
>
> | # | Câu | Chốt |
> |---|---|---|
> | 1 | Kênh | **In-app Settings** (mục bán hàng / phí) **+ trang công khai chính sách** |
> | 2 | Re-accept khi đổi % | **Không bắt** tick lại lớp B (ok đề xuất mặc định) |
> | 3 | Lịch P2/P3 trong code | **Không** — có bảng thông báo admin thì **set thủ công** khi tới lúc; bảng chỉ để **hiển thị**, không auto-áp dụng phí |
> | 4 | Phạm vi Settings «Bán hàng» | **Chỉ shop**. CSĐT: **trang chính sách riêng** (công khai), không nhét vào bán hàng |
>
> ## Handoff
>
> ```
> Build PLAN_thong_bao_phi_san.md — Grok 4.5 Medium.
> Settings shop + /chinh-sach/phi-san (shop) + /chinh-sach/phi-csdt (CSĐT).
> Admin lịch = CRUD hiển thị only, không cron đổi tỷ lệ.
> ```

---

## 0. Vì sao phải tư duy lại

Điều khoản hiện tại (`lib/shop/terms.ts`, version `2026-07-18`) đúng **một nửa** L33: CINs không cầm tiền hàng. Nhưng **im lặng hoàn toàn về phí sàn** — trong khi hệ thống đã có:

| Thực tế kỹ thuật | Người bán thấy khi bật shop |
|---|---|
| Shop **5% GMV**, kỳ tháng, trả sau (`shop_ty_le` default 0.05) | Không có trong điều khoản |
| CSĐT ~10% + ngưỡng (dòng dịch vụ khác) | Không liên quan block «Bán hàng» — đúng là không nhồi vào đây |
| Gate nợ → hạn chế nhận đơn | Không nói trước |
| Trọng tài tranh chấp ≠ bảo lãnh thanh toán (L33) | Chỉ nói «không chịu trách nhiệm» chung chung |

Kết quả: seller tick đồng ý mà **không biết sẽ trả gì**, và admin chưa có chỗ **công bố lộ trình** phí (chỉ chỉnh tỷ lệ sống trên `/admin/tai-chinh`).

**Bất biến giữ nguyên:** tiền hàng P2P thẳng TK shop; phí sàn = doanh thu CINs, seller trả ngược — không thu hộ.

---

## 1. Đề xuất cấu trúc nội dung (chốt mặc định nếu user không phản đối)

**Tách 2 lớp version** (đề xuất B — rõ ràng hơn gộp một cục):

| Lớp | File / chỗ hiện | Version riêng | Khi nào bắt tick lại |
|---|---|---|---|
| **A. Điều khoản bán hàng** | `SHOP_TERMS_*` trong Settings «Bán hàng» | bump khi đổi vai trò / P2P / trọng tài | Bật bán hàng lần đầu; re-accept nếu version A đổi |
| **B. Chính sách phí sàn (shop)** | Khối mới trong Settings + hub thanh toán + (tuỳ) trang công khai | bump khi đổi tỷ lệ / kỳ / ngưỡng **đã áp dụng** | Thông báo in-app; **không** bắt re-tick điều khoản A trừ khi user chọn «đổi phí = phải accept lại» |

Lý do tách: phí sẽ đổi theo lộ trình sản phẩm; không muốn mỗi lần chỉnh % buộc seller đọc lại cả đoạn «CINs không chuyển tiền».

---

## 2. Draft copy — Điều khoản bán hàng (lớp A)

> Version đề xuất: `2026-08-07`. Thay `SHOP_TERMS_BODY` sau khi duyệt.

**Tiêu đề:** Điều khoản bán hàng trên CINs

**Nội dung (markdown-ish → lưu plain text như hiện tại):**

```
CINs cung cấp công cụ để bạn trưng bày sản phẩm, quản lý kho, nhận đơn và trao đổi với người mua trên nền tảng.

1. Vai trò của CINs
CINs không phải bên bán, không phải bên mua, và không phải trung gian thanh toán cho tiền hàng.
Tiền hàng người mua chuyển thẳng tới tài khoản người bán (hoặc theo thỏa thuận hai bên ngoài CINs).
CINs không thu hộ, không giữ, không chuyển tiền hàng.

2. Trách nhiệm của hai bên
Thanh toán, giao nhận, đổi trả và chất lượng hàng hóa do người bán và người mua tự thỏa thuận và tự chịu trách nhiệm.
Các nút xác nhận trên CINs (đã chuyển / đã nhận / đóng đơn…) chỉ ghi nhận quyết định của người dùng — không phải cam kết hay bảo đảm của CINs.

3. Tranh chấp
Khi có tranh chấp, CINs có thể hỗ trợ xác minh và đưa ra phán quyết vận hành (cảnh báo, hạn chế, khóa cửa hàng) theo quy chế sàn.
CINs không hoàn tiền hộ và không bảo lãnh thanh toán, vì CINs không cầm tiền hàng.

4. Phí sử dụng nền tảng
Việc bán hàng trên CINs có thể phát sinh phí sàn (phí sử dụng công cụ), do người bán trả ngược cho CINs — tách biệt với tiền hàng.
Chi tiết tỷ lệ, kỳ tính, hạn trả và lộ trình thay đổi được công bố trong «Chính sách phí sàn» và mục Thanh toán trên tài khoản của bạn.
Bật bán hàng đồng nghĩa bạn đã đọc điều khoản này và biết có thể phát sinh phí sàn theo chính sách công bố tại từng thời điểm.

Bằng việc bật chức năng bán hàng, bạn xác nhận đã đọc và đồng ý với các điều khoản trên.
```

**Khác bản cũ:** tách mục rõ; thêm trọng tài ≠ bảo lãnh; **mở cửa** sang chính sách phí mà không nhồi số % vào điều khoản (số % nằm lớp B — dễ đổi).

---

## 3. Draft copy — Chính sách phí sàn hiện tại (lớp B — công bố)

> Đây là **thông báo sản phẩm**, không phải hoá đơn. Số liệu lấy từ `cins_cau_hinh_tai_chinh` lúc render (không hardcode 5% trong UI nếu đã có DB).

### 3.1 Nội dung «hiện đang áp dụng» (shop)

| Hạng mục | Giá trị đề xuất hiển thị (đúng hệ thống hôm nay) |
|---|---|
| Đối tượng | Người bán đã bật bán hàng (shop UGC) |
| Cách tính | % trên GMV đơn đủ điều kiện ghi phí (sau loại trừ hoàn/tranh chấp theo quy tắc kỳ) |
| Tỷ lệ | **Đọc live** từ `shop_ty_le` (fallback 5%) |
| Kỳ | Theo **tháng lịch**, trả sau |
| Xuất kỳ | Có **tối thiểu xuất kỳ** — dưới mức → dồn tháng sau (đọc live `shop_toi_thieu_xuat_ky_vnd`) |
| Ngưỡng kích hoạt | Đọc live `shop_nguong_kich_hoat_vnd` (0 = chốt theo tháng) |
| Thanh toán phí | Chuyển khoản VietQR vào STK CINs + mã CK trên `/tai-khoan/thanh-toan` — **không** trừ từ tiền hàng |
| Khi nợ quá hạn | Có thể hạn chế nhận đơn / hoạt động shop theo gate hiện có |
| Không áp | Phí này **không** phải phí ship, không phải hoa hồng giữ lại từ đơn P2P |

**Câu mở đầu đề xuất (banner / details):**

> *Phí sàn CINs hiện tại cho cửa hàng: **X%** doanh thu hàng tháng (trả sau). CINs không giữ tiền hàng của bạn — bạn trả phí riêng qua mục Thanh toán. Lộ trình thay đổi (nếu có) được công bố trước bên dưới / trên trang chính sách.*

### 3.2 CSĐT

Không nhét vào Settings «Bán hàng». CSĐT đã có luồng phí riêng; lộ trình CSĐT (nếu công bố) là dòng riêng trên cùng bảng lịch admin, filter `doi_tuong = csdt`.

---

## 4. Lộ trình công bố (vận hành — không code cứng ngày)

Mốc P0–P4 dưới đây chỉ là **gợi ý vận hành**. Trong product: admin tạo dòng trên bảng thông báo khi cần → seller/public **chỉ đọc**. Không cron, không tự đổi `shop_ty_le` / `csdt_ty_le` từ lịch.

| Mốc | Việc vận hành (thủ công) |
|---|---|
| **P0** | Ship UI: công bố phí **đang áp dụng** (đọc live config) + trang chính sách |
| **P1** | Trên trang chính sách ghi cam kết: công bố trước ≥30 ngày nếu đổi tỷ lệ đã quyết định |
| **P2+** | Khi có định hướng / đổi số: admin **tạo + công bố** 1 dòng thông báo trên `/admin/tai-chinh` — đủ |

---

## 5. Feature — bảng thông báo + trang chính sách (hiển thị only)

### 5.1 Database (CREATE only) — `cins_phi_thong_bao`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid PK | |
| `doi_tuong` | text | CHECK `shop` \| `csdt` |
| `tieu_de` | text | |
| `noi_dung` | text | |
| `ty_le_du_kien` | numeric nullable | Chỉ hiển thị lộ trình |
| `hieu_luc_du_kien` | date nullable | Ngày dự kiến (nullable = định hướng) |
| `cong_bo_luc` | timestamptz nullable | Null = nháp, chưa hiện public |
| `trang_thai` | text | `nhap` \| `da_cong_bo` \| `huy` |
| `tao_boi` / `tao_luc` / `cap_nhat_luc` | | Audit |

RLS: service-role write; đọc public chỉ qua API filter `trang_thai = da_cong_bo`.

**Không** ALTER `cins_cau_hinh_tai_chinh`. **Không** job áp dụng tỷ lệ từ bảng này.

### 5.2 API

| Route | Ai | Việc |
|---|---|---|
| `GET/POST/PATCH /api/admin/tai-chinh/phi-thong-bao` | Admin tài chính | CRUD + Công bố / Huỷ |
| `GET /api/chinh-sach/phi?doi_tuong=shop\|csdt` | Public | `{ dangApDung, thongBao[] }` — chỉ `da_cong_bo` |

### 5.3 UI

| Chỗ | Nội dung |
|---|---|
| Settings **Bán hàng** | Điều khoản A (shop) + khối B phí shop đang áp dụng + list thông báo `doi_tuong=shop` đã công bố |
| `/chinh-sach/phi-san` | Trang công khai chính sách phí **shop** (đang áp dụng + thông báo) |
| `/chinh-sach/phi-csdt` | Trang công khai chính sách phí **CSĐT** (đang áp dụng từ config CSĐT + thông báo `doi_tuong=csdt`) |
| `/admin/tai-chinh` | Panel «Thông báo phí sàn» — tạo/sửa/công bố theo `doi_tuong`; callout: chỉ hiển thị, đổi % thật ở khối tỷ lệ phía trên |
| Hub thanh toán | Optional 1 dòng nếu có thông báo shop sắp tới (có thể làm sau) |

CSĐT **không** hiện trong Settings «Bán hàng». Founder/CSĐT tìm chính sách qua link trang công khai (và sau này có thể link từ hub thanh toán dòng CSĐT).

### 5.4 Cố ý không làm

- Cron / auto đổi tỷ lệ theo `hieu_luc_du_kien`
- Email hàng loạt
- Bắt re-accept lớp B khi đổi %
- Hardcode ngày P2/P3 trong code

---

## 6. Bảng triển khai code

| # | Bước | Gate |
|---|---|---|
| 1 | Copy lớp A (`terms.ts`) + helper đọc phí live shop/CSĐT | Đã chốt copy hướng |
| 2 | Settings bán hàng: A + B (shop only) | Sau #1 |
| 3 | Migration `cins_phi_thong_bao` + admin CRUD hiển thị | Confirm CREATE |
| 4 | `GET /api/chinh-sach/phi` + trang `/chinh-sach/phi-san` + `/chinh-sach/phi-csdt` | Sau #3 |
| 5 | (Optional) banner hub thanh toán | Sau #4 |

---

## 7. Câu treo

**Không còn** (đã chốt 2026-08-07). Khi Build: confirm slug trang (`/chinh-sach/phi-san` · `/chinh-sach/phi-csdt`) nếu muốn đổi tên.

---

## 8. Tóm tắt một dòng

Điều khoản A (shop) + chính sách phí live + trang công khai shop/CSĐT + bảng thông báo admin **chỉ để hiện** — đổi tỷ lệ thật vẫn thủ công ở khối config; không lịch tự chạy.
