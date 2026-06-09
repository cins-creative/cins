# CINS — Cursor Map: Trang Trường Đại học

**Version 2** — sau migration thêm `id_truong_nganh` vào `org_cau_hinh_khoi`  
Synced với DB thực tế. Dùng làm context cho Cursor khi implement feature trường.

**Bulk SQL (field → UI, không tab Bài đăng):** [`cursor_brief_truong_trang_data_map.md`](./cursor_brief_truong_trang_data_map.md)

---

## Route & Component Tree (repo này)

```
/truong-dai-hoc/[slug]          ← app/truong-dai-hoc/[slug]/page.tsx (server)
  └── TruongDetailView          ← client; payload từ getTruongPagePayload()
        ├── TruongOrgCover
        ├── identity-bar        — avatar, tên, badge, liên hệ, timeline
        ├── TruongStatBar
        ├── YearFilterProvider
        ├── tabs (default: baidang)
        │     ├── TruongTabBaidang
        │     ├── TruongTabNganh      — accordion + TruongAdmissionCalc (sidebar)
        │     ├── TruongTabTuyensinh
        │     ├── TruongTabHinhanh
        │     ├── TruongTabJourney
        │     └── TruongTabHoidap
        └── (tags / admin toolbar khi canEdit)
```

Listing: `/truong-dai-hoc` → `app/truong-dai-hoc/page.tsx`

---

## Seed Data — UUID thật

### org_to_chuc

| ma_truong | id | slug |
|---|---|---|
| MTS (web) | `eb825d71-5ac1-4c9f-934f-870402923b91` | `dai-hoc-my-thuat-tp-hcm` |
| MTS (seed cấu hình thi cũ) | `a1000000-0000-0000-0000-000000000001` | `dai-hoc-my-thuat-tphcm` |
| MHI | `41d85429-a32b-4538-ac3f-acb29bdf8f2c` | `dai-hoc-my-thuat-cong-nghiep` |
| MMA | `4fc1a636-80a8-4a9c-831f-dad8b357c184` | `dai-hoc-my-thuat-viet-nam` |

### org_truong_nganh MTS (UUID trên UI — `trang_thai_chuong_trinh = dang_tuyen`)

Dùng các id này cho API `?nganh=` và seed `org_cau_hinh_khoi.id_truong_nganh`:

| id | Mã ngành | Ngành |
|---|---|---|
| `b6d1939b-fe77-4ece-b5a0-f9cc78c4533e` | 7210103 | Hội họa |
| `be66ebb8-54b5-4252-bddc-e579745e4824` | 7210104 | Đồ họa |
| `d35d558f-2880-4e6f-9c6b-4b59eedddde5` | 7210105 | Điêu khắc |
| `dc1f5d04-d98a-4dcd-abba-5ae5e8be0e9b` | 7210403 | Thiết kế đồ họa |

Nguồn: `supabase/sql/org-truong-seed-diem-chuan-dai-hoc-my-thuat-tphcm.sql`

**Legacy (không dùng trên UI):** `mts-hoi-hoa`, `mts-do-hoa`, … — UUID cũ trong seed cấu hình thi cũ. Nếu UI trống mà `mon_anon` trên UUID cũ = 3 → chạy `org-truong-sync-cau-hinh-mts-active-nganh.sql`.

### org_truong_nganh (các trường khác)

| slug | trường | ngành |
|---|---|---|
| `mhi-thiet-ke-do-hoa` | MHI | Thiết kế đồ họa |
| `mhi-hoi-hoa` | MHI | Hội họa |
| `mhi-thiet-ke-my-thuat-so` | MHI | Thiết kế Mỹ thuật số |
| `mma-thiet-ke-do-hoa` | MMA | Thiết kế đồ họa |
| `mma-hoi-hoa` | MMA | Hội họa |
| `mma-do-hoa` | MMA | Đồ họa |

### edu_mon_thi UUID

