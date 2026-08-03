# PLAN — Hard delete khóa học / lớp học (có guard + Warning)

**Ngày:** 2026-08-04 · **Trạng thái:** đã build · **Scope:** CSĐT `/co-so/[slug]/quan-ly/lop-hoc` + tab khóa trên trang cơ sở

## 1. Vấn đề

Nút thùng rác hiện tại **không xóa** — nó set `trang_thai_khoa_hoc = tam_dung` / `trang_thai = huy`. Hàng vẫn nằm nguyên trong bảng quản lý, nên user tạo nháp / tạo sai không dọn được, phải chịu rác vĩnh viễn.

Thêm một lệch pha: `KhoaHocDeleteConfirm` (tab khóa trang cơ sở) **đã ghi** "sẽ bị xóa vĩnh viễn. Không xóa được nếu khóa đã có lớp hoặc học viên" nhưng API phía sau chỉ soft delete. Copy đang nói dối.

## 2. Mô hình chốt

Tách hẳn hai hành động, không dùng chung một nút:

| Hành động | Ý nghĩa | Cơ chế |
|---|---|---|
| **Tạm dừng** | Ngừng vận hành, vẫn thấy trong danh sách quản lý, khôi phục được | `PATCH` trạng thái (`tam_dung` / `huy`) — **đã có sẵn** |
| **Xóa** | Biến mất khỏi DB. Chỉ cho khi không ràng buộc dữ liệu thật | `DELETE` + guard; bị chặn → **Warning** liệt kê blocker |

**Đổi ngữ nghĩa API:** `DELETE` từ nay là hard delete thật. Soft delete chuyển sang `PATCH` (endpoint đã hỗ trợ `trangThaiKhoaHoc` / `trangThaiLop`). Đây là API nội bộ, không có consumer ngoài → chấp nhận đổi.

## 3. Database

**Không migration, không bảng mới, không cột mới.** Toàn bộ dựa trên FK sẵn có (đã introspect DB thật 2026-08-04).

### FK khi xóa lớp (`org_lop_hoc`)

| Bảng | Cột | Rule | Hệ quả |
|---|---|---|---|
| `org_diem_danh` | `id_lop_hoc` | CASCADE | mất điểm danh |
| `org_lop_hoc_chi_nhanh` | `id_lop_hoc` | CASCADE | mất gắn chi nhánh |
| `user_hoc_vien_lop` | `id_lop_hoc` | SET NULL | ghi danh **còn**, mất liên kết lớp |
| `content_cot_moc` | `id_lop_hoc` | SET NULL | cột mốc còn, mất liên kết lớp |
| `chat_phong` | *(pointer ngược `org_lop_hoc.id_chat_phong`)* | — | **orphan** nếu không dọn tay |

### FK khi xóa khóa (`org_khoa_hoc`)

| Bảng | Rule | Hệ quả |
|---|---|---|
| `org_lop_hoc` | CASCADE | xóa mọi lớp → kéo tiếp cascade của lớp |
| `user_hoc_vien_lop` | CASCADE | **xóa mọi ghi danh** |
| ↳ `org_don_hoc_phi`, `org_ky_hoc`, `org_nop_bai`, `org_tien_do_bai` | CASCADE | **xóa đơn học phí, kỳ học, bài nộp, tiến độ** |
| `org_bai_tap` (→ `org_nop_bai`, `org_tien_do_bai`) | CASCADE | mất giáo trình bài tập |
| `org_giao_trinh` | CASCADE | mất lộ trình |
| `org_goi_hoc_phi_khoa` | CASCADE | mất link gói ↔ khóa |
| `org_combo_thanh_phan` | CASCADE | **combo mất thành phần âm thầm → sai giá** |
| `org_goi_hoc_phi.id_khoa_hoc` | SET NULL | gói còn, mất khóa chính |
| `content_cot_moc.id_khoa_hoc` | SET NULL | cột mốc còn, **mất bằng chứng "học ở đây"** |

Kết luận: khóa không có lớp **vẫn có thể** có ghi danh (mô hình `lien_tuc_theo_thang` cho `id_lop_hoc = NULL`). Điều kiện "0 lớp" **không đủ**.

## 4. Guard — điều kiện cho phép xóa

### 4.1 Lớp học

**Chặn (blocker)** khi có bất kỳ:

