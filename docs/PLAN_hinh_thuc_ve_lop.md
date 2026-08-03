# PLAN — Tách "hình thức học" & "địa điểm" từ Khóa xuống Lớp

> Trạng thái: **BUILT** — Phase 0–4 đã ship (junction + lớp chi nhánh + hinhThucs[] + cắt modal khóa + CTA).
> Mục tiêu: Khóa học giữ *danh tính + giáo trình + gói học phí*. Lớp học giữ *hình thức + địa điểm + lịch + giáo viên*.
> Một khóa (VD "Hình họa") có thể có đồng thời lớp Online và lớp Offline.

---

## 0. Vấn đề & mục tiêu

| Việc cần làm | Hiện trạng | Mục tiêu |
|---|---|---|
| Khóa có nhiều lớp khác hình thức | Card khóa chỉ hiện hình thức của **lớp sớm nhất** | Hiện tập hợp: "Online · Offline" |
| Sửa khóa không được phá lớp | Modal khóa ghi đè `hinh_thuc` lớp đầu tiên | Modal khóa không đụng tới lớp |
| Lọc `/tim-khoa-hoc` theo hình thức | So sánh 1 giá trị → bỏ sót khóa có lớp Online nhưng lớp đầu Offline | Match-any trên tập hợp |
| Địa điểm học | Lưu ở meta khóa (`chiNhanhIds`), lớp chỉ nhận phần tử `[0]` | Mỗi lớp tự gắn N chi nhánh |
| Quản lý lớp | Bảng lớp không hiển thị/sửa chi nhánh | Có cột + field chi nhánh |

**Ngoài phạm vi:** `loaiMoHinh` (Theo khóa / Liên tục theo tháng) **giữ nguyên ở khóa** — nó quyết định cách bán gói học phí, không phải cách dạy. Gói học phí & combo giữ nguyên ở khóa.

---

## 1. Điểm khởi đầu (fact đã kiểm chứng)

### DB vốn đã đúng hướng

`hinh_thuc` **chỉ tồn tại trên `org_lop_hoc`**, không có cột nào trên `org_khoa_hoc`. Giá trị `hinhThuc` ở tầng khóa là **derived**, lấy lớp có `ngay_khai_giang` sớm nhất:

- `lib/to-chuc/khoa-hoc.ts:230-266` — `fetchLopMetaForKhoa()` → `mapRowToCard()` gán `hinhThuc: lopMeta.hinhThuc` (L452)
- `lib/to-chuc/khoa-hoc-listing.ts:144-162` — `fetchLopHinhThucForKhoa()`
- `lib/to-chuc/khoa-hoc-og-fetch.ts:75-88` — `fetchFirstHinhThuc()`

Chiều ghi thì ngược: modal khóa chọn hình thức → `upsertLopDauTien()` (`khoa-hoc.ts:308-330`) ghi đè xuống lớp đầu.

### Cột chi nhánh trên lớp là FK đơn

```218:227:supabase/sql/migration_csdt_van_hanh_hoc.sql
ALTER TABLE public.org_lop_hoc
  ADD COLUMN IF NOT EXISTS id_chi_nhanh uuid
    REFERENCES public.org_chi_nhanh(id) ON DELETE SET NULL;
```

`org_lop_hoc` **không có** cột jsonb / `noi_dung_blocks`. Nơi duy nhất set `id_chi_nhanh` trong app là `upsertLopDauTien` với `data.chiNhanhIds?.[0]` (`khoa-hoc.ts:732`) — tức đang **mất** các chi nhánh còn lại.

### Cột `org_lop_hoc` hiện có

`id` · `id_khoa_hoc` · `ma_lop` · `hinh_thuc` · `giao_vien_phu_trach` · `giao_vien_text` · `ngay_khai_giang` · `ngay_du_kien_ket_thuc` (chưa dùng) · `slot_toi_da` · `trang_thai` · `lich_hoc` · `id_chat_phong` · `id_chi_nhanh`

### Nơi tiêu thụ `hinhThuc` cấp khóa (8 điểm)

