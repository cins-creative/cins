# Brief — Map dữ liệu trang `/truong-dai-hoc/[slug]`

> Dùng khi seed / bulk SQL cho nhiều trường. **Không** bao tab **Bài đăng** (`org_bai_dang`).
> Nguồn UI: `TruongDetailView` · `lib/truong/queries.ts` · schema DB (đọc trực tiếp).

**Route:** `app/truong-dai-hoc/[slug]/page.tsx` → `getTruongPagePayload(slug)` → `TruongDetailView`.

**Tabs (v6):** `01 Bài đăng` *(bỏ qua)* · `02 Ngành đào tạo` · `03 Tuyển sinh` · `04 Hình ảnh` · `05 Đồ án SV`.

**Filter năm chung:** `YearFilterProvider` — gộp năm từ điểm chuẩn, `org_tuyen_sinh_nam`, `org_cau_hinh_khoi`, và **năm lịch** trích từ ngày timeline. Sidebar lịch tuyển sinh dùng subset **năm lịch** (`collectTimelineCalendarYears`).

**Map tổng quan (UUID seed, fetch queries):** [`cursor_map_truong.md`](./cursor_map_truong.md)

---

## 1. Khóa org — tra trước khi seed

| Cần | Bảng / cột | Ghi chú |
|---|---|---|
| `org_id` | `org_to_chuc.id` | Join mọi bảng `org_*` qua `id_to_chuc` |
| Slug URL | `org_to_chuc.slug` | `/truong-dai-hoc/{slug}` |
| Mã trường Bộ | `org_truong_dai_hoc.ma_truong` | Badge sidebar, listing |
| Loại org | `org_to_chuc.loai_to_chuc` | Phải là `truong_dai_hoc` |

```sql
-- Ví dụ: lấy id theo slug
SELECT o.id, o.slug, tdh.ma_truong
FROM org_to_chuc o
JOIN org_truong_dai_hoc tdh ON tdh.id_to_chuc = o.id
WHERE o.slug = 'dai-hoc-my-thuat-tp-hcm';
```

**UUID mẫu (MTS web):** `org_to_chuc.id = eb825d71-5ac1-4c9f-934f-870402923b91` · slug `dai-hoc-my-thuat-tp-hcm` · `ma_truong` MTS — chi tiết ngành / mon / khối: [`cursor_map_truong.md`](./cursor_map_truong.md) § Seed Data.

---

## 2. Layout trang (không phải tab)

```
tdh-v6-shell
├── TruongSchoolSidebar          (aside trái)
├── tdh-v6-center                (tabs + nội dung)
└── TruongAdmissionTimelineSidebar (aside phải — lịch tuyển sinh)
```

---

## 3. Sidebar trái — `TruongSchoolSidebar`

### 3.1 Cover & avatar

| UI | DB | Cột |
|---|---|---|
| Cover banner | `org_to_chuc` | `cover_id` → Cloudflare imagedelivery |
| Avatar trường | `org_to_chuc` | `avatar_id` (fallback `logo_id`) |

### 3.2 Tên & mô tả ngắn

| UI | DB | Cột |
|---|---|---|
| Tên hiển thị (`h1.ss-name`) | `org_to_chuc` | `ten` |
| Tên tiếng Anh | `org_truong_dai_hoc` | `ten_tieng_anh` |
| Mô tả ngắn dưới tên | `org_to_chuc` | `mo_ta` |
| Tên chính thức (form admin) | `org_truong_dai_hoc` | `ten_chinh_thuc` |

### 3.3 Badges

| UI | DB | Cột / enum |
|---|---|---|
| "Trường ĐH" | cố định UI | — |
| Loại trường (Công lập, …) | `org_truong_dai_hoc` | `loai_truong` → `loai_truong_enum` |
| Mã trường | `org_truong_dai_hoc` | `ma_truong` |
| Thành lập {năm} | `org_truong_dai_hoc` | `nam_thanh_lap` |

### 3.4 «Lịch sử trường» (popup HTML)

| UI | DB | Cột |
|---|---|---|
| Nội dung rich text modal | `org_to_chuc` | `gioi_thieu_truong` |