| ma | id |
|---|---|
| ngu_van | `c3b6a5f3-884e-48fb-a432-72219eeec543` |
| hinh_hoa_toan_than | `e471a67b-4506-48ac-90a8-6ad09d908a36` |
| hinh_hoa_chan_dung | `030c23bf-b4d2-4c35-95a6-d867e85ded8f` |
| hinh_hoa_dau_tuong | `a03b0214-1778-4eb7-ae66-d7e8dc7538f6` |
| tuong_tron | `0bc78418-1aeb-43ba-b9b5-d44dd0788821` |
| bo_cuc_tranh_mau | `5cc6b4a9-c020-4ba4-a157-6f53075c79b3` |
| bo_cuc_cham_noi | `34369e00-b6f0-4e71-ac95-cfc170b7495e` |
| trang_tri_mau | `f024cd69-2c7e-4ea7-9fe1-6a20b28e9ea8` |
| hinh_hoa (cũ) | `84062223-5760-45a8-8a0c-fa175eff66c1` |
| bo_cuc_mau (cũ) | `76a1beff-ce0e-496b-acaf-795405003da9` |
| toan | `cb2fe25a-14ae-45cb-8937-9567921801d3` |
| vat_ly | `e51b684e-26c4-4324-9eff-24a5b30f8eb8` |

### edu_module_tinh_diem UUID

| ten | id |
|---|---|
| H00 Mỹ thuật chuẩn | `4ecb6f97-630d-4d63-826b-977dfb1b5046` |
| H02 Mỹ thuật Toán | `c0a2db09-bf4d-439e-97db-ba38e21f5252` |
| V00 Kiến trúc chuẩn | `e9532533-735d-462b-937c-a2fe5fd824c4` |
| A00 Kỹ thuật chuẩn | `42001df0-4f57-4eae-b90a-1f538220943c` |

### org_cau_hinh_khoi UUID (seed hiện tại — theo năm, chưa per-ngành)

| id | trường | module | năm |
|---|---|---|---|
| `c3000000-0000-0000-0000-000000000001` | MTS | H00 | 2024 |
| `c3000000-0000-0000-0000-000000000003` | MTS | H00 | 2025 |
| `c3000000-0000-0000-0000-000000000002` | MHI | H00 | 2024 |

SQL seed: `supabase/sql/org-truong-seed-cau-hinh-mon-mts-h00-2024.sql`, `…-2025.sql`

### Môn thi per ngành MTS 2024 (mục tiêu DB sau migration)

| Ngành | Môn 1 (hs2) | Môn 2 (hs1) | Văn hóa (hs1) |
|---|---|---|---|
| Hội họa | Hình họa Toàn thân (480ph) | Bố cục tranh màu (300ph) | Ngữ văn |
| Đồ họa | Hình họa Toàn thân (480ph) | Bố cục tranh màu (300ph) | Ngữ văn |
| Điêu khắc | Tượng tròn (2 buổi sáng + 1 chiều) | Bố cục chạm nổi (300ph) | Ngữ văn |
| Thiết kế đồ họa | Hình họa Chân dung (300ph) | Trang trí màu (300ph) | Ngữ văn |

Công thức: `diem = (M1×2 + M2×1 + NV×1) / 40 × 30`

### Điểm chuẩn 2024

| slug / ngành | điểm chuẩn | chỉ tiêu |
|---|---|---|
| mts-thiet-ke-do-hoa | 21.50 | 60 |
| mts-hoi-hoa | 23.50 | 50 |
| mts-do-hoa | 25.50 | 30 |
| mts-dieu-khac | 16.00 | 20 |
| mhi-thiet-ke-do-hoa | 22.18 | 80 |
| mhi-hoi-hoa | 21.50 | 60 |
| mma-thiet-ke-do-hoa | 21.00 | 45 |
| mma-hoi-hoa | 20.50 | 40 |
| mma-do-hoa | 20.00 | 40 |

---

## Data Fetching

### TruongPage — server (`getTruongPagePayload` → `lib/truong/queries.ts`)