| Blocker | Query | Lý do |
|---|---|---|
| Ghi danh | `user_hoc_vien_lop` where `id_lop_hoc = :lopId` (mọi `trang_thai`) | HV thật |
| Đơn đã nhận tiền | `org_don_hoc_phi` join enrollment của lớp, `trang_thai = 'da_nhan_tien'` | sổ sách tiền |
| Chat có nội dung | `chat_tin_nhan` của `org_lop_hoc.id_chat_phong`, `loai_tin <> 'system'` | lịch sử trao đổi thật |

**Cảnh báo (không chặn, hiện trong confirm):** số điểm danh sẽ mất; số cột mốc Journey sẽ mất liên kết lớp.

**Dọn kèm khi xóa:** phòng chat lớp nếu chưa có tin nhắn người dùng (tránh orphan `chat_phong` + `chat_thanh_vien`).

### 4.2 Khóa học

**Chặn** khi có bất kỳ:

| Blocker | Query | Lý do |
|---|---|---|
| Lớp thật | `org_lop_hoc` where `id_khoa_hoc`, loại trừ lớp scaffold | user phải tự xóa từng lớp |
| Ghi danh | `user_hoc_vien_lop` where `id_khoa_hoc` (kể cả `id_lop_hoc IS NULL`) | HV thật — **điểm bạn dễ sót** |
| Đơn đã nhận tiền | `org_don_hoc_phi` join enrollment của khóa, `da_nhan_tien` | sổ sách tiền |
| Combo đang dùng khóa | `org_combo_thanh_phan` where `id_khoa_hoc` | cascade làm combo sai giá |
| Cột mốc đã verify | `content_cot_moc` where `id_khoa_hoc` và đã verify + public | mất bằng chứng nghề (FOUNDATIONS) |

**Cảnh báo:** số bài tập, giáo trình, gói học phí gắn khóa sẽ mất/mất link.

**Dọn kèm:** lớp **scaffold** (`isScaffoldLopDbRow` — mã tự sinh, chưa GV) và **0 ghi danh** được xóa cùng khóa, vì hệ thống tự tạo chứ user không tạo. Nếu scaffold có ghi danh → không còn là scaffold → chặn.

## 5. API

### 5.1 Preflight (mới)

```
GET /api/co-so/:id/khoa-hoc/:khoaId/xoa-preflight
GET /api/co-so/:id/khoa-hoc/:khoaId/lop/:lopId/xoa-preflight
```

Response:

```jsonc
{
  "coTheXoa": false,
  "blockers": [
    { "loai": "ghi_danh", "soLuong": 3, "nhan": "3 học viên đang gắn khóa", "duongDan": "/co-so/abc/quan-ly/hoc-vien?khoaId=..." }
  ],
  "canhBao": [
    { "loai": "bai_tap", "soLuong": 12, "nhan": "12 bài tập sẽ bị xóa" }
  ]
}
```

`duongDan` là điểm mấu chốt của yêu cầu "user biết mà vào xóa ràng buộc" — mỗi blocker phải trỏ đúng màn xử lý.

### 5.2 Hard delete (đổi hành vi)

```
DELETE /api/co-so/:id/khoa-hoc/:khoaId
DELETE /api/co-so/:id/khoa-hoc/:khoaId/lop/:lopId
```

- Chạy **lại** toàn bộ guard server-side (chống TOCTOU — preflight chỉ để hiển thị).
- Còn blocker → **409** + cùng payload `blockers` (UI hiện Warning ngay cả khi user bỏ qua preflight).
- Sạch → xóa row (+ dọn kèm ở §4), trả `{ ok: true }`.

### 5.3 Soft delete (chuyển sang PATCH)

Không thêm endpoint. UI gọi `PATCH` sẵn có với `trangThaiKhoaHoc: "tam_dung"` / `trangThaiLop: "huy"`.

### 5.4 Lib

| File | Thay đổi |
|---|---|
| `lib/to-chuc/khoa-hoc.ts` | `xoaKhoaHoc` → hard delete + guard; tách `kiemTraXoaKhoaHoc()` trả blockers |
| `lib/to-chuc/lop-hoc.ts` | `softDeleteLopHoc` → giữ (dùng cho PATCH path) + thêm `xoaLopHoc()` / `kiemTraXoaLopHoc()` |
| `lib/co-so/lop-chat-phong.ts` | thêm `xoaLopChatPhongNeuTrong()` |

## 6. Frontend

