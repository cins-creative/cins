# CINS — Cursor Map: Admin Panel
# Mockup: admin-v1.html
# Scope: CINS internal only — không phải trang của trường

---

## Route & Layout

```
/admin                     → redirect → /admin/dashboard
/admin/[section]           → AdminLayout + section content

AdminLayout
  ├── Sidebar (220px fixed)
  │     ├── Logo + "Admin" badge
  │     ├── Nav sections (xem bên dưới)
  │     └── Footer: avatar + tên + logout
  ├── Topbar (52px)
  │     ├── Breadcrumb động theo section
  │     ├── Search bar (contextual)
  │     └── Action buttons (contextual)
  └── Content area (scroll)
```

---

## Sidebar Nav — section map

```
Tổng quan
  /admin/dashboard

Nội dung
  /admin/bai-viet/nghe        → article_bai_viet loại nghe
  /admin/bai-viet/nganh       → loại nganh_dao_tao
  /admin/bai-viet/mon-hoc     → loại mon_hoc
  /admin/bai-viet/keyword     → loại keyword
  /admin/bai-viet/software    → loại phan_mem
  /admin/de-xuat              → article_de_xuat trang_thai = cho_review

Trường đại học
  /admin/truong               → tabs: Trường / Ngành / Tuyển sinh / Cấu hình / Tổ hợp
  (không tách route riêng cho từng tab — dùng ?tab= query param)

Tổ chức
  /admin/to-chuc              → org_to_chuc tất cả loại
  /admin/verify               → verify_yeu_cau + verify_xac_nhan pending

Người dùng
  /admin/nguoi-dung

Hệ thống
  /admin/linh-vuc
  /admin/analytics
  /admin/vector-queue         → vector_hang_doi
  /admin/cai-dat
```

---

## Guard

```typescript
// middleware.ts hoặc layout server component
// Chưa implement auth — placeholder check
// Khi implement: kiểm tra user_thanh_vien_to_chuc WHERE vai_tro = 'owner'
// CINS owner là user duy nhất có quyền vào /admin

export async function adminGuard(userId: string) {
  const { data } = await supabase
    .from('user_thanh_vien_to_chuc')
    .select('vai_tro')
    .eq('id_nguoi_dung', userId)
    .eq('vai_tro', 'owner')
    .limit(1)
    .single()
  return !!data
}
```

---

## Section: Trường đại học (`/admin/truong?tab=truong`)

### 5 tabs trong section

| tab param | Nội dung | Bảng chính |
|---|---|---|
| `truong` | Danh sách trường + CRUD | org_to_chuc + org_truong_dai_hoc |
| `nganh` | Cặp trường–ngành | org_truong_nganh |
| `tuyen-sinh` | Điểm chuẩn + chỉ tiêu theo năm | org_tuyen_sinh_nam |
| `cau-hinh` | Khối thi + môn + hệ số | org_cau_hinh_khoi + org_cau_hinh_mon |
| `to-hop` | Tổ hợp môn + module template | edu_to_hop_mon + edu_module_tinh_diem + edu_mon_thi |

### Môn thi đại học (`/admin/mon-thi`)

- Sidebar: **Tổ chức → Môn thi đại học**
- Bảng `edu_mon_thi` (service role): `SELECT id, ma, ten, loai, trang_thai, thumbnail_id, id_bai_viet` — **không** `cap_nhat_luc` / `tao_luc` (xem `docs/CINS_SCHEMA.md` (`edu_mon_thi`))
- Slide-over sửa các cột trên; code: `lib/admin/mon-thi-server.ts`, `components/admin/AdminMonThiScreen.tsx`

### Tab Trường — queries

```typescript
// Danh sách trường + đếm ngành
const { data } = await supabase
  .from('org_to_chuc')
  .select(`
    id, slug, ten, trang_thai_tin_cay, tao_luc,
    org_truong_dai_hoc (
      ma_truong, ten_chinh_thuc, loai_truong,
      nam_thanh_lap, website, da_verify,
      hoc_phi_nam_tu, hoc_phi_nam_den, co_ktx
    ),
    org_truong_nganh ( count )
  `)
  .eq('loai_to_chuc', 'truong_dai_hoc')
  .order('tao_luc')
```

### Tab Tuyển sinh — queries