| File | Dòng | Vai trò |
|---|---|---|
| `lib/to-chuc/khoa-hoc-types.ts` | 68, 94 | `KhoaHocCardData.hinhThuc \| null`, `TaoKhoaHocInput.hinhThuc?` |
| `lib/to-chuc/khoa-hoc-listing.ts` | 33-34, 199-200, 224 | type, label, **searchText haystack** |
| `app/tim-khoa-hoc/_components/khoa-hoc-filters.ts` | 17-22, 132 | `HINH_THUC_OPTIONS`, `k.hinhThuc !== hinhThuc` |
| `app/tim-khoa-hoc/_components/TimKhoaHocKhoaFilterBar.tsx` | 141-154 | `<select>` Hình thức |
| `app/tim-khoa-hoc/_components/KhoaHocListingCard.tsx` | 65-67 | chip `hinhThucLabel` |
| `components/co-so/KhoaHocDetailView.tsx` | 647-649, 734-736 | fact row "Hình thức học" |
| `lib/to-chuc/khoa-hoc-og-fetch.ts` + `khoa-hoc-og-card.tsx` | 152-162 / 20, 209 | OG chip |
| `lib/to-chuc/khoa-hoc-detail-mock.ts` | 85 | mock |

**Không nơi nào coi `hinhThuc` cấp khóa là non-null** — mọi consumer đều guard `? : null / "—"`. Đây là điều kiện thuận lợi lớn: đổi sang mảng rỗng không vỡ runtime.

**`needsDiaChi()`** chỉ có 2 bản: `khoa-hoc.ts:268` và bản duplicate local trong `KhoaHocCreateModal.tsx:105`.

---

## 2. Quyết định đã chốt

| Câu hỏi | Chốt |
|---|---|
| Tạo khóa mới có scaffold lớp đầu không? | **Không.** Modal khóa chỉ còn hồ sơ khóa. Tạo xong → nhắc thêm lớp ở tab Lớp học |
| 1 lớp gắn mấy chi nhánh? | **Nhiều** |
| `loaiMoHinh` ở đâu? | Giữ ở khóa |
| Khóa chưa có lớp nào? | **Ẩn hoàn toàn khỏi catalog công khai** cho tới khi có ít nhất 1 lớp |

### Hệ quả của "ẩn khóa chưa có lớp"

Đây là thay đổi hành vi đáng kể, vì hiện `taoKhoaHoc` luôn sinh lớp đầu nên **mọi khóa đều có lớp** — bỏ `upsertLopDauTien` sẽ tạo ra trạng thái "khóa trần" chưa từng tồn tại.

Cần lọc `hinhThucs.length > 0` (tương đương: có ≥1 lớp chưa huỷ) ở:

- `lib/to-chuc/khoa-hoc-listing.ts` — `loadKhoaHocListing` (nguồn `/tim-khoa-hoc`)
- Trang cơ sở công khai — danh sách khóa của org (`lib/to-chuc/co-so-page-queries.ts`)
- `sitemap` / OG: khóa trần trả 404 hay noindex → **cần chốt khi build Phase 3**

Ngược lại, phía **quản lý** (`KhoaHocQuanLyClient`, tab Khóa học) vẫn phải thấy khóa trần, kèm cảnh báo "Chưa mở lớp — khóa chưa hiển thị công khai". Nếu không, user tạo khóa xong sẽ tưởng mất dữ liệu.

### Cách lưu N chi nhánh / lớp — đã chốt

Bảng junction `org_lop_hoc_chi_nhanh` (PK `(id_lop_hoc, id_chi_nhanh)`).

Cột `org_lop_hoc.id_chi_nhanh` **giữ** làm chi nhánh chính — mỗi lần lưu lớp sync `= chiNhanhIds[0]`.

---

## 3. Database (Phase 0)

```sql
CREATE TABLE IF NOT EXISTS public.org_lop_hoc_chi_nhanh (
  id_lop_hoc    uuid NOT NULL REFERENCES public.org_lop_hoc(id)  ON DELETE CASCADE,
  id_chi_nhanh  uuid NOT NULL REFERENCES public.org_chi_nhanh(id) ON DELETE CASCADE,
  thu_tu        int4 NOT NULL DEFAULT 0,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_lop_hoc, id_chi_nhanh)
);

CREATE INDEX IF NOT EXISTS idx_lop_chi_nhanh_chi_nhanh
  ON public.org_lop_hoc_chi_nhanh (id_chi_nhanh);

ALTER TABLE public.org_lop_hoc_chi_nhanh ENABLE ROW LEVEL SECURITY;
```

**Backfill (idempotent, 2 nguồn):**