### 3.5 Liên hệ — `TruongSchoolContact`

**Chi nhánh chính** (ưu tiên `org_to_chuc.cau_hinh.chi_nhanh[0]`, fallback cột gốc):

| UI (icon + text) | Nguồn | Field |
|---|---|---|
| Địa chỉ | Chi nhánh #1 hoặc gốc | `chi_nhanh[].dia_chi` hoặc `org_to_chuc.dia_chi` |
| Tỉnh/thành | Chi nhánh #1 hoặc gốc | `chi_nhanh[].tinh_thanh` hoặc `org_to_chuc.tinh_thanh` |
| Điện thoại | Chi nhánh #1 | `chi_nhanh[].dien_thoai` hoặc `org_to_chuc.dien_thoai` |
| Email | Chi nhánh #1 | `chi_nhanh[].email` hoặc `org_to_chuc.email_lien_he` |
| Website | Chi nhánh hoặc ĐH | `chi_nhanh[].website` hoặc `org_truong_dai_hoc.website` |
| Facebook | Chi nhánh hoặc JSON | `chi_nhanh[].facebook` hoặc `cau_hinh.facebook` |

**JSON `org_to_chuc.cau_hinh` — chi nhánh:**

```json
{
  "chi_nhanh": [
    {
      "id": "cn-1749456000000-a1b2c3",
      "ten": "Cơ sở chính",
      "dia_chi": "97 Phan Đăng Lưu, P.3, Q.Bình Thạnh",
      "tinh_thanh": "ho_chi_minh",
      "dien_thoai": "02838443047",
      "email": "tuyensinh@hcmufa.edu.vn",
      "website": "https://hcmufa.edu.vn",
      "facebook": "https://facebook.com/DaiHocMyThuatTPHCM"
    },
    {
      "id": "cn-1749456001000-d4e5f6",
      "ten": "Cơ sở Quận 10",
      "dia_chi": "5 Hòa Hưng, P.12, Q.10",
      "tinh_thanh": "ho_chi_minh",
      "dien_thoai": null,
      "email": null,
      "website": null,
      "facebook": null
    }
  ],
  "facebook": "https://facebook.com/DaiHocMyThuatTPHCM"
}
```

- `tinh_thanh`: enum `tinh_thanh_vn_enum` (vd. `ho_chi_minh`, `ha_noi`).
- Chi nhánh chính = phần tử đầu mảng; khi PATCH admin, đồng bộ cột `dia_chi`, `tinh_thanh`, `dien_thoai`, `email_lien_he` từ chi nhánh #1.
- Modal «Xem tất cả cơ sở» khi `chi_nhanh.length > 3` (preview sidebar = 3 dòng đầu).

```sql
UPDATE org_to_chuc
SET cau_hinh = COALESCE(cau_hinh, '{}'::jsonb) || '{"chi_nhanh":[...]}'::jsonb
WHERE id = :org_id;
```

### 3.6 Số liệu tuyển sinh (sidebar)

| UI | DB | Cột |
|---|---|---|
| Ký túc xá | `org_truong_dai_hoc` | `co_ktx` (boolean) |
| Giá KTX/tháng | `org_truong_dai_hoc` | `ktx_gia_thang` |
| Học phí (khi edit) | `org_truong_dai_hoc` | `hoc_phi_nam_tu`, `hoc_phi_nam_den` |

*(Stats điểm chuẩn max / chỉ tiêu tổng tính runtime từ `org_tuyen_sinh_nam` — không có cột riêng trên sidebar public.)*

---

## 4. Sidebar phải — Lịch tuyển sinh (`TruongAdmissionTimelineSidebar`)

| UI | DB | Cột / logic |
|---|---|---|
| Dropdown **Năm lịch** | `org_tuyen_sinh_nam` + mốc timeline | Năm trích từ `ngay_*` và `ghi_chu_timeline` (mốc JSON) |
| Mỗi mốc: ngày (`timeline-date`) | Mốc custom hoặc legacy | Xem § 4.2 |
| Label mốc | | `label` / legacy step name |
| Mô tả | | `mo_ta` / legacy |
| Link mốc | `org_tuyen_sinh_nam` | `link_thong_tin` (gộp theo năm) |