```typescript
// Tất cả năm tuyển sinh, join tên ngành + trường
const { data } = await supabase
  .from('org_tuyen_sinh_nam')
  .select(`
    id, nam, chi_tieu, diem_chuan, tinh_trang,
    ngay_mo_ho_so, ngay_dong_ho_so, ngay_thi_tu, ngay_thi_den,
    ngay_cong_bo_diem,
    org_truong_nganh (
      slug, ten_chuong_trinh,
      article_bai_viet ( tieu_de_viet, tieu_de ),
      org_to_chuc ( ten, org_truong_dai_hoc ( ma_truong ) )
    )
  `)
  .order('nam', { ascending: false })
  .order('diem_chuan', { ascending: false })

// Filter theo năm: .eq('nam', selectedYear)
// Filter theo trường: join qua org_truong_nganh.id_to_chuc
```

### Tab Cấu hình tính điểm — queries

```typescript
// Config khối thi per trường per năm
const { data: configs } = await supabase
  .from('org_cau_hinh_khoi')
  .select(`
    id, nam_ap_dung, quy_ve_thang, diem_san_xet_tuyen, trang_thai,
    org_to_chuc ( ten, org_truong_dai_hoc ( ma_truong ) ),
    edu_to_hop_mon ( ma_to_hop, ten_to_hop ),
    edu_module_tinh_diem ( ten, co_diem_uu_tien, co_diem_thuong ),
    org_cau_hinh_mon (
      he_so, thang_diem, thoi_gian_phut, so_thu_tu, ghi_chu,
      edu_mon_thi ( ten, loai )
    )
  `)
  .order('nam_ap_dung', { ascending: false })
  .order('so_thu_tu', { foreignTable: 'org_cau_hinh_mon' })
```

### Tab Tổ hợp & module — queries

```typescript
const [{ data: toHop }, { data: modules }, { data: monThi }] = await Promise.all([
  supabase
    .from('edu_to_hop_mon')
    .select(`id, ma_to_hop, ten_to_hop, edu_to_hop_mon_chi_tiet ( so_thu_tu, ten_slot, loai, co_dinh )`)
    .order('ma_to_hop'),
  supabase
    .from('edu_module_tinh_diem')
    .select(`id, ten, quy_ve_thang, co_diem_uu_tien, co_diem_thuong, edu_module_mon ( ten_mon_mac_dinh, he_so, thang_diem, so_thu_tu )`)
    .eq('trang_thai', 'active'),
  supabase
    .from('edu_mon_thi')
    .select(`id, ma, ten, loai, trang_thai, id_bai_viet`)
    .eq('trang_thai', 'active')
    .order('loai').order('ten')
])
```

---

## Section: Bài viết (`/admin/bai-viet/[loai]`)

### loai → loai_bai_viet_enum mapping

| URL segment | loai_bai_viet_enum | Tên hiển thị |
|---|---|---|
| nghe | nghe | Bài viết nghề |
| nganh | nganh_dao_tao | Ngành học |
| mon-hoc | mon_hoc | Môn học |
| keyword | keyword | Keyword |
| software | phan_mem | Software |

### Query chung cho tất cả loại bài viết

```typescript
const { data } = await supabase
  .from('article_bai_viet')
  .select(`
    id, slug, tieu_de, tieu_de_viet, tieu_de_eng, tom_tat, noi_dung,
    cover_id, thumbnail, main_video, meta_title, meta_description,
    trang_thai_noi_dung, luot_xem, tao_luc, cap_nhat_luc, id_linh_vuc,
    meta,
    article_gan_nhom ( article_nhom ( ten, loai_nhom ) )
  `)
  // Không select noi_dung_markdown — cột không tồn tại trên DB
  .eq('loai_bai_viet', loaiBaiViet)
  .order('cap_nhat_luc', { ascending: false })

// Search: .ilike('tieu_de', `%${q}%`)
// Filter trạng thái: .eq('trang_thai_noi_dung', filter)
```

### Field notes theo loại

| loai | meta fields | ghi chú |
|---|---|---|
| nghe | null | cần id_linh_vuc NOT NULL |
| nganh_dao_tao | ma_nganh, khoi_thi[], thoi_gian_nam | display: `ma_nganh` dạng mono |
| phan_mem | nha_phat_hanh, version, platform[], website | |
| keyword, mon_hoc | null | |