1. Từ `org_lop_hoc.id_chi_nhanh` hiện có → 1 dòng junction.
2. Từ meta khóa `chiNhanhIds` (trong `org_khoa_hoc.noi_dung_blocks`) → mọi lớp của khóa đó. **Không làm bằng SQL** (phải parse JSON trong HTML block) — viết script Node một lần: `scripts/backfill-lop-chi-nhanh.mjs`, đọc qua service role, dùng `parseKhoaHocNoiDungBlocks`.

Chỉ backfill cho lớp có `hinh_thuc` ∈ (`truc_tiep`, `ket_hop`).

---

## 4. Lib

### `lib/to-chuc/lop-hoc.ts`

- `LopHocFormInput` thêm `chiNhanhIds?: string[] | null`.
- `validateLopInput`: nếu `hinhThuc` ∈ (`truc_tiep`, `ket_hop`) → yêu cầu ≥1 chi nhánh. `truc_tuyen` → ép rỗng.
- Sau INSERT/UPDATE `org_lop_hoc`: đồng bộ junction (DELETE các id thừa + UPSERT id mới) trong cùng flow, kèm fallback nuốt lỗi nếu bảng chưa tồn tại (theo pattern retry sẵn có cho `lich_hoc` / `giao_vien_text`).
- **Bảo mật:** verify mọi `chiNhanhIds` thuộc đúng `id_to_chuc` của khóa trước khi ghi — chống gán chi nhánh của org khác.
- Set `id_chi_nhanh = chiNhanhIds[0]` để giữ tương thích (nếu chốt phương án giữ cột).

### `lib/to-chuc/lop-hoc-quan-ly.ts` + `-types.ts`

- `LopHocQuanLyRow` thêm `chiNhanh: { id, ten, diaChi }[]`.
- Query junction theo batch `id_lop_hoc IN (...)`, join `org_chi_nhanh`.

### `lib/to-chuc/khoa-hoc.ts`

- **Xóa** `upsertLopDauTien()` khỏi `taoKhoaHoc` (L728) và `capNhatKhoaHoc` (L895). Tạo khóa không còn sinh lớp.
- `fetchLopMetaForKhoa` → trả thêm `hinhThucs: HinhThucLop[]` (distinct, thứ tự `truc_tiep` → `truc_tuyen` → `ket_hop`) thay vì lấy lớp đầu.
- Bỏ `hinhThuc` / `chiNhanhIds` / `diaChiHoc` khỏi `validateTaoInput` / `validateCapNhatInput`; xóa `needsDiaChi`.
- `nhanBanKhoaHoc` (L1109-1197): copy lớp phải copy kèm junction chi nhánh.
- `mapRowToCard`: `hinhThucs` thay `hinhThuc`.

### `lib/to-chuc/khoa-hoc-meta-blocks.ts`

- Bỏ `chiNhanhIds` + section "Địa điểm học" khỏi `buildKhoaHocNoiDungBlocks`.
- `parseKhoaHocNoiDungBlocks` **vẫn đọc** `chiNhanhIds` (read-only, cho script backfill + dữ liệu cũ chưa migrate).

### `lib/to-chuc/khoa-hoc-detail.ts`

- `diaChiFallback` (L257-260) hiện lấy từ khóa → đổi sang lấy từ chi nhánh của chính lớp đó.

### `lib/to-chuc/khoa-hoc-types.ts`

- `KhoaHocCardData`: `hinhThuc` → `hinhThucs: HinhThucLop[]`.
- `TaoKhoaHocInput` / `CapNhatKhoaHocInput`: bỏ `hinhThuc`, `chiNhanhIds`, `diaChiHoc`.

---

## 5. API

| Route | Thay đổi |
|---|---|
| `POST /api/co-so/[id]/khoa-hoc/[khoaId]/lop` | Body nhận `chiNhanhIds?: string[]` |
| `PATCH .../lop/[lopId]` | Như trên |
| `POST /api/co-so/[id]/khoa-hoc` | Bỏ `hinhThuc`, `chiNhanhIds`, `diaChiHoc` khỏi body |
| `PATCH .../khoa-hoc/[khoaId]` | Như trên |
| `GET /api/co-so/[id]/khoa-hoc/dia-diem` | **Giữ nguyên** — đổi consumer từ modal khóa sang modal lớp |

---

## 6. Frontend

### `components/co-so/LopHocEditModal.tsx` — nhận thêm