**Lọc theo năm chọn:** tất cả dòng `org_tuyen_sinh_nam` của các `org_truong_nganh` (`trang_thai_chuong_trinh = dang_tuyen`) mà **năm lịch** khớp (`tuyenSinhRowMatchesCalendarYear`).

### 4.1 Cột ngày legacy (khi chưa có JSON mốc)

| Mốc UI (legacy) | `org_tuyen_sinh_nam` |
|---|---|
| Mở / đóng hồ sơ | `ngay_mo_ho_so`, `ngay_dong_ho_so` |
| Kỳ thi | `ngay_thi_tu`, `ngay_thi_den` |
| Công bố điểm | `ngay_cong_bo_diem` |
| Xác nhận nhập học | `ngay_xac_nhan_nhap_hoc_tu`, `ngay_xac_nhan_nhap_hoc_den` |

Legacy step ids: `mo-ho-so`, `dong-ho-so`, `thi`, `cong-bo`, `nhap-hoc` — convert sang mốc JSON lần đầu mở editor (`legacyTimelineToMoc`).

### 4.2 `ghi_chu_timeline` — mốc tùy chỉnh (ưu tiên nếu bắt đầu bằng `{`)

```json
{
  "v": 1,
  "moc": [
    {
      "id": "moc-1749456100000-x7y8z9",
      "label": "Mở đăng ký xét tuyển trực tuyến",
      "ngay_tu": "2026-04-01",
      "ngay_den": "2026-05-15",
      "mo_ta": "Nộp hồ sơ qua cổng Bộ GD&ĐT hoặc trực tiếp tại trường.",
      "link": "https://thisinh.thitotnghiepthpt.edu.vn"
    },
    {
      "id": "moc-1749456200000-a1b2c3",
      "label": "Kỳ thi tuyển sinh ĐH chính quy",
      "ngay_tu": "2026-06-24",
      "ngay_den": "2026-06-26",
      "mo_ta": "Danh sách phòng thi công bố trên website trường.",
      "link": null
    },
    {
      "id": "moc-1749456300000-d4e5f6",
      "label": "Công bố điểm và xác nhận nhập học",
      "ngay_tu": "2026-07-10",
      "ngay_den": null,
      "mo_ta": null,
      "link": "https://hcmufa.edu.vn/tuyen-sinh"
    }
  ]
}
```

- Hiển thị ngày: `dd/mm/yyyy` từ `ngay_tu` / `ngay_den`.
- Năm trong dropdown = calendar year của các ngày trên (vd. `2026-06-24` → **Năm 2026**).
- Tối đa 12 mốc (`TIMELINE_MOC_MAX_ITEMS`); label ≤ 80 ký tự, `mo_ta` ≤ 200, `link` ≤ 500.
- Nếu **không** phải JSON (plain text, không bắt đầu `{`): hiển thị như ghi chú legacy trên step cuối.
- Khi PATCH lịch admin: ghi **cùng** `ghi_chu_timeline` + `link_thong_tin` cho **mọi** `org_tuyen_sinh_nam` cùng `nam` (aggregate theo năm).

---

## 5. Tab 02 — Ngành đào tạo (`TruongTabNganh`)

**Điều kiện hiện trên UI:** `org_truong_nganh.trang_thai_chuong_trinh = 'dang_tuyen'`.

**Filter:** `TruongYearSelect` «Năm điểm chuẩn» → biến `year` (YearFilterProvider).

### 5.1 Quan hệ bảng

```
org_to_chuc (id)
  └── org_truong_nganh (id, id_to_chuc, id_nganh → article_bai_viet)
        └── org_tuyen_sinh_nam (id_truong_nganh, nam, diem_chuan, chi_tieu, …)
        └── org_cau_hinh_khoi (id_to_chuc, id_truong_nganh, nam_ap_dung, …)
              └── org_cau_hinh_mon (id_cau_hinh_khoi, id_mon_thi, he_so, …)
```