---

## Section: Đề xuất tag (`/admin/de-xuat`)

```typescript
const { data } = await supabase
  .from('article_de_xuat')
  .select(`
    id, ten_de_xuat, context_de_xuat, trang_thai, tao_luc,
    ket_qua_phan_loai_ai,
    user_nguoi_dung!nguoi_de_xuat ( slug, ten_hien_thi ),
    article_bai_viet!id_bai_viet_da_tao ( slug, tieu_de )
  `)
  .eq('trang_thai', 'cho_review')
  .order('tao_luc', { ascending: false })

// Duyệt: UPDATE trang_thai = 'da_duyet' + INSERT article_bai_viet
// Từ chối: UPDATE trang_thai = 'tu_choi'
```

---

## Seed data trong DB

| Bảng | Số lượng |
|---|---|
| org_to_chuc (truong_dai_hoc) | 3 (MTS, MHI, MMA) |
| org_truong_nganh | 10 cặp |
| org_tuyen_sinh_nam | 18 records (9 ngành × 2 năm) |
| org_cau_hinh_khoi | 2 (MTS H00, MHI H00) |
| org_cau_hinh_mon | 6 records |
| edu_to_hop_mon | 5 (H00, H02, V00, V01, N00) |
| edu_to_hop_mon_chi_tiet | 15 slots |
| edu_module_tinh_diem | 4 (H00, H02, V00, A00) |
| edu_module_mon | 12 records |
| edu_mon_thi | 17 môn |

---

## Component patterns

### Table với inline expand (cấu hình tính điểm)

```tsx
// Row chính
<tr>
  <td>...</td>
  <td>
    <button onClick={() => setExpanded(id => id === rowId ? null : rowId)}>
      <ChevronDown />
    </button>
  </td>
</tr>

// Detail row — expand/collapse
{expanded === rowId && (
  <tr>
    <td colSpan={7} style={{ background: 'var(--bg)' }}>
      <MiniTable data={cau_hinh_mon} />
    </td>
  </tr>
)}
```

### Badge mapping

```typescript
const TINH_TRANG_BADGE = {
  co_ket_qua: { label: 'Có kết quả', variant: 'verified' },
  da_dong:    { label: 'Đã đóng',    variant: 'review' },
  dang_mo:    { label: 'Đang mở',    variant: 'published' },
  sap_mo:     { label: 'Sắp mở',     variant: 'draft' },
}

const TRANG_THAI_BADGE = {
  published:   { label: 'Published',  variant: 'verified' },
  cho_review:  { label: 'Chờ duyệt',  variant: 'review' },
  dang_viet:   { label: 'Nháp',       variant: 'draft' },
  archived:    { label: 'Archived',   variant: 'draft' },
}

const TIN_CAY_BADGE = {
  verified_official: { label: 'Verified', variant: 'verified' },
  dang_review:       { label: 'Review',   variant: 'review' },
  binh_thuong:       { label: 'Bình thường', variant: 'draft' },
}
```

### Row actions — chỉ hiện khi hover

```tsx
<tr className="group">
  <td>...</td>
  <td>
    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
      <IconButton icon="edit" onClick={() => openEdit(row)} />
      <IconButton icon="external-link" href={`/truong/${row.slug}`} />
    </div>
  </td>
</tr>
```

---

## Sections chưa implement (placeholder only)

Các section sau chỉ render empty state với icon — chưa cần data:

- `/admin/to-chuc` — tất cả tổ chức (studio, doanh nghiệp...)
- `/admin/verify` — xác nhận milestone (verify_yeu_cau + verify_xac_nhan)
- `/admin/nguoi-dung`
- `/admin/linh-vuc`
- `/admin/analytics`
- `/admin/vector-queue`
- `/admin/cai-dat`

---

## Design tokens (từ admin-v1.html)

```css
--sidebar-w: 220px
--topbar-h: 52px
--bg: #f5f4f0          /* page background */
--surface: #ffffff      /* card / sidebar */
--border: rgba(0,0,0,0.09)
--text-1: #1a1917      /* primary */
--text-2: #5a5855      /* secondary */
--text-3: #9a9894      /* muted / labels */
--accent-bg: #f0ede8   /* hover state */
```
