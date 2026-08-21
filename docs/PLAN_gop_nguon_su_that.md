# PLAN — Gộp 3 nguồn sự thật lặp (CSĐT + phí + lộ trình khóa)

> **Trạng thái:** Phase A **đã ship** 2026-08-21 (`cover_id` + CSĐT chỉ đọc/ghi `org_chi_nhanh`). Phase B/C chưa làm.  
> Chốt user 2026-08-21: gộp cả 3 cụm.  
> Thứ tự an toàn mỗi cụm: **backfill → deploy code ngừng đọc nguồn cũ → quan sát 1–2 chu kỳ → mới drop.**  
> JSON `cau_hinh.chi_nhanh` CSĐT **chưa xóa** (quan sát). ĐH vẫn dùng JSON.

Một phase / một brief khi build. **Tiếp theo: Phase B (phí) hoặc dọn key JSON CSĐT.**

---

## Nguyên tắc chung

1. Gộp = **một màn hình chỉ đọc một SoT.** UI gần như không đổi.
2. Deploy code (ngừng select/fallback) **trước** drop cột/bảng — tránh Workers isolate lạnh 500.
3. Trước khi tắt fallback: script đối chiếu `COUNT` lệch = 0.
4. Không gộp 6 cặp đã chốt **TÁCH** (giá shop, tag lens, lớp–chi nhánh, metadata bài, nhãn loại, lĩnh vực chính).

---

## Phase A — Chi nhánh CSĐT (làm trước)

### Trên web thực tế

| Màn | Hôm nay | Sau gộp |
|---|---|---|
| `/co-so/[slug]` danh sách chi nhánh + ảnh bìa | Bảng `org_chi_nhanh` **hoặc** JSON `cau_hinh.chi_nhanh` nếu bảng trống | **Chỉ** bảng |
| `/co-so/[slug]/quan-ly/chi-nhanh` | Ghi bảng rồi **chép ngược** JSON + `dia_chi` / `dien_thoai` / `email_lien_he` | Ghi bảng; cột liên hệ org vẫn cache từ chi nhánh đang hoạt động; **ngừng** ghi mảng JSON |
| Card trường/cơ sở (số chi nhánh) | CSĐT: qua page-query (ưu tiên bảng). **ĐH** (`lib/truong/queries.ts`) vẫn JSON — **ngoài phạm vi A** | CSĐT chỉ bảng |

### Database

- SoT: `org_chi_nhanh`.
- **Ảnh bìa chi nhánh hiện chỉ sống trong JSON** (`cau_hinh.chi_nhanh[].cover_id`). Bảng **không có** `cover_id`. Gộp mà không ALTER = **mất ảnh bìa**.
- ALTER đề xuất **A25** (chưa chạy, chờ xác nhận):

| # | Bảng | Đổi | Kiểu | Nullable | Lý do | Dữ liệu cũ |
|---|---|---|---|---|---|---|
| A25 | `org_chi_nhanh` | Thêm `cover_id` | `text` | YES | Ảnh CF của chi nhánh — chuyển khỏi JSON | NULL; backfill từ `cau_hinh.chi_nhanh[].cover_id` theo `id` hoặc khớp `ten`+`dia_chi` |

- **Không** DROP `org_to_chuc.cau_hinh`. Chỉ ngừng đọc/ghi key `chi_nhanh` cho CSĐT. Facebook và field khác trong `cau_hinh` giữ.
- Cột `dia_chi` / `tinh_thanh` / `dien_thoai` / `email_lien_he` trên org: **giữ** (cache trụ sở) — không phải SoT danh sách chi nhánh.

### API / lib

- Đọc CSĐT: `lib/to-chuc/co-so-page-queries.ts`, `co-so-settings.ts` — bỏ `fromJson` fallback sau khi backfill xong.
- Ghi: `lib/co-so/ops-dashboard.ts` `syncPublicContactFromOrgChiNhanh` — vẫn patch cột liên hệ org; **bỏ** `mergeChiNhanhIntoCauHinh`.
- Seed một lần: `seedOrgChiNhanhFromCauHinh` + backfill `cover_id`.
- **Không đụng** `lib/truong/queries.ts` (ĐH) ở Phase A.

### Frontend

- Không đổi component. Cùng `TruongChiNhanh[]`; nguồn fetch đổi.

### Steps

1. Xác nhận ALTER A25 → migration `cover_id` + backfill JSON → bảng (kể cả org chưa có dòng bảng).
2. Code: CSĐT đọc chỉ bảng (kèm `cover_id`); ghi không mirror JSON.
3. Script verify: mọi CSĐT có JSON chi nhánh đều có đủ dòng bảng + cover khớp.
4. Quan sát. **Không** xóa key JSON cho đến khi user xác nhận bước dọn.

### Edge / Security

- Org chỉ có JSON, chưa có dòng bảng → backfill trước, không cắt fallback sớm.
- Khớp cover: ưu tiên `id` trong JSON nếu có; không thì `ten`+`dia_chi`.
- RLS `org_chi_nhanh` giữ nguyên (thành viên org / public đọc đang hoạt động).
- Ảnh CF: chỉ lưu id, không URL tạm.

---

## Phase B — Phí nền tảng (sau A ổn)

### Trên web thực tế

| Màn | Hôm nay | Sau gộp |
|---|---|---|
| Banner `/ban-hang` nợ phí / khóa nhận đơn | `cins_hoa_don` nếu đã có `cins_dich_vu`; không thì `shop_phi_ky` | **Chỉ** `cins_hoa_don` |
| Hub `/thanh-toan` | Đã ưu tiên hub | Không đổi UX; hết fallback kỳ |
| Phí CSĐT (kỳ cơ sở) | Dual-write `org_phi_ky` ↔ `cins_hoa_don` + Sepay legacy đọc kỳ | Chốt / Sepay / tự khai **chỉ** hóa đơn hub |