### 5.2 Header accordion mỗi ngành (`TruongNganhProgramItem`)

| UI | Bảng | Cột |
|---|---|---|
| Thumb ảnh | `article_bai_viet` | `cover_id` (qua `org_truong_nganh.id_nganh`) |
| Tên ngành | `article_bai_viet` | `tieu_de_viet` → fallback `tieu_de` |
| Điểm chuẩn (số lớn) | `org_tuyen_sinh_nam` | `diem_chuan` WHERE `nam = :year` |
| Slug trang ngành | `article_bai_viet` | `slug` → `/nganh-hoc/{slug}` |

### 5.3 Body accordion (ô 4 cột + bảng)

| UI | Bảng | Cột |
|---|---|---|
| Mã ngành | `article_bai_viet.meta` | `meta.ma_nganh` (jsonb) |
| Thời gian đào tạo | `org_truong_nganh` | `thoi_gian_thang` (số tháng) |
| Hệ đào tạo | `org_truong_nganh` | `he_dao_tao` enum |
| Tên chương trình | `org_truong_nganh` | `ten_chuong_trinh` |
| Điểm chuẩn {year} | `org_tuyen_sinh_nam` | `diem_chuan`, `nam` |
| Chỉ tiêu {year} | `org_tuyen_sinh_nam` | `chi_tieu`, `nam` |
| Bảng so sánh các năm | `org_tuyen_sinh_nam` | nhiều row cùng `id_truong_nganh` |

**`article_bai_viet` (ngành):** `loai_bai_viet = 'nganh_dao_tao'`, `trang_thai_noi_dung` publish.

| Cột article dùng trên trường | Field |
|---|---|
| Tiêu đề | `tieu_de_viet`, `tieu_de` |
| Tiêu đề EN | `tieu_de_eng` |
| Tóm tắt | `tom_tat` |
| Cover | `cover_id` |
| Mã ngành | `meta.ma_nganh` |

### 5.4 Môn thi đầu vào (`TruongNganhMonThiDauVao`)

| UI | Bảng | Cột |
|---|---|---|
| Khối thi (H00, …) | `org_cau_hinh_khoi` → `edu_to_hop_mon` | `ma`, `ten` |
| Danh sách môn | `org_cau_hinh_mon` → `edu_mon_thi` | `ten`, `he_so`, `thang_diem`, `thoi_gian_phut`, `so_thu_tu`, `ghi_chu` |
| Thumbnail môn | `edu_mon_thi` / bài viết | `thumbnail` / `id_bai_viet` → cover |
| Quy về thang 30 | `org_cau_hinh_khoi` | `quy_ve_thang` |
| Điểm sàn XT | `org_cau_hinh_khoi` | `diem_san_xet_tuyen` |
| Ưu tiên / điểm thưởng | `edu_module_tinh_diem` | `co_diem_uu_tien`, `co_diem_thuong` |

Lookup (`lib/truong/cau-hinh-tinh-diem.ts` → `loadCauHinhKhoiRow`):

1. `org_cau_hinh_khoi` WHERE `id_to_chuc` + `nam_ap_dung = :year` + `id_truong_nganh = :org_truong_nganh.id`
2. Không có → fallback `id_truong_nganh IS NULL` (config chung trường)
3. Vẫn không có → legacy `id_cau_hinh_khoi` trên `org_phuong_thuc_xet_tuyen`

Cache key client: `${org_truong_nganh.id}:${nam}` → `cauHinhMonThiByKey`.

### 5.5 Công cụ tính điểm (slot dưới list ngành)

| UI input | Nguồn |
|---|---|
| Danh sách ngành + điểm chuẩn | `org_tuyen_sinh_nam` + `article_bai_viet` title |
| Phương thức XT | `org_phuong_thuc_xet_tuyen` (gộp theo năm) |
| Cấu hình môn / hệ số | API `GET /api/truong/[id]/cau-hinh-tinh-diem?nam=&nganh=` |

---

## 6. Tab 03 — Tuyển sinh (`TruongTabTuyensinh`)