- Section **Địa điểm** (chỉ hiện khi `hinhThuc` ∈ `truc_tiep` / `ket_hop`): multi-select chi nhánh, tái dùng UI + CSS `.cso-kh-dia-diem-*` vừa làm cho modal khóa, fetch từ endpoint `dia-diem`.
- Hydrate `chiNhanhIds` khi sửa lớp.

### `components/co-so/KhoaHocCreateModal.tsx` — cắt bớt

- Xóa fieldset **Hình thức học** và field **Địa chỉ học** (kèm state `selectedChiNhanhIds`, `diaDiemCatalog`, `matchLegacyDiaChi`, `snapshotDiaChiFromRows`, `needsDiaChi` local L105).
- Modal ngắn đi ~2 section — nên kiểm tra lại chiều cao / scroll sau khi cắt (đã có tiền sử bug scroll ở modal này).
- Sau khi tạo khóa thành công: toast/CTA "Khóa đã tạo — thêm lớp đầu tiên?" dẫn sang tab Lớp học với `khoaId` preset.

### `components/co-so/quan-ly/LopHocQuanLyPanel.tsx`

- Thêm cột **Địa điểm** (chip tên chi nhánh, `truc_tuyen` → "Online").
- Empty state khi khóa chưa có lớp: hiện đã có text phù hợp (L514-524), chỉ cần chỉnh wording nhấn mạnh "khóa chưa mở lớp nào nên chưa hiện hình thức học".

### Hiển thị tập hợp hình thức

| File | Đổi |
|---|---|
| `khoa-hoc-listing.ts` | `hinhThuc/hinhThucLabel` → `hinhThucs[] / hinhThucLabels[]`; haystack `join(" ")` |
| `khoa-hoc-filters.ts:132` | `k.hinhThucs.includes(hinhThuc)` |
| `KhoaHocListingCard.tsx:65` | map ra nhiều chip |
| `KhoaHocDetailView.tsx:647` | fact row join `" · "`, rỗng → "Chưa mở lớp" |
| `khoa-hoc-og-fetch.ts` / `-og-card.tsx` | distinct thay vì `fetchFirstHinhThuc` |
| `khoa-hoc-detail-mock.ts:85` | `hinhThucs: ["truc_tiep"]` |

---

## 7. Thứ tự thực thi

| Phase | Nội dung | Ship độc lập? |
|---|---|---|
| **0** | Migration junction + script backfill | Có — chưa đổi hành vi |
| **1** | Lớp nhận `chiNhanhIds` (lib + API + `LopHocEditModal` + cột panel) | Có — khóa vẫn hoạt động như cũ |
| **2** | Derive `hinhThucs[]` + đổi mọi consumer hiển thị/lọc | Có |
| **3** | Cắt hình thức + địa chỉ khỏi modal khóa; bỏ `upsertLopDauTien` | Cần Phase 1+2 xong |
| **4** | CTA "thêm lớp" sau khi tạo khóa + wording empty state | Có |

Phase 0-1-2 không phá gì; điểm không quay lại được là Phase 3.

---

## 8. Edge case & câu treo

- **Khóa chưa có lớp** → đã chốt: ẩn khỏi catalog công khai (mục 2). Cần chốt thêm khi build: URL khóa trần trả 404 hay 200-noindex.
- **Cột `id_chi_nhanh`:** đã chốt **giữ** làm chi nhánh chính, sync = `chiNhanhIds[0]`.
- Khóa cũ đang có `chiNhanhIds` ở meta nhưng **chưa có lớp nào** → backfill không có đích. Dữ liệu meta giữ nguyên, hiện lại khi user tạo lớp đầu (prefill gợi ý từ meta khóa).
- Nhân bản khóa: bản sao sẽ không còn lớp nếu bỏ `upsertLopDauTien` — nhưng `nhanBanKhoaHoc` copy lớp riêng (L1109+), cần copy kèm junction.
- Lớp `truc_tuyen` không được giữ chi nhánh — xóa junction khi đổi hình thức sang online.
- `ngay_du_kien_ket_thuc` vẫn chưa dùng ở đâu — không đụng tới trong plan này.

## 9. Security

- Verify `chiNhanhIds` cùng `id_to_chuc` với khóa của lớp trước khi ghi junction (service role bỏ qua RLS nên phải check ở TS).
- RLS `org_lop_hoc_chi_nhanh`: bật, chưa cần policy SELECT cho `authenticated` (app đọc qua service role), theo đúng pattern các bảng `org_*` trong `migration_csdt_van_hanh_hoc.sql`.
- Không log id chi nhánh ra client error message.