```typescript
// org_to_chuc + org_truong_dai_hoc + programs + tuyen sinh + baidang + hinhanh + journey
// Một lần fetch trên server; tab client dùng TruongInlineEditContext
```

### TruongStatBar

```typescript
const [{ data: tsNam }, { count: journeyCount }] = await Promise.all([
  supabase
    .from('org_tuyen_sinh_nam')
    .select('diem_chuan, chi_tieu, org_truong_nganh!inner(id_to_chuc)')
    .eq('org_truong_nganh.id_to_chuc', truong.id)
    .eq('nam', currentYear),
  supabase
    .from('user_thanh_vien_to_chuc')
    .select('*', { count: 'exact', head: true })
    .eq('id_to_chuc', truong.id)
])

const diemChuanMax = Math.max(...tsNam.map(r => r.diem_chuan ?? 0))
const chiTieuTong  = tsNam.reduce((s, r) => s + (r.chi_tieu ?? 0), 0)
```

### TabNganh — re-fetch khi `selectedYear` đổi (YearFilterProvider)

```typescript
const { data } = await supabase
  .from('org_truong_nganh')
  .select(`
    id, slug, ten_chuong_trinh, thoi_gian_thang,
    article_bai_viet ( tieu_de, tieu_de_viet, meta ),
    org_tuyen_sinh_nam (
      nam, chi_tieu, diem_chuan, tinh_trang
    )
  `)
  .eq('id_to_chuc', truong.id)
  .eq('trang_thai_chuong_trinh', 'dang_tuyen')
  .eq('org_tuyen_sinh_nam.nam', selectedYear)
```

### TabTuyensinh — re-fetch khi `selectedYear` đổi

```typescript
const { data } = await supabase
  .from('org_tuyen_sinh_nam')
  .select(`
    id, nam, chi_tieu, diem_chuan, so_thi_sinh, tinh_trang,
    ngay_mo_ho_so, ngay_dong_ho_so, ngay_thi_tu, ngay_thi_den,
    ngay_cong_bo_diem, ngay_xac_nhan_nhap_hoc_tu, ngay_xac_nhan_nhap_hoc_den,
    ghi_chu_timeline,
    org_truong_nganh!inner (
      id, slug, ten_chuong_trinh, id_to_chuc,
      article_bai_viet ( tieu_de_viet )
    ),
    org_phuong_thuc_xet_tuyen (
      id, ten_phuong_thuc, chi_tieu_phuong_thuc, ap_dung_tat_ca_nganh,
      id_cau_hinh_khoi
    )
  `)
  .eq('org_truong_nganh.id_to_chuc', truong.id)
  .eq('nam', selectedYear)
```

### Calculator API — `GET /api/truong/[id]/cau-hinh-tinh-diem`

**Query params (site):** `?nam=2024&nganh=<id_truong_nganh>` (optional `&khoi=<uuid>`)

**Mục tiêu DB (v2)** — lookup theo ngành trước, fallback config chung:

```typescript
const { data: config } = await supabase
  .from('org_cau_hinh_khoi')
  .select(`
    id, quy_ve_thang, diem_san_xet_tuyen,
    edu_module_tinh_diem ( co_diem_uu_tien, co_diem_thuong ),
    org_cau_hinh_mon (
      he_so, thang_diem, thoi_gian_phut, so_thu_tu, ghi_chu,
      edu_mon_thi ( ten, loai )
    )
  `)
  .eq('id_to_chuc', truong.id)
  .eq('nam_ap_dung', nam)
  .eq('id_truong_nganh', id_truong_nganh)  // specific per ngành
  .order('so_thu_tu', { foreignTable: 'org_cau_hinh_mon' })
  .maybeSingle()

// Fallback nếu không có config per ngành:
// .is('id_truong_nganh', null)

// Công thức:
// tong_max = Σ(thang_diem_i × he_so_i)
// diem     = Σ(nhap_i × he_so_i) / tong_max × quy_ve_thang
// + diem_uu_tien nếu co_diem_uu_tien (≤3đ với thang 30)
```