**Filter:** «Năm tuyển sinh» → `org_tuyen_sinh_nam.nam = :year`.

### 6.1 Section 01 — Công cụ tuyển sinh

Cùng launcher tính điểm như tab Ngành (§ 5.5).

### 6.2 Section 02 — Phương thức xét tuyển

Mỗi card = 1 row `org_phuong_thuc_xet_tuyen` (dedupe theo `id` trong năm).

| UI | Bảng | Cột |
|---|---|---|
| Tên phương thức | `org_phuong_thuc_xet_tuyen` | `ten_phuong_thuc` (enum → label VN) |
| Chỉ tiêu PT | | `chi_tieu_phuong_thuc` |
| Áp dụng ngành | | `ap_dung_tat_ca_nganh`, `id_nganh_ap_dung[]` → `org_truong_nganh.id` |
| Điều kiện (list) | | `tieu_chi` jsonb hoặc `dieu_kien_xet_tuyen` text |
| Khối / cấu hình thi | | `id_cau_hinh_khoi` → `org_cau_hinh_khoi` |
| Tổ hợp môn | | `id_to_hop_mon` → `edu_to_hop_mon` |

**FK bắt buộc:** `org_phuong_thuc_xet_tuyen.id_tuyen_sinh_nam` → `org_tuyen_sinh_nam.id` (ít nhất 1 row TS năm đó phải tồn tại trước khi thêm PT).

**`tieu_chi` ví dụ:**

```json
{ "dieu_kien": "Điểm THPT ≥ 18\nHạnh kiểm Tốt" }
```

hoặc object key-value; UI parse qua `parseTieuChiRows`.

### 6.3 `org_tuyen_sinh_nam` — row per ngành per năm

| Cột | UI / dùng |
|---|---|
| `id_truong_nganh` | FK ngành |
| `nam` | Filter năm tab TS / điểm chuẩn |
| `chi_tieu` | Chỉ tiêu ngành |
| `diem_chuan` | Điểm chuẩn |
| `tinh_trang` | `tinh_trang_tuyen_sinh_enum` (backend) |
| `ngay_mo_ho_so` … `ngay_xac_nhan_nhap_hoc_den` | Timeline legacy + năm lịch |
| `ghi_chu_timeline` | Mốc JSON (§ 4.2) |
| `link_thong_tin` | Link «Xem thêm» timeline |
| `ghi_chu` | Ghi chú nội bộ (không hiện tab TS public) |
| `so_thi_sinh` | Chưa map UI chính; `ti_le_choi` = app layer |

---

## 7. Tab 04 — Hình ảnh (`TruongTabHinhanh`)

| UI | Bảng | Cột |
|---|---|---|
| Ảnh gallery | `org_hinh_anh` | `cloudflare_id` → URL hiển thị |
| Caption overlay | | `caption` |
| Thứ tự | | `thu_tu` (sort ASC) |
| Loại (phân loại) | | `loai` (default `khac`) |
| Năm (optional) | | `nam` — chưa filter UI tab |

```sql
INSERT INTO org_hinh_anh (id_to_chuc, cloudflare_id, caption, loai, thu_tu)
VALUES (:org_id, :cf_image_id, 'Khuôn viên', 'khac', 0);
```

---

## 8. Tab 05 — Đồ án sinh viên (`TruongTabDoanSinhVien`)

| Trạng thái | Nguồn |
|---|---|
| **Hiện tại: MOCK** | `lib/truong/doan-project-mock.ts` — **không đọc DB** |
| Tương lai (dự kiến) | `project_du_an` (`id_to_chuc_owner`) + milestone Journey user |

Filter năm/ngành trên tab chỉ lọc mock; **không** dùng `YearFilterProvider` chung.

### 8.1 Mock tile → field (tham chiếu UI tương lai)