`shop_phi_dong` / `org_phi_dong` (dòng phát sinh) **không gộp, không drop** — đó là sổ chi tiết, khác grain với hóa đơn kỳ.

### Database

- SoT hóa đơn: `cins_hoa_don` (`nguon_bang` + `nguon_id` map kỳ cũ khi backfill).
- **Giữ** `ma_tham_chieu` cũ (Sepay/QR). Không cấp mã mới cho nợ đang `chua_tra` / `qua_han`.
- Drop `shop_phi_ky` / `org_phi_ky`: **bước cuối**, sau quan sát. Phase B1 chỉ tắt dual-write + fallback đọc.

### API / lib (B1 — không DROP)

- `lib/shop/phi-gate.ts`, `lib/shop/gate.ts`: bỏ nhánh `shop_phi_ky`.
- `lib/billing/sync-hoa-don.ts`, `phan-bo.ts`: ngừng update kỳ khi hub đã ghi.
- `lib/co-so/phi-ky.ts`, `phi-sepay.ts`: chốt kỳ tạo/cập nhật `cins_hoa_don` trước; legacy chỉ backfill.
- `app/api/account/billing/paid-declarations`: bỏ fallback `hoaDonId = org_phi_ky.id`.

### Steps

1. Script: mọi `shop_phi_ky` / `org_phi_ky` còn nợ có đúng 1 `cins_hoa_don` cùng `ma_tham_chieu`.
2. Deploy đọc-chỉ-hub + feature-flag tắt fallback.
3. Quan sát 1 kỳ cron chốt phí + 1 lần Sepay thật/staging.
4. (Riêng brief) DROP bảng kỳ — inventory ALTER/DROP mới, chờ xác nhận.

### Edge / Security

- Seller chưa có `cins_dich_vu` → `ensure-links` tạo dịch vụ + hóa đơn **trước** khi tắt fallback.
- Hai nguồn lệch số tiền → **không** ghi đè hub bằng kỳ; báo script lệch, xử lý tay.
- RLS hub giữ; không mở đọc hóa đơn cross-seller.

---

## Phase C — Lộ trình khóa (sau B hoặc xen kẽ nếu A xong và B chưa sẵn)

### Đính chính grain (quan trọng)

| Bảng | Vai trò | Gộp? |
|---|---|---|
| `org_bai_tap` | Nội dung bài / bài tập (soạn, nộp bài, tiến độ chat) | **Không drop** |
| `org_bo_giao_trinh` + `org_giao_trinh_bai` | Bộ giáo trình: thứ tự + thuộc tính, gắn khóa | SoT lộ trình **mới** |
| `org_giao_trinh` | Lộ trình **cũ per-khóa** (trang public `fetchGiaoTrinh`) | **Bỏ dần** |

Gộp ≠ xóa bài tập. Gộp = **trang khóa public đọc cùng nguồn với chat/bộ giáo trình.**

### Trên web thực tế

| Màn | Hôm nay | Sau gộp |
|---|---|---|
| Trang khóa public — danh sách bài lộ trình | `org_giao_trinh` (`khoa-hoc-detail.ts`) | Bộ gắn khóa → `org_giao_trinh_bai` → `org_bai_tap` |
| Chat lớp / tiến độ / nộp bài | `org_bai_tap` + bộ | Không đổi |
| `/quan-ly` soạn bộ | `org_bo_giao_trinh` | Không đổi; hết phải sửa thêm bản `org_giao_trinh` |

### Database

- Khóa chưa gắn bộ: backfill tạo bộ từ `org_giao_trinh` (map tiêu đề/video → `org_bai_tap` nếu chưa có) rồi `setKhoaBoGiaoTrinh`.
- Drop `org_giao_trinh`: bước cuối, sau khi 0 khóa còn đọc bảng đó.

### API / lib

- `fetchGiaoTrinh` trong `khoa-hoc-detail.ts` → resolve `id_bo` của khóa.
- API `…/giao-trinh` legacy: deprecate, trỏ sang bộ.
- `khoa-lop-xoa.ts`: xóa khóa chỉ dọn junction bộ, không còn xóa `org_giao_trinh` sau drop.

### Steps

1. Audit: khóa nào có `org_giao_trinh` mà chưa có bộ / bộ rỗng.
2. Backfill + trang public đọc bộ (fallback bảng cũ đến khi lệch = 0).
3. Tắt fallback. Quan sát.
4. (Riêng brief) DROP `org_giao_trinh`.

### Edge / Security

- Khóa không có bài public (`visibility`) — map sang `org_bai_tap.visible`.
- Nộp bài FK `org_bai_tap` — không đổi id khi backfill nếu đã có bài khớp.
- Học viên chỉ thấy bài `visible` / thuộc tính bộ cho phép.

---

## Ngoài phạm vi

- Chi nhánh **ĐH** (`cau_hinh` trên `truong_dai_hoc`) — brief riêng nếu muốn.
- 6 cặp TÁCH.
- Đổi UI / copy / i18n.

---

## Brief build tiếp theo

```
PHASE: BUILD Phase A Step 1–2 only
Plan: docs/PLAN_gop_nguon_su_that.md
Chỉ: ALTER A25 (sau xác nhận) + backfill cover + CSĐT đọc/ghi chỉ org_chi_nhanh.
Không: phí, giáo trình, truong/queries, DROP cau_hinh.
```