**Triển khai (`lib/truong/queries.ts` → `loadCauHinhKhoiRow`):**

1. `nganh` → `org_cau_hinh_khoi` where `id_truong_nganh = nganh` + `nam_ap_dung`.
2. Không có → fallback `id_truong_nganh IS NULL` (config chung trường).
3. Vẫn không có → legacy: `id_cau_hinh_khoi` trên `org_phuong_thuc_xet_tuyen`, load theo `khoi` id.
4. `khoi` query param → load trực tiếp theo UUID khối (modal cấu hình).

### TabBaidang — infinite scroll

```typescript
const { data } = await supabase
  .from('org_bai_dang')
  .select(`
    id, loai_bai_dang, tieu_de, tom_tat, cover_id, tao_luc,
    org_bai_dang_tag ( article_bai_viet ( tieu_de_viet, slug ) )
  `)
  .eq('id_to_chuc', truong.id)
  .eq('trang_thai', 'da_dang')
  .order('tao_luc', { ascending: false })
  .range(offset, offset + 9)
```

### TabHinhanh

```typescript
const { data } = await supabase
  .from('org_hinh_anh')
  .select('id, cloudflare_id, caption, loai, thu_tu')
  .eq('id_to_chuc', truong.id)
  .order('thu_tu')
```

---

## Schema Changes sau migration v4

```sql
-- org_cau_hinh_khoi có thêm:
id_truong_nganh UUID REFERENCES org_truong_nganh(id)  -- nullable
-- NULL  = config áp dụng toàn trường (fallback)
-- có giá trị = config riêng cho ngành đó

-- Unique index mới:
-- (id_to_chuc, id_to_hop_mon, nam_ap_dung, COALESCE(id_truong_nganh, '00000000...'))

-- org_tuyen_sinh_nam có thêm:
so_thi_sinh INT  -- nullable, điền sau kỳ thi
-- ti_le_choi tính app layer: so_thi_sinh / chi_tieu
```

---

## Timeline Status (app layer)

```typescript
function getTimelineStatus(row: OrgTuyenSinhNam) {
  const now = new Date()
  if (row.ngay_thi_den && new Date(row.ngay_thi_den) < now)  return 'done'
  if (row.ngay_thi_tu  && new Date(row.ngay_thi_tu)  <= now) return 'active'
  return 'upcoming'
}
```

---

## Cloudflare Image URL

```typescript
const CF = process.env.CLOUDFLARE_IMAGES_HASH
// hoặc lib/cloudflare/fetch-image-delivery-url.ts

`https://imagedelivery.net/${CF}/${avatar_id}/avatar`   // 80×80
`https://imagedelivery.net/${CF}/${cover_id}/cover`     // full width
`https://imagedelivery.net/${CF}/${cloudflare_id}/medium` // gallery
```

---

## Field Name Gotchas

| Nhầm | Đúng |
|---|---|
| `loai` (chat_tin_nhan) | `loai_tin` |
| `id_entity` (chat_phong) | `id_context` |
| `nguoi_dung` (social_binh_luan) | `nguoi_binh_luan` |
| `alias` | `ten_alias` |
| `ten` (edu_to_hop_mon) | `ten_to_hop` |
| `logo_id` | DEPRECATED → dùng `avatar_id` |
| `tieu_de_viet` | nullable → fallback `tieu_de` |
| `cac_mon` (org_cau_hinh_khoi) | DEPRECATED → đọc từ `org_cau_hinh_mon` |

---

## Mockup Reference

File: `truong-v5.html`

- Tab default: **Bài đăng**
- Year filter: dropdown inline trong `sec-hdr`, sync Ngành ↔ Tuyển sinh
- Calculator: sidebar tab Ngành / Tuyển sinh; mục tiêu config từ `org_cau_hinh_khoi.id_truong_nganh`