| UI masonry | Mock field (`TruongDoanProjectItem`) | DB dự kiến |
|---|---|---|
| Ảnh cover | `coverSrc` / `coverGradient` | `project_du_an.cover_id` |
| Tiêu đề đồ án | `projectTitle` | `project_du_an.ten` |
| Tên SV | `studentName` | `user_nguoi_dung` qua owner |
| Nhãn ngành | `nganhLabel` | `org_truong_nganh` / `article_bai_viet` |
| Milestone | `milestoneTitle` | `content_cot_moc` |
| Năm filter | `nam` | năm milestone / tốt nghiệp |
| Link Journey | `href` | `/journey/{slug}/…` |
| Layout tile | `tile` (`short` / `tall` / `square`) | UI only |
| Số ảnh badge | `photoCount` | đếm media milestone |

Dropdown ngành gộp label từ `school.programs` (DB thật) + label mock.

---

## 9. Thứ tự seed SQL gợi ý (một trường)

1. `org_to_chuc` + `org_truong_dai_hoc` (nếu chưa có)
2. `article_bai_viet` (`loai_bai_viet = nganh_dao_tao`) — mỗi ngành
3. `org_truong_nganh` (`id_nganh`, `trang_thai_chuong_trinh = dang_tuyen`, `slug`, `he_dao_tao`, `thoi_gian_thang`, `ten_chuong_trinh`)
4. `org_tuyen_sinh_nam` — **mỗi cặp** `(id_truong_nganh, nam)` cần hiển thị
5. `ghi_chu_timeline` + các `ngay_*` trên row TS (hoặc JSON mốc § 4.2)
6. `org_phuong_thuc_xet_tuyen` — gắn `id_tuyen_sinh_nam`
7. `edu_to_hop_mon` + `edu_module_tinh_diem` + `edu_mon_thi` (global, thường seed sẵn)
8. `org_cau_hinh_khoi` (`id_to_chuc`, `nam_ap_dung`, `id_truong_nganh`, `id_to_hop_mon`, `id_module`, `quy_ve_thang`, `diem_san_xet_tuyen`)
9. `org_cau_hinh_mon` (môn trong khối)
10. `org_hinh_anh`
11. `org_to_chuc.cau_hinh` (chi nhánh § 3.5) + cột liên hệ gốc

**Không seed trong brief này:** `org_bai_dang`, `org_bai_dang_tag`, filter nhãn timeline bài đăng.

---

## 10. Checklist sau bulk SQL

| Kiểm tra | Cách |
|---|---|
| Trang load | `/truong-dai-hoc/{slug}` |
| Sidebar có ngành | `org_truong_nganh` + `dang_tuyen` + article publish |
| Điểm chuẩn tab Ngành | `org_tuyen_sinh_nam` đúng `nam` filter |
| Môn thi đầu vào | `org_cau_hinh_khoi` + `org_cau_hinh_mon` đúng `id_truong_nganh` + `nam_ap_dung` |
| Phương thức tab TS | `org_phuong_thuc_xet_tuyen.id_tuyen_sinh_nam` hợp lệ |
| Lịch sidebar | `ghi_chu_timeline` JSON hoặc `ngay_*`; dropdown có năm lịch |
| Gallery | `org_hinh_anh.cloudflare_id` tồn tại trên CF |
| Liên hệ | `cau_hinh.chi_nhanh[0]` hoặc cột `dia_chi` / `dien_thoai` |

---

## 11. File code tham chiếu

| Khu vực | File |
|---|---|
| Payload server | `lib/truong/queries.ts` |
| Types field names | `lib/truong/types.ts` |
| Chi nhánh JSON | `lib/truong/chi-nhanh.ts` |
| Timeline mốc | `lib/truong/timeline-moc.ts` |
| Năm filter | `lib/truong/year-options.ts`, `YearFilterProvider.tsx` |
| Cấu hình tính điểm | `lib/truong/cau-hinh-tinh-diem.ts` |
| Mock đồ án | `lib/truong/doan-project-mock.ts` |
| Map trường chi tiết | `docs/cursor_map_truong.md` |
| Seed mẫu MTS | `supabase/sql/org-truong-seed-*.sql` |

---

*Cập nhật: 2026-06-09 — v6 shell, năm lịch từ timeline, bỏ tab Bài đăng.*