| File | Thay đổi |
|---|---|
| `components/co-so/quan-ly/KhoaHocQuanLyClient.tsx` | tách 2 nút: **Tạm dừng** (Pause icon → PATCH) + **Xóa** (Trash → preflight → modal) |
| `components/co-so/quan-ly/LopHocQuanLyPanel.tsx` | tương tự cho hàng lớp |
| `components/co-so/KhoaHocDeleteConfirm.tsx` | nâng thành modal 2 trạng thái: **có blocker** (Warning + link xử lý, nút xóa disabled) / **sạch** (liệt kê cảnh báo + ô gõ tên khóa để xác nhận) |
| *(mới)* `components/co-so/quan-ly/XoaBlockerList.tsx` | render blockers/cảnh báo dùng chung khóa + lớp |
| `app/co-so/cso-quan-ly.css` | style block Warning; giữ token CINS |

**Xác nhận:** khóa yêu cầu **gõ đúng tên khóa** (theo pattern `ChatGroupManageModal`). Lớp chỉ cần bấm xác nhận — hậu quả nhỏ hơn nhiều.

## 7. Các bước triển khai

| Bước | Nội dung | Ghi chú |
|---|---|---|
| 1 | Lib: `kiemTraXoaLopHoc` + `kiemTraXoaKhoaHoc` (thuần đọc, trả blockers/cảnh báo) | không đụng UI |
| 2 | Lib: `xoaLopHoc`, đổi `xoaKhoaHoc` sang hard delete + dọn phòng chat | |
| 3 | API: 2 route preflight + đổi 2 route DELETE (409 khi có blocker) | |
| 4 | UI: `XoaBlockerList` + nâng `KhoaHocDeleteConfirm` | |
| 5 | UI: tách nút Tạm dừng / Xóa ở 2 client quản lý; chuyển soft delete sang PATCH | |
| 6 | Docs: cập nhật `CINS_IMPLEMENTATION.md` (§API + dòng "Soft delete khóa/lớp") + ghi quyết định vào `CINS_DECISIONS.md` | bắt buộc — dòng 656 IMPLEMENTATION đang mô tả sai sau thay đổi |

Đề xuất chia brief: **bước 1–3** (backend) một lượt, **bước 4–6** một lượt.

## 8. Edge cases

| Tình huống | Xử lý |
|---|---|
| Khóa 0 lớp nhưng có ghi danh liên tục (`id_lop_hoc IS NULL`) | **Chặn** — chính là lỗ hổng của điều kiện "0 lớp" |
| Lớp scaffold tự sinh khi tạo khóa | Không tính là blocker; xóa kèm khóa |
| Đơn `cho_thanh_toan` / `huy` | Không chặn (chưa có tiền), nhưng hiện ở cảnh báo |
| Enrollment `da_bo_hoc` | Vẫn **chặn** — là lịch sử học viên thật |
| Phòng chat lớp chỉ có tin `system` | Xóa kèm lớp |
| Phòng chat lớp có tin người dùng | **Chặn**, hướng user vào xóa/lưu trữ phòng trước |
| Xóa lớp khi khóa đang `tam_dung` | Cho phép — độc lập trạng thái |
| Race: preflight sạch nhưng có HV đăng ký xen giữa | DELETE re-check → 409, UI refresh danh sách |
| User bấm Xóa 2 lần | Lần 2 không thấy row → trả `ok: true` (idempotent) |
| Cột mốc Journey chưa verify gắn khóa | Cảnh báo, SET NULL, không chặn |

## 9. Security

- Quyền: `canViewerManageKhoaHoc` (membership CSĐT, module `khoa-lop`). Admin CINs **không** mở khóa — giữ L23 hẹp.
- Mọi query guard phải scope `id_to_chuc = orgId` **trước** khi đọc/xóa — chặn cross-org qua `khoaId` / `lopId` đoán được. Đây là lỗi dễ mắc nhất của feature này.
- Guard chạy lại ở DELETE, không tin preflight từ client.
- Hard delete không hoàn tác được → confirm gõ tên cho khóa; log actor + đối tượng + số row dọn kèm.
- Preflight không lộ dữ liệu cá nhân: chỉ trả **số lượng** + link, không trả tên/email học viên.

## 10. Không làm trong plan này

- Thùng rác / khôi phục sau xóa (nếu cần thì dùng Tạm dừng).
- Xóa hàng loạt.
- Đổi FK rule trong DB (giữ nguyên CASCADE; guard ở tầng app).
